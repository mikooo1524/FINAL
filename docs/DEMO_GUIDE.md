# EventGear presentation guide

## One-minute pitch

EventGear helps customers rent equipment for parties, church programs, school
activities and community events. Customers browse gear, choose quantities
and dates, and receive a booking code. Suppliers maintain stock and review
bookings. Administrators manage contact records and operational reports.
SQLite remembers rentals locally and checks stock before each reservation.
Our goal is to replace scattered manual lists with one clear rental workflow.

## Five-minute live demo

1. **0:00-0:35:** Show logo, role selection, customer home, search/categories/details.
2. **0:35-1:45:** Add a table; show cart confirmation; change quantity. Enter
   future dates/contact/note, check availability, review total, confirm demo payment.
3. **1:45-2:20:** Show booking code/history/details; edit a pending event note
   and save; show the confirmation.
4. **2:20-3:20:** Supplier: add a temporary listing, show it, edit its rate,
   then delete it. Show confirmations for CREATE/READ/UPDATE/DELETE.
5. **3:20-4:00:** Review the customer's contact/note and confirm their booking.
   Do not complete a rental before its end date.
6. **4:00-4:40:** Administrator: show totals, user CRUD, reports and activity.
7. **4:40-5:00:** Reopen the app to show SQLite persistence.

Use a temporary unreferenced listing for physical DELETE. Active rentals block
delete; historical equipment is archived. Customer cancellation releases stock.

## Technical discussion (2-3 minutes)

- React Native supplies View/Text/Pressable/TextInput/ScrollView/FlatList.
- Functional components use useState for input, useEffect for hydration,
  and useFocusEffect for refreshing active screens. Shared components use props.
- Expo Router uses React Navigation: root Stack and nested role bottom Tabs.
- AppContext shares SQLite connection, lists and persistent cart state.
- Tables: users, equipment, reservations, reservation_items, cart_items,
  audit_log, app_settings. Foreign keys protect relationships.
- Checkout is a draft. Confirmation validates stock/input/prices within a
  queued transaction, writes booking/items, clears cart and adds audit entry.
  Failure rolls back. Stored item rates keep historical totals unchanged.
- Availability measures peak simultaneous rental quantities across the dates.

## Panel Q&A

**Why SQLite?** The PDF permits it. It works offline on one device and supplies
real CREATE/READ/UPDATE/DELETE, unlike an AsyncStorage-only solution.

**Is role selection secure login?** No. It is a local demo. The directory stores
contact records, not sign-in accounts. Production needs backend authentication
and server-side authorization.

**Is payment real?** No money is collected. Only an intended method is stored;
reports show rental value, not collected payments.

**How is overbooking prevented?** Recheck stock inside serialized transactions
and count reservations that overlap the requested days.

**Why archive equipment?** Historical receipts still reference it. Equipment
with no booking history can be physically deleted for the CRUD demonstration.

**What issues were fixed?** Missing administrator; lost carts; web alert behavior;
invalid dates; historical FK delete failures; stock reduction and booking status
rules that could permit inconsistent data.

**What testing was completed?** 15 SQLite/lock tests, lint/compiler config checks,
Android and web exports, and a running-browser workflow with actual screenshots.
The final APK still needs a real Android installation test.
