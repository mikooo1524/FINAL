// Optional running-browser smoke test. Run from the project root.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const server=require('child_process').spawn(process.env.EVENTGEAR_PYTHON || 'python3',['scripts/serve_web.py']);
 await new Promise(resolve=>server.stdout.once('data',resolve));
 const browser=await chromium.launch({headless:true,...(process.env.EVENTGEAR_CHROMIUM ? { executablePath: process.env.EVENTGEAR_CHROMIUM } : {}),args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const click=async text=>page.getByText(text,{exact:true}).filter({visible:true}).last().click();
 const shot=async name=>{ await page.waitForTimeout(400); await page.evaluate(async()=>{ await Promise.all(Array.from(document.images).map(i=>i.decode().catch(()=>{}))); }); await page.screenshot({path:`docs/screenshots/${name}.png`}); };
 try {
 await page.goto('http://localhost:8765'); await page.getByText('Continue as Customer',{exact:true}).waitFor(); await shot('01-roles');
 await click('Continue as Customer'); await page.getByText('Featured equipment',{exact:true}).waitFor(); await shot('02-customer-home');
 await click('Browse equipment'); await page.getByText('6 results',{exact:true}).waitFor(); await shot('03-equipment');
 await click('Folding Tables'); await page.getByText('Add 1 to cart',{exact:true}).waitFor(); await shot('04-equipment-details');
 await click('Add 1 to cart'); await page.getByText('Added to cart',{exact:true}).waitFor(); await shot('05-cart-confirmation');
 await click('View cart'); await page.getByText('Review your equipment',{exact:true}).waitFor(); await shot('06-cart');
 await page.reload(); await page.getByText('Review your equipment',{exact:true}).waitFor();
 assert.ok((await page.locator('body').innerText()).includes('Folding Tables')); console.log('PASS cart survives page reload');
 await click('Continue to booking'); await page.getByText('Booking schedule',{exact:true}).waitFor(); await shot('07-booking');
 await click('Check availability'); await page.getByText('Confirm booking details',{exact:true}).waitFor(); await shot('08-checkout');
 await click('Continue to demo payment'); await page.getByText('Confirm reservation',{exact:true}).waitFor(); await shot('09-payment');
 await click('Confirm reservation'); await page.getByText('Reservation created!',{exact:true}).waitFor(); await shot('10-reservation-success');
 await click('View My Rentals'); await page.getByText('Folding Tables',{exact:true}).waitFor(); await shot('11-my-rentals');
 await click('Folding Tables'); await page.getByText('Edit booking details',{exact:true}).waitFor(); await shot('12-rental-details');
 // Customer contact edit is saved to SQLite and reflected on the same screen.
 await page.locator('input').filter({visible:true}).fill('0918 111 2222'); await click('Save details'); await page.getByText('Details saved',{exact:true}).waitFor(); await click('OK');
 await page.goto('http://localhost:8765'); await click('Continue as Supplier'); await page.getByText('Quick actions',{exact:true}).waitFor(); await shot('13-supplier-dashboard');
 await click('Manage equipment'); await page.getByText('Equipment catalog',{exact:true}).waitFor(); await shot('14-supplier-equipment');
 await click('+ Add'); await page.getByText('Create a listing',{exact:true}).waitFor(); await shot('15-equipment-form');
 const inputs=page.locator('input').filter({visible:true}); await inputs.nth(0).fill('Demo Podium'); await inputs.nth(1).fill('Furniture');
 await page.locator('textarea').filter({visible:true}).fill('Wooden podium for ceremonies.'); await inputs.nth(2).fill('500'); await inputs.nth(3).fill('2');
 await click('Create equipment'); await page.getByText('Saved',{exact:true}).waitFor(); await click('OK'); await page.getByText('Demo Podium',{exact:true}).waitFor();
 console.log('PASS supplier creates equipment');
 // Delete the new unreferenced listing, demonstrating a physical DELETE.
 const card=page.getByText('Demo Podium',{exact:true}).locator('xpath=../../..');
 await card.getByText('Delete',{exact:true}).click(); await click('Remove'); await page.getByText('Equipment removed',{exact:true}).waitFor(); await click('OK');
 assert.equal(await page.getByText('Demo Podium',{exact:true}).count(),0); console.log('PASS supplier deletes equipment');
 await page.goto('http://localhost:8765'); await click('Continue as Supplier'); await click('Review reservations');
 await page.getByText('Update status',{exact:true}).waitFor(); await shot('16-supplier-reservations');
 await click('Update status'); await click('Confirmed'); await page.getByText('Status updated',{exact:true}).waitFor(); await click('OK');
 await page.getByText('CONFIRMED',{exact:true}).waitFor();
 await page.goto('http://localhost:8765'); await click('Administrator'); await page.getByText('Confirmed rental value',{exact:true}).waitFor(); await shot('17-admin-dashboard');
 await click('👥 User directory ›'); await page.getByText('Add a user',{exact:true}).waitFor(); await shot('18-admin-users');
 await page.locator('input').filter({visible:true}).nth(0).fill('Panel Visitor'); await page.locator('input').filter({visible:true}).nth(1).fill('panel@example.com');
 await click('Create user'); await page.getByText('User saved',{exact:true}).waitFor(); await click('OK');
 await page.getByText('Panel Visitor',{exact:true}).waitFor(); console.log('PASS administrator user create');
 await page.goto('http://localhost:8765'); await click('Administrator'); await click('📊 Reports & activity ›');
 await page.getByText('Recent activity',{exact:true}).waitFor(); await shot('19-admin-reports');
 assert.ok((await page.locator('body').innerText()).includes('Reservation status')); console.log('PASS administrator audit reporting');
 await page.setViewportSize({width:320,height:740}); await page.goto('http://localhost:8765'); await click('Continue as Customer'); await shot('20-small-phone');
 await page.setViewportSize({width:1280,height:900}); await page.goto('http://localhost:8765'); await click('Administrator'); await shot('21-desktop');
 assert.deepEqual(errors,[]); console.log('PASS no browser runtime errors');
 } catch(e) {console.log((await page.locator('body').innerText()).slice(-3000)); await shot('failure'); throw e;}
 finally {await browser.close();server.kill();}
})();
