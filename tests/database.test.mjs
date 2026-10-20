import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pbkdf2Sync } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { DatabaseSync } from 'node:sqlite';
import * as production from '../src/database.js';
import { equipmentPhotoFromAsset, isEquipmentPhoto } from '../src/equipmentPhoto.js';

// Execute the actual production SQL in SQLite. This adapter only translates
// expo-sqlite's async interface to Node's bundled SQLite test connection.
function connection() {
  const sql = new DatabaseSync(':memory:');
  return {
    sql,
    async execAsync(query) { sql.exec(query); },
    async runAsync(query, ...args) { const r = sql.prepare(query).run(...args); return { lastInsertRowId: Number(r.lastInsertRowid), changes: r.changes }; },
    async getFirstAsync(query, ...args) { return sql.prepare(query).get(...args); },
    async getAllAsync(query, ...args) { return sql.prepare(query).all(...args); },
    async withTransactionAsync(work) {
      sql.exec('BEGIN');
      try { await work(); sql.exec('COMMIT'); } catch (error) { sql.exec('ROLLBACK'); throw error; }
    },
  };
}
// Production starts empty; inventory tests create their own regular accounts and catalog.
const fixtures = new WeakSet();
const api = {
 ...production,
 async initializeDatabase(db) {
  await production.initializeDatabase(db);
  if (fixtures.has(db)) return;
  fixtures.add(db);
  await db.execAsync(`INSERT INTO users (user_id,name,contact,role) VALUES
   (1,'Fixture Customer','111','customer'),(2,'Fixture Supplier','222','supplier'),(3,'Fixture Admin','333','admin');`);
  for (const [name,quantity,rate] of [['Sound System',5,2500],['Party Lights',12,850],['Tables',30,300],['Chairs',150,35],['Tent',8,1200],['Projector',4,1800]])
   await db.runAsync("INSERT INTO equipment (supplier_id,name,category,description,daily_rate,total_quantity) VALUES (2,?,'Audio','Fixture equipment',?,?)",name,rate,quantity);
 },
 saveEquipment:(db,f,id,actor=2)=>production.saveEquipment(db,f,id,actor),
 createReservation:(db,b,id=1)=>production.createReservation(db,b,id),
 getCustomerRentals:(db,id=1)=>production.getCustomerRentals(db,id),
 updateReservationContact:(db,id,contact,note,start,end,customerId=1)=>production.updateReservationContact(db,id,contact,note,start,end,customerId),
 getCart:(db,id=1)=>production.getCart(db,id),
 persistCart:(db,items,id=1)=>production.persistCart(db,items,id),
};
// Inspect persisted records directly when testing storage and migrations.
function readUserRecords(db) {
 return db.getAllAsync(`SELECT u.*, c.email, c.created_at AS registered_at FROM users u
 LEFT JOIN customer_credentials c ON c.user_id = u.user_id ORDER BY u.user_id`);
}
const form = { name: 'Test Speaker', category: 'Audio', description: 'Portable speaker', dailyRate: '100.50', totalQuantity: '5', imageRef: '🎤' };
const booking = item => ({ startDate: '2099-01-01', endDate: '2099-01-02', contact: '09123456789', note: 'Test event', paymentMethod: 'Cash on pickup', items: [{ ...item, quantity: 2 }] });

const customerForm = { name: 'Test Customer', contact: '09123456789', email: 'customer@example.com', password: 'TestPassword123' };

test('customer registration stores a hash and exposes only profile details to Admin Users', async () => {
  const db = connection(); await api.initializeDatabase(db);
  for (const invalid of [{ ...customerForm, email: 'invalid' }, { ...customerForm, name: '' }, { ...customerForm, contact: '' }, { ...customerForm, password: 'short' }])
    await assert.rejects(api.registerCustomer(db, invalid));
  assert.equal((await readUserRecords(db)).length, 3);
  const user = await api.registerCustomer(db, { ...customerForm, email: ' Customer@Example.COM ' });
  assert.equal(user.role, 'customer'); assert.equal(user.email, 'customer@example.com');
  await api.initializeDatabase(db);
  const adminUser = (await readUserRecords(db)).find(row => row.user_id === user.user_id);
  assert.equal(adminUser.name, customerForm.name); assert.equal(adminUser.contact, customerForm.contact);
  assert.equal(adminUser.email, 'customer@example.com'); assert.ok(adminUser.registered_at);
  assert.equal('password_hash' in adminUser, false);
  const stored = await db.getFirstAsync('SELECT * FROM customer_credentials WHERE user_id = ?', user.user_id);
  assert.ok(stored.password_hash.startsWith('bcrypt-hmac-sha256$$2b$10$'));
  assert.equal(stored.password_hash.includes(customerForm.password), false);
  await assert.rejects(api.registerCustomer(db, customerForm), /already registered/);
  const signedIn = await api.signInCustomer(db, 'CUSTOMER@EXAMPLE.COM', customerForm.password);
  assert.equal(signedIn.user_id, user.user_id); assert.equal('password_hash' in signedIn, false);
  await assert.rejects(api.signInCustomer(db, customerForm.email, 'incorrect'), /Email or password is incorrect/);
  await assert.rejects(api.signInCustomer(db, 'nobody@example.com', customerForm.password), /Email or password is incorrect/);
});

test('registration rejects contact letters and password symbols before saving an account', async () => {
 const db=connection(); await production.initializeDatabase(db);
 for (const contact of ['0912abc3456','0912-3456789','+639123456789','0912 3456789']) {
  await assert.rejects(production.registerCustomer(db,{...customerForm,contact}),/digits only/);
 }
 for (const password of ['Password123!','Password 123','Password123_','Password123\u00e9']) {
  await assert.rejects(production.registerCustomer(db,{...customerForm,password}),/letters and numbers only/);
 }
 assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM users')).count,0);
 assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM customer_credentials')).count,0);
 const user=await production.registerCustomer(db,customerForm);
 assert.equal(user.contact,'09123456789');
 assert.equal((await production.signInCustomer(db,user.email,customerForm.password)).user_id,user.user_id);
});

test('legacy passwords migrate only after a successful sign in, preserving profile and access', async () => {
  const db = connection(); await api.initializeDatabase(db);
  const user = await api.registerCustomer(db, customerForm);
  const legacyPassword = `${customerForm.password}!@#`;
  const salt = '0123456789abcdef0123456789abcdef';
  const hash = pbkdf2Sync(legacyPassword, Buffer.from(salt, 'hex'), 600000, 32, 'sha256').toString('hex');
  const legacy = `pbkdf2-sha256$600000$${salt}$${hash}`;
  await db.runAsync('UPDATE customer_credentials SET password_hash = ? WHERE user_id = ?', legacy, user.user_id);
  await assert.rejects(api.signInCustomer(db, customerForm.email, 'incorrect'));
  assert.equal((await db.getFirstAsync('SELECT password_hash FROM customer_credentials WHERE user_id = ?', user.user_id)).password_hash, legacy);
  const profile = await api.signInCustomer(db, customerForm.email, legacyPassword);
  assert.equal(profile.user_id, user.user_id); assert.equal(profile.role, 'customer');
  const migrated = (await db.getFirstAsync('SELECT password_hash FROM customer_credentials WHERE user_id = ?', user.user_id)).password_hash;
  assert.ok(migrated.startsWith('bcrypt-hmac-sha256$$2b$10$'));
  assert.equal((await api.signInCustomer(db, customerForm.email, legacyPassword)).user_id, user.user_id);
  assert.equal((await db.getFirstAsync('SELECT password_hash FROM customer_credentials WHERE user_id = ?', user.user_id)).password_hash, migrated);
});

test('customers have independent carts and cannot read, edit, or cancel each other’s rentals', async () => {
  const db = connection(); await api.initializeDatabase(db);
  const first = await api.registerCustomer(db, customerForm);
  const second = await api.registerCustomer(db, { ...customerForm, name: 'Second Customer', email: 'second@example.com' });
  const item = (await api.getEquipment(db))[0];
  await api.persistCart(db, [{ ...item, quantity: 2 }], first.user_id);
  await api.persistCart(db, [{ ...item, quantity: 3 }], second.user_id);
  assert.equal((await api.getCart(db, first.user_id))[0].quantity, 2);
  assert.equal((await api.getCart(db, second.user_id))[0].quantity, 3);
  const result = await api.createReservation(db, booking(item), first.user_id);
  assert.equal((await api.getCart(db, first.user_id)).length, 0);
  assert.equal((await api.getCart(db, second.user_id))[0].quantity, 3);
  assert.equal((await api.getCustomerRentals(db, first.user_id)).length, 1);
  assert.equal((await api.getCustomerRentals(db, second.user_id)).length, 0);
  assert.equal((await api.getCustomerRentals(db)).length, 0);
  assert.equal((await api.getRentalDetails(db, result.reservationId, second.user_id)).reservation, undefined);
  assert.deepEqual((await api.getRentalDetails(db, result.reservationId, second.user_id)).items, []);
  await assert.rejects(api.updateReservationContact(db, result.reservationId, 'changed', 'changed', '2099-01-05', '2099-01-06', second.user_id), /pending/);
  await assert.rejects(api.updateReservationStatus(db, result.reservationId, 'cancelled', second.user_id), /own booking/);
  await assert.rejects(api.updateReservationStatus(db, result.reservationId, 'confirmed', first.user_id), /own booking/);
  await api.updateReservationContact(db, result.reservationId, 'updated', 'note', '2099-01-05', '2099-01-06', first.user_id);
  const admin = (await api.getAdminReservations(db))[0];
  assert.equal(admin.customer_name, first.name); assert.equal(admin.start_date, '2099-01-05');
  await api.updateReservationStatus(db, result.reservationId, 'cancelled', first.user_id);
  await assert.rejects(api.deleteUser(db, first.user_id), /linked records/);
  await api.deleteUser(db, second.user_id);
  assert.equal(await db.getFirstAsync('SELECT * FROM customer_credentials WHERE user_id = ?', second.user_id), undefined);
  assert.equal((await api.getCart(db, second.user_id)).length, 0);
  assert.deepEqual(db.sql.prepare('PRAGMA foreign_key_check').all(), []);
});

test('simultaneous registrations with the same email create only one customer', async () => {
  const db = connection(); await api.initializeDatabase(db);
  const results = await Promise.allSettled([api.registerCustomer(db, customerForm), api.registerCustomer(db, customerForm)]);
  assert.equal(results.filter(row => row.status === 'fulfilled').length, 1);
  assert.equal((await readUserRecords(db)).length, 4);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM customer_credentials')).count, 1);
});

test('fresh startup is empty and administrator setup grants only a regular admin role', async () => {
 const db=connection(); await production.initializeDatabase(db); await production.initializeDatabase(db);
 assert.equal((await readUserRecords(db)).length,0);
 assert.equal((await production.getEquipment(db)).length,0);
 assert.equal(await production.needsAdministratorSetup(db),true);
 const admin=await production.registerCustomer(db,{...customerForm,name:'Real Administrator'},undefined,true);
 assert.equal(admin.name,'Real Administrator'); assert.equal(admin.role,'admin');
 assert.equal(await production.needsAdministratorSetup(db),false);
 await assert.rejects(production.registerCustomer(db,{...customerForm,email:'other@example.test'},undefined,true),/setup/);
 const regular=await production.registerCustomer(db,{...customerForm,email:'regular@example.test',role:'admin',demo_access:1});
 assert.equal(regular.role,'customer'); assert.equal(regular.demo_access,undefined);
 await assert.rejects(production.deleteUser(db,admin.user_id),/last administrator/);
 await production.saveEquipment(db,form,undefined,admin.user_id);
 assert.equal((await production.getEquipment(db))[0].supplier_id,admin.user_id);
 await production.initializeDatabase(db);
 assert.equal((await readUserRecords(db)).length,2);
 // The migration must not delete a newly registered account that reuses a legacy name/email.
 const reused=await production.registerCustomer(db,{...customerForm,name:'UserDemo',email:'userdemo@gmail.com'});
 await production.initializeDatabase(db);
 assert.equal((await production.signInCustomer(db,reused.email,customerForm.password)).user_id,reused.user_id);
 assert.deepEqual(db.sql.prepare('PRAGMA foreign_key_check').all(),[]);
});

test('administrator setup removes legacy demos and preserves equipment and booking history', async () => {
 const db=connection(); await production.initializeDatabase(db);
 await db.execAsync(`INSERT INTO users (user_id,name,contact,role,demo_access) VALUES
 (1,'Demo Customer','0917 000 0001','customer',0),
 (2,'EventGear Supplier','0917 000 0002','supplier',0),
 (3,'Demo Administrator','admin@eventgear.local','admin',0),
 (4,'UserDemo','09233434223','customer',1);`);
 await db.runAsync("INSERT INTO customer_credentials (user_id,email,password_hash) VALUES (4,'userdemo@gmail.com','legacy')");
 await production.saveEquipment(db,form,undefined,2);
 const item=(await production.getEquipment(db))[0];
 const reservation=await production.createReservation(db,booking(item),1);
 await production.persistCart(db,[{...item,quantity:1}],4);
 assert.equal(await production.needsAdministratorSetup(db),true);
 const admin=await production.registerCustomer(db,{...customerForm,name:'Administrator'},undefined,true);
 await production.initializeDatabase(db); await production.initializeDatabase(db);
 assert.deepEqual((await readUserRecords(db)).map(u=>u.user_id),[admin.user_id]);
 assert.equal((await production.getEquipment(db))[0].supplier_id,admin.user_id);
 assert.equal((await production.getRentalDetails(db,reservation.reservationId)).reservation.customer_id,admin.user_id);
 assert.equal((await production.getSupplierReservations(db)).length,1);
 assert.equal((await production.getCart(db,4)).length,0);
 assert.deepEqual(db.sql.prepare('PRAGMA foreign_key_check').all(),[]);
});

test('cleanup retries older migrations and removes UserDemo at ID 8 without deleting David accounts', async () => {
 const db=connection(); await production.initializeDatabase(db);
 await db.execAsync(`INSERT INTO users (user_id,name,contact,role,demo_access) VALUES
 (1,'Demo Customer','changed contact','customer',0),
 (2,'EventGear Supplier','changed contact','supplier',0),
 (6,'David','666','customer',0),
 (8,'UserDemo','888','customer',0),
 (9,'david','999','admin',0);
 INSERT INTO customer_credentials (user_id,email,password_hash) VALUES
 (8,'different@example.test','legacy'), (9,'david@example.test','existing');
 INSERT INTO app_settings (key,value) VALUES ('demo_accounts_removed','1');`);
 await production.saveEquipment(db,form,undefined,2);
 const item=(await production.getEquipment(db))[0];
 const reservation=await production.createReservation(db,booking(item),8);
 await production.initializeDatabase(db); await production.initializeDatabase(db);
 assert.deepEqual((await readUserRecords(db)).map(u=>u.user_id),[6,9]);
 assert.equal((await production.getEquipment(db))[0].supplier_id,9);
 assert.equal((await production.getRentalDetails(db,reservation.reservationId)).reservation.customer_id,9);
 assert.equal(await production.needsAdministratorSetup(db),false);
 assert.deepEqual(db.sql.prepare('PRAGMA foreign_key_check').all(),[]);
});

test('requested David customer accounts are deleted on startup including credentials and carts', async () => {
 const db=connection(); await production.initializeDatabase(db);
 // Reproduce a pre-upgrade database with the exact identities from the viewer.
 await db.execAsync(`DELETE FROM app_settings WHERE key = 'requested_customers_removed_20261020';
 INSERT INTO users (user_id,name,contact,role) VALUES
 (6,'David','938321320123','customer'),(9,'david','2313123123','customer'),
 (10,'David','other contact','customer');
 INSERT INTO customer_credentials (user_id,email,password_hash) VALUES
 (6,'david6@example.test','old'),(9,'david9@example.test','old');`);
 await production.initializeDatabase(db);
 assert.deepEqual((await readUserRecords(db)).map(u=>u.user_id),[10]);
 assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM customer_credentials')).count,0);
 // Completion prevents deleting a later account that happens to reuse an old identity.
 await db.runAsync("INSERT INTO users (user_id,name,contact,role) VALUES (6,'David','938321320123','customer')");
 await production.initializeDatabase(db);
 assert.equal((await readUserRecords(db)).length,2);
 assert.deepEqual(db.sql.prepare('PRAGMA foreign_key_check').all(),[]);
});

test('requested customers with bookings transfer history when administrator setup completes', async () => {
 const db=connection(); await production.initializeDatabase(db);
 await db.execAsync(`DELETE FROM app_settings WHERE key = 'requested_customers_removed_20261020';
 INSERT INTO users (user_id,name,contact,role) VALUES
 (6,'David','938321320123','customer'),(9,'david','2313123123','customer');`);
 await production.saveEquipment(db,form,undefined,6);
 const item=(await production.getEquipment(db))[0];
 const reservation=await production.createReservation(db,booking(item),9);
 await production.persistCart(db,[{...item,quantity:1}],6);
 await production.initializeDatabase(db);
 assert.deepEqual((await readUserRecords(db)).map(u=>u.user_id),[6,9]);
 assert.equal(await production.needsAdministratorSetup(db),true);
 const admin=await production.registerCustomer(db,{...customerForm,name:'Administrator'},undefined,true);
 assert.deepEqual((await readUserRecords(db)).map(u=>u.user_id),[admin.user_id]);
 assert.equal((await production.getEquipment(db))[0].supplier_id,admin.user_id);
 assert.equal((await production.getRentalDetails(db,reservation.reservationId)).reservation.customer_id,admin.user_id);
 assert.equal((await production.getCart(db,6)).length,0);
 await production.initializeDatabase(db);
 assert.deepEqual(db.sql.prepare('PRAGMA foreign_key_check').all(),[]);
});

test('admin customer directory and dashboard exclude admins, suppliers, and demo accounts', async () => {
 const db=connection(); await production.initializeDatabase(db);
 await db.execAsync(`INSERT INTO users (user_id,name,contact,role,demo_access) VALUES
 (1,'Ordinary Customer','111','customer',0),
 (2,'Ordinary Supplier','222','supplier',0),
 (3,'Ordinary Admin','333','admin',0),
 (20,'Demo Customer','20','customer',0),
 (21,'EventGear Supplier','21','supplier',0),
 (22,'Demo Administrator','22','admin',0),
 (23,' UserDemo ','23','customer',0),
 (24,'CUSTOMER DEMO','24','customer',0),
 (25,'Supplier Demo','25','supplier',0),
 (26,'Admin Demo','26','admin',0),
 (27,'Custom preview account','27','customer',1),
 (28,'Demond','28','customer',0);`);
 const users=await production.getAdminCustomers(db);
 assert.deepEqual(users.map(u=>u.user_id),[1,28]);
 assert.equal((await production.getAdminOverview(db)).stats.users,users.length);
 // Hiding accounts does not delete them or alter their profiles.
 assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM users')).count,12);
 await db.runAsync("INSERT INTO users (name,contact,role,demo_access) VALUES ('Another preview','29','customer',1)");
 assert.equal((await production.getAdminCustomers(db)).length,2);
 assert.equal((await production.getAdminOverview(db)).stats.users,2);
 await db.runAsync("UPDATE users SET role = 'admin' WHERE user_id = 28");
 assert.deepEqual((await production.getAdminCustomers(db)).map(u=>u.user_id),[1]);
 assert.equal((await production.getAdminOverview(db)).stats.users,1);
 assert.equal((await db.getFirstAsync("SELECT role FROM users WHERE user_id = 3")).role,'admin');
});

test('legacy cart migration preserves the demo cart without assigning it to new accounts', async () => {
  const db = connection(); await api.initializeDatabase(db);
  const item = (await api.getEquipment(db))[0];
  await db.execAsync(`DROP TABLE cart_items;
    CREATE TABLE cart_items (equipment_id INTEGER PRIMARY KEY, quantity INTEGER NOT NULL CHECK(quantity > 0),
      FOREIGN KEY (equipment_id) REFERENCES equipment(equipment_id) ON DELETE CASCADE);`);
  await db.runAsync('INSERT INTO cart_items (equipment_id, quantity) VALUES (?, 2)', item.equipment_id);
  await api.initializeDatabase(db); await api.initializeDatabase(db);
  assert.equal((await api.getCart(db))[0].quantity, 2);
  assert.equal((await api.getCart(db, 4)).length, 0);
  assert.deepEqual(db.sql.prepare('PRAGMA foreign_key_check').all(), []);
});

test('customer date edits move stock and update totals and admin dates using booked rates', async () => {
  const db = connection(); await api.initializeDatabase(db);
  const item = (await api.getEquipment(db))[0];
  const result = await api.createReservation(db, { ...booking(item), items: [{ ...item, quantity: item.total_quantity }] });
  // Saving unchanged dates must not count this booking against itself.
  await api.updateReservationContact(db, result.reservationId, 'new contact', 'new note', '2099-01-01', '2099-01-02');
  await db.runAsync('UPDATE equipment SET daily_rate = daily_rate + 100 WHERE equipment_id = ?', item.equipment_id);
  await api.updateReservationContact(db, result.reservationId, 'new contact', 'new note', '2099-01-05', '2099-01-07');
  const details = await api.getRentalDetails(db, result.reservationId);
  assert.equal(details.reservation.start_date, '2099-01-05');
  assert.equal(details.reservation.end_date, '2099-01-07');
  assert.equal(details.reservation.booking_contact, 'new contact');
  assert.equal(details.items[0].daily_rate_at_booking, item.daily_rate);
  assert.equal(details.items[0].line_total, item.daily_rate * item.total_quantity * 3);
  assert.equal(details.reservation.total_amount, details.items[0].line_total);
  assert.equal(await api.getAvailableQuantity(db, item.equipment_id, '2099-01-01', '2099-01-02'), item.total_quantity);
  assert.equal(await api.getAvailableQuantity(db, item.equipment_id, '2099-01-05', '2099-01-07'), 0);
  const admin = (await api.getAdminReservations(db))[0];
  assert.equal(admin.start_date, '2099-01-05'); assert.equal(admin.total_amount, details.reservation.total_amount);
  assert.equal((await api.getCustomerRentals(db))[0].end_date, '2099-01-07');
});

test('invalid or unavailable date edits leave all booking details and item totals unchanged', async () => {
  const db = connection(); await api.initializeDatabase(db);
  const [first, second] = await api.getEquipment(db);
  const result = await api.createReservation(db, { ...booking(first), items: [{ ...first, quantity: 1 }, { ...second, quantity: 1 }] });
  await api.createReservation(db, { ...booking(second), startDate: '2099-01-05', endDate: '2099-01-06', items: [{ ...second, quantity: second.total_quantity }] });
  const before = await api.getRentalDetails(db, result.reservationId);
  for (const [start, end] of [['2099-01-05', '2099-01-06'], ['2099-02-30', '2099-03-01'], ['2000-01-01', '2000-01-02'], ['2099-01-04', '2099-01-03']]) {
    await assert.rejects(api.updateReservationContact(db, result.reservationId, 'changed', 'changed', start, end));
    assert.deepEqual(await api.getRentalDetails(db, result.reservationId), before);
  }
  await api.updateReservationStatus(db, result.reservationId, 'confirmed');
  await assert.rejects(api.updateReservationContact(db, result.reservationId, 'changed', 'changed', '2099-01-10', '2099-01-11'), /pending/);
});

test('simultaneous date edits cannot overbook the same equipment', async () => {
  const db = connection(); await api.initializeDatabase(db);
  const item = (await api.getEquipment(db))[0];
  const full = { ...booking(item), items: [{ ...item, quantity: item.total_quantity }] };
  const first = await api.createReservation(db, full);
  const second = await api.createReservation(db, { ...full, startDate: '2099-01-03', endDate: '2099-01-04' });
  const results = await Promise.allSettled([first, second].map(row =>
    api.updateReservationContact(db, row.reservationId, 'contact', 'note', '2099-01-10', '2099-01-11')));
  assert.equal(results.filter(row => row.status === 'fulfilled').length, 1);
  assert.equal(await api.getAvailableQuantity(db, item.equipment_id, '2099-01-10', '2099-01-11'), 0);
});

test('today overview counts bookings created today and pending approvals', async () => {
  const db = connection(); await api.initializeDatabase(db);
  const empty = await api.getAdminOverview(db, '2099-01-15');
  assert.deepEqual({ ...empty.todayStats }, { bookings: 0, pending: 0 });
  const item = (await api.getEquipment(db))[0];
  for (const [startDate, endDate, status, created] of [
    ['2099-01-14', '2099-01-16', 'confirmed', '2099-01-15'],
    ['2099-01-20', '2099-01-21', 'confirmed', '2099-01-14'],
    ['2099-01-15', '2099-01-16', 'pending', '2099-01-15'],
    ['2099-01-16', '2099-01-17', 'cancelled', '2099-01-15'],
    ['2099-01-01', '2099-01-02', 'completed', '2099-01-15'],
  ]) {
    const result = await api.createReservation(db, { ...booking(item), startDate, endDate });
    // Simulate lifecycle records at the test's future reference date.
    await db.runAsync("UPDATE reservations SET status = ?, created_at = datetime(?, 'utc') WHERE reservation_id = ?", status, `${created} 12:00:00`, result.reservationId);
  }
  const overview = await api.getAdminOverview(db, '2099-01-15');
  assert.deepEqual({ ...overview.todayStats }, { bookings: 4, pending: 1 });
  await assert.rejects(api.getAdminOverview(db, 'bad-date'), /date/);
});

test('product photos persist after reopening and can be replaced or removed', async () => {
  const db = connection(); await api.initializeDatabase(db);
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jB1sAAAAASUVORK5CYII=';
  const photo = equipmentPhotoFromAsset({ base64, mimeType: 'image/png', uri: 'blob:temporary-picker-url' });
  assert.equal(photo, `data:image/png;base64,${base64}`);
  assert.equal(isEquipmentPhoto(photo), true);
  assert.equal(isEquipmentPhoto('🎪'), false);
  await api.saveEquipment(db, { ...form, imageRef: photo });
  await api.initializeDatabase(db);
  const item = (await api.getEquipment(db, form.name))[0];
  assert.equal(item.image_ref, photo);
  const replacement = equipmentPhotoFromAsset({ base64: '/9j/test', mimeType: 'image/heic' });
  assert.equal(replacement, 'data:image/jpeg;base64,/9j/test');
  await api.saveEquipment(db, { ...form, imageRef: replacement }, item.equipment_id);
  assert.equal((await api.getEquipmentById(db, item.equipment_id)).image_ref, replacement);
  await api.saveEquipment(db, { ...form, imageRef: '🎪' }, item.equipment_id);
  assert.equal(isEquipmentPhoto((await api.getEquipmentById(db, item.equipment_id)).image_ref), false);
  assert.throws(() => equipmentPhotoFromAsset({ uri: 'blob:temporary' }), /read/);
  assert.throws(() => equipmentPhotoFromAsset({ base64: 'a'.repeat(7 * 1024 * 1024) }), /too large/);
});

test('report period metrics use local booking creation dates and exclude cancelled rental value', async () => {
  const db = connection(); await api.initializeDatabase(db);
  const [first, second] = await api.getEquipment(db);
  const bookings = [];
  for (const [date, status] of [['2099-01-15', 'confirmed'], ['2099-01-15', 'cancelled'], ['2099-01-20', 'confirmed'], ['2099-06-01', 'pending'], ['2098-12-31', 'cancelled']]) {
    const result = await api.createReservation(db, { ...booking(first),
      startDate: '2099-02-01', endDate: '2099-02-02', items: [{ ...first, quantity: 1 }, { ...second, quantity: 1 }] });
    if (status !== 'pending') await api.updateReservationStatus(db, result.reservationId, status);
    await db.runAsync("UPDATE reservations SET created_at = datetime(?, 'utc') WHERE reservation_id = ?", `${date} 12:00:00`, result.reservationId);
    bookings.push(result);
  }
  const day = await api.getAdminReportSummary(db, 'Day', '2099-01-15');
  assert.equal(day.bookings, 2);
  assert.equal(day.revenue, bookings[0].total);
  assert.equal(day.gear.length, 2);
  assert.ok(day.gear.every(row => row.rentals === 1 && row.units === 1));
  const month = await api.getAdminReportSummary(db, 'Month', '2099-01-15');
  assert.equal(month.bookings, 3);
  assert.equal(month.revenue, bookings[0].total + bookings[2].total);
  assert.ok(month.gear.every(row => row.rentals === 2));
  const year = await api.getAdminReportSummary(db, 'Year', '2099-01-15');
  assert.equal(year.bookings, 4);
  assert.equal(year.revenue, month.revenue);
  const empty = await api.getAdminReportSummary(db, 'Day', '2099-01-16');
  assert.equal(empty.bookings, 0); assert.equal(empty.revenue, 0); assert.deepEqual(empty.gear, []);
  await assert.rejects(api.getAdminReportSummary(db, 'Week'), /period/);
});

test('admin combines status and gear filters for all six gear types', async () => {
  const db = connection(); await api.initializeDatabase(db);
  const equipment = await api.getEquipment(db);
  for (const item of equipment) {
    const confirmed = await api.createReservation(db, booking(item));
    await api.updateReservationStatus(db, confirmed.reservationId, 'confirmed');
    const cancelled = await api.createReservation(db, booking(item));
    await api.updateReservationStatus(db, cancelled.reservationId, 'cancelled');
    for (const status of ['confirmed', 'cancelled']) {
      const results = await api.getAdminReservations(db, status, item.equipment_id);
      assert.equal(results.length, 1);
      assert.equal(results[0].status, status);
      assert.ok(results[0].item_names.includes(item.name));
    }
    assert.equal((await api.getAdminReservations(db, 'All', item.equipment_id)).length, 2);
  }
  assert.equal((await api.getAdminReservations(db)).length, 12);
  assert.equal((await api.getAdminReservations(db, 'confirmed')).length, 6);
  assert.equal((await api.getAdminReservations(db, 'cancelled')).length, 6);
  assert.equal((await api.getAdminReservations(db, 'pending')).length, 0);
  assert.equal((await api.getAdminReservations(db, 'confirmed', -1)).length, 0);
  assert.equal((await api.getAdminReservations(db, "confirmed' OR 1=1 --")).length, 0);
  assert.equal((await api.getAdminEquipmentFilters(db)).length, 6);
});

test('admin gear filtering preserves whole bookings across suppliers and archived gear', async () => {
  const db = connection(); await api.initializeDatabase(db);
  const [first, second] = await api.getEquipment(db);
  await db.runAsync("INSERT INTO users (name,contact,role) VALUES ('Another supplier','123','supplier')");
  const supplier = (await readUserRecords(db)).find(row => row.name === 'Another supplier');
  await db.runAsync('UPDATE equipment SET supplier_id = ? WHERE equipment_id = ?', supplier.user_id, second.equipment_id);
  const result = await api.createReservation(db, { ...booking(first), items: [{ ...first, quantity: 2 }, { ...second, quantity: 1 }] });
  const filtered = await api.getAdminReservations(db, 'pending', second.equipment_id);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].reservation_id, result.reservationId);
  assert.equal(filtered[0].total_amount, result.total);
  assert.ok(filtered[0].item_names.includes(`${first.name} x2`));
  assert.ok(filtered[0].item_names.includes(`${second.name} x1`));
  assert.equal((await api.getAdminReservations(db)).length, 1);
  await api.updateReservationStatus(db, result.reservationId, 'cancelled');
  await api.deleteEquipment(db, second.equipment_id);
  assert.ok((await api.getAdminEquipmentFilters(db)).some(row => row.equipment_id === second.equipment_id));
  assert.equal((await api.getAdminReservations(db, 'cancelled', second.equipment_id)).length, 1);
});

test('admin analytics separate confirmed and cancelled values without duplicating multi-gear bookings', async () => {
  const db = connection(); await api.initializeDatabase(db);
  const [first, second] = await api.getEquipment(db);
  const confirmed = await api.createReservation(db, { ...booking(first), items: [{ ...first, quantity: 2 }, { ...second, quantity: 1 }] });
  await api.updateReservationStatus(db, confirmed.reservationId, 'confirmed');
  const cancelled = await api.createReservation(db, booking(first));
  await api.updateReservationStatus(db, cancelled.reservationId, 'cancelled');
  await api.createReservation(db, booking(second)); // Pending bookings do not enter these analytics.
  let report = await api.getAdminOverview(db);
  assert.equal(report.stats.reservations, 3);
  assert.equal(report.stats.value, confirmed.total);
  assert.equal(report.statuses.find(row => row.status === 'confirmed').count, 1);
  assert.equal(report.statuses.find(row => row.status === 'confirmed').total, confirmed.total);
  assert.equal(report.statuses.find(row => row.status === 'cancelled').total, cancelled.total);
  await db.runAsync("UPDATE reservations SET start_date = '2000-01-01', end_date = '2000-01-02' WHERE reservation_id = ?", confirmed.reservationId);
  await api.updateReservationStatus(db, confirmed.reservationId, 'completed');
  report = await api.getAdminOverview(db);
  assert.equal(report.stats.value, confirmed.total);
  assert.equal(report.statuses.some(row => row.status === 'confirmed'), false);
  assert.equal(report.statuses.find(row => row.status === 'completed').count, 1);
});

test('schema is idempotent with explicit fixtures', async () => {
  const db = connection(); await api.initializeDatabase(db); await api.initializeDatabase(db);
  assert.equal((await api.getEquipment(db)).length, 6); assert.equal((await readUserRecords(db)).length, 3);
  assert.deepEqual(db.sql.prepare('PRAGMA foreign_key_check').all(), []);
});
test('strict calendar validation and inclusive UTC days', () => {
  assert.equal(api.validDate('2026-02-30'), false); assert.equal(api.validDate('2026-13-01'), false);
  assert.equal(api.validDate('2028-02-29'), true); assert.equal(api.rentalDays('2026-03-07','2026-03-09'), 3);
  assert.ok(Number.isNaN(api.rentalDays('invalid','2026-03-09')));
});
test('equipment create/read/update/delete and invalid numeric input', async () => {
  const db = connection(); await api.initializeDatabase(db);
  await api.saveEquipment(db, form); let row = (await api.getEquipment(db, 'Test Speaker'))[0]; assert.equal(row.daily_rate, 100.5);
  await api.saveEquipment(db, { ...form, name: 'Updated' }, row.equipment_id);
  assert.equal((await api.getEquipmentById(db,row.equipment_id)).name, 'Updated');
  await assert.rejects(api.saveEquipment(db,{...form,dailyRate:'NaN'}), /rate/);
  await assert.rejects(api.saveEquipment(db,{...form,totalQuantity:'1.5'}), /quantity/);
  await api.deleteEquipment(db,row.equipment_id); assert.equal(await api.getEquipmentById(db,row.equipment_id), undefined);
});
test('reservation saves authoritative prices, items, totals, cart and audit atomically', async () => {
  const db = connection(); await api.initializeDatabase(db); const item = (await api.getEquipment(db))[0];
  await api.persistCart(db,[{...item,quantity:2}]); assert.equal((await api.getCart(db)).length,1);
  const result = await api.createReservation(db,booking(item));
  const details = await api.getRentalDetails(db,result.reservationId);
  assert.equal(details.items.length,1); assert.equal(result.total,item.daily_rate * 4);
  assert.equal(details.reservation.demo_payment_status,'not_recorded'); assert.equal((await api.getCart(db)).length,0);
  assert.equal((await api.getCustomerRentals(db)).length,1); assert.equal((await api.getSupplierReservations(db)).length,1);
  assert.ok((await db.getAllAsync('SELECT * FROM audit_log')).length);
  await assert.rejects(api.deleteEquipment(db,item.equipment_id), /active/);
  await assert.rejects(api.saveEquipment(db,{...form,totalQuantity:'1'},item.equipment_id),/committed/);
});
test('invalid, empty, duplicate, past and stale-price bookings are rejected without partial writes', async () => {
  const db = connection(); await api.initializeDatabase(db); const item = (await api.getEquipment(db))[0]; const b = booking(item);
  for (const bad of [{...b,items:[]},{...b,contact:''},{...b,startDate:'2026-02-30'},{...b,startDate:'2000-01-01'},
    {...b,items:[{...item,quantity:-1}]},{...b,items:[...b.items,...b.items]},{...b,items:[{...item,quantity:1,daily_rate:0}]}]) {
    await assert.rejects(api.createReservation(db,bad));
  }
  assert.equal((await api.getCustomerRentals(db)).length,0);
});
test('concurrent submissions cannot overbook stock', async () => {
  const db = connection(); await api.initializeDatabase(db); const item = (await api.getEquipment(db))[0];
  const b = {...booking(item),items:[{...item,quantity:item.total_quantity}]};
  const results = await Promise.allSettled([api.createReservation(db,b),api.createReservation(db,b)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal((await api.getCustomerRentals(db)).length,1);
});
test('availability counts peak daily use and inclusive boundary overlap', async () => {
  const db = connection(); await api.initializeDatabase(db); const item = (await api.getEquipment(db))[0];
  await api.createReservation(db,{...booking(item),endDate:'2099-01-01'});
  await api.createReservation(db,{...booking(item),startDate:'2099-01-03',endDate:'2099-01-03'});
  assert.equal(await api.getAvailableQuantity(db,item.equipment_id,'2099-01-01','2099-01-03'),item.total_quantity-2);
  assert.equal(await api.getAvailableQuantity(db,item.equipment_id,'2099-01-02','2099-01-02'),item.total_quantity);
});
test('status transitions, customer details and cancelled stock release', async () => {
  const db = connection(); await api.initializeDatabase(db); const item = (await api.getEquipment(db))[0];
  const r = await api.createReservation(db,booking(item));
  await api.updateReservationContact(db,r.reservationId,'new contact','new note');
  assert.equal((await api.getRentalDetails(db,r.reservationId)).reservation.booking_contact,'new contact');
  await api.updateReservationStatus(db,r.reservationId,'confirmed');
  await assert.rejects(api.updateReservationContact(db,r.reservationId,'x','x'),/pending/);
  await assert.rejects(api.updateReservationStatus(db,r.reservationId,'completed'),/end date/);
  await api.updateReservationStatus(db,r.reservationId,'cancelled');
  await assert.rejects(api.updateReservationStatus(db,r.reservationId,'pending'),/allowed/);
  assert.equal(await api.getAvailableQuantity(db,item.equipment_id,'2099-01-01','2099-01-02'),item.total_quantity);
  await api.deleteEquipment(db,item.equipment_id);
  assert.equal((await api.getEquipmentById(db,item.equipment_id)).is_active,0);
  assert.equal((await api.getRentalDetails(db,r.reservationId)).items.length,1);
  assert.deepEqual(db.sql.prepare('PRAGMA foreign_key_check').all(),[]);
});
test('customer deletion removes credentials and supports ordinary low-ID accounts', async () => {
 const db=connection(); await api.initializeDatabase(db);
 const user=await api.registerCustomer(db,customerForm);
 await api.deleteUser(db,user.user_id);
 assert.equal((await readUserRecords(db)).length,3);
 await assert.rejects(api.signInCustomer(db,customerForm.email,customerForm.password),/Email or password is incorrect/);
 await api.deleteUser(db,1);
 assert.deepEqual((await readUserRecords(db)).map(u=>u.user_id),[2,3]);
 assert.deepEqual(db.sql.prepare('PRAGMA foreign_key_check').all(),[]);
});

test('completed rental contributes to admin totals and remains historical', async () => {
  const db = connection(); await api.initializeDatabase(db); const item = (await api.getEquipment(db))[0];
  const result = await api.createReservation(db,booking(item));
  await api.updateReservationStatus(db,result.reservationId,'confirmed');
  // Simulate a scheduled rental that has reached its end date.
  await db.runAsync("UPDATE reservations SET start_date = '2000-01-01', end_date = '2000-01-02' WHERE reservation_id = ?",result.reservationId);
  await api.updateReservationStatus(db,result.reservationId,'completed');
  assert.equal((await api.getAdminOverview(db)).stats.value,result.total);
  await assert.rejects(api.updateReservationStatus(db,result.reservationId,'confirmed'),/allowed/);
});


test('empty catalog remains empty after reopening', async () => {
  const db = connection(); await api.initializeDatabase(db);
  for (const item of await api.getEquipment(db)) await api.deleteEquipment(db,item.equipment_id);
  await api.initializeDatabase(db);
  assert.equal((await api.getEquipment(db)).length,0);
});

test('inventory decreases on ordering, survives reopening, and releases on cancellation', async () => {
  const db = connection(); await api.initializeDatabase(db);
  const item = (await api.getEquipment(db))[0];
  assert.equal(item.available_quantity, item.total_quantity);
  assert.equal(item.inventory_status, 'In stock');
  const result = await api.createReservation(db, booking(item));
  await api.initializeDatabase(db);
  let current = await api.getEquipmentById(db, item.equipment_id);
  assert.equal(current.total_quantity, item.total_quantity);
  assert.equal(current.available_quantity, item.total_quantity - 2);
  assert.equal(current.reserved_quantity, 2);
  assert.equal(current.inventory_status, 'Partly reserved');
  await api.updateReservationStatus(db, result.reservationId, 'confirmed');
  assert.equal((await api.getEquipment(db)).find(r => r.equipment_id === item.equipment_id).available_quantity, item.total_quantity - 2);
  await api.updateReservationStatus(db, result.reservationId, 'cancelled');
  current = await api.getEquipmentById(db, item.equipment_id);
  assert.equal(current.available_quantity, item.total_quantity);
  assert.equal(current.reserved_quantity, 0);
});

test('stock editor validates quantities and preserves bookings and equipment details', async () => {
  const db = connection(); await api.initializeDatabase(db);
  const item = (await api.getEquipment(db))[0];
  await api.createReservation(db, booking(item));
  for (const invalid of ['', ' ', '-1', '1.5', 'NaN', 'Infinity'])
    await assert.rejects(api.updateEquipmentQuantity(db, item.equipment_id, invalid), /quantity/);
  await assert.rejects(api.updateEquipmentQuantity(db, item.equipment_id, '1'), /committed/);
  await api.updateEquipmentQuantity(db, item.equipment_id, '2');
  let current = await api.getEquipmentById(db, item.equipment_id);
  assert.equal(current.available_quantity, 0);
  assert.equal(current.inventory_status, 'Fully reserved');
  await api.updateEquipmentQuantity(db, item.equipment_id, '7');
  current = await api.getEquipmentById(db, item.equipment_id);
  assert.equal(current.available_quantity, 5);
  assert.equal(current.name, item.name);
  assert.equal(current.daily_rate, item.daily_rate);
  assert.ok((await db.getAllAsync('SELECT * FROM audit_log')).some(r => r.action === 'Inventory updated'));
  const unbooked = (await api.getEquipment(db)).find(r => r.equipment_id !== item.equipment_id);
  await api.updateEquipmentQuantity(db, unbooked.equipment_id, '0');
  assert.equal((await api.getEquipmentById(db, unbooked.equipment_id)).inventory_status, 'Out of stock');
});

test('inventory respects non-overlapping rental dates and releases completed rentals', async () => {
  const db = connection(); await api.initializeDatabase(db);
  const item = (await api.getEquipment(db))[0];
  const first = await api.createReservation(db, booking(item));
  await api.createReservation(db, { ...booking(item), startDate: '2099-02-01', endDate: '2099-02-02' });
  assert.equal((await api.getEquipmentById(db, item.equipment_id)).reserved_quantity, 2);
  await api.updateReservationStatus(db, first.reservationId, 'confirmed');
  await db.runAsync("UPDATE reservations SET start_date = '2000-01-01', end_date = '2000-01-02' WHERE reservation_id = ?", first.reservationId);
  await api.updateReservationStatus(db, first.reservationId, 'completed');
  const second = (await api.getCustomerRentals(db)).find(r => r.reservation_id !== first.reservationId);
  await api.updateReservationStatus(db, second.reservation_id, 'cancelled');
  assert.equal((await api.getEquipmentById(db, item.equipment_id)).available_quantity, item.total_quantity);
});
