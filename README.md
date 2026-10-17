# EventGear

An offline event-equipment rental app built with React Native, Expo SDK 57,
Expo Router / React Navigation, and SQLite. This completes the supplied
partial app for the CS15L functional project scope.

## Run in VS Code

Install Node.js **24 LTS** (tests use its built-in SQLite), extract this folder,
open it in VS Code, then run:

```bash
npm ci
npx expo start
```

Open with an Expo Go version supporting **SDK 57**, or build an Android APK.
Choose Customer, Supplier, or Administrator. Customers register with their name,
contact number, email and password, then sign in. Registered customer details
appear automatically in **Admin → Users**. Each customer has a separate cart
and rental history. Supplier and administrator access remain **local demo roles**.
IDs 1/2/3 preserve the legacy demo records. Accounts and bookings are stored on
the same device; they do not synchronize across devices. See
[customer sign-in details](docs/CUSTOMER_SIGN_IN.md).

## Completed features

- **Customer:** registration, sign-in/sign-out, individual carts and rental history,
  dashboard, searchable categories, equipment details, stock-aware
  quantities, persistent cart, rental dates/contact/notes, availability,
  checkout, payment-method demo, booking confirmation, history/details,
  pending dates/contact/note edits, and cancellation with stock release.
- **Supplier:** dashboard, equipment CRUD, validation of rates and stock,
  booking review with contact/notes/details,
  and success/error confirmations.
- **Administrator:** overview, user-directory CRUD with registered customer details,
  protected demo accounts, booking status updates and rental-value reports.
- **UX:** custom EventGear logo, navy/teal branding, reusable components,
  accessible buttons, mobile/web dialogs, loading/error/empty states,
  pull-to-refresh and responsive layouts.

## Database and booking rules

SQLite `eventgear.db` stores users, equipment, reservations, reservation_items,
cart_items, customer_credentials, audit_log and app_settings. Passwords are salted
and hashed; they are never shown in Admin Users. No AsyncStorage-only storage is used.
Foreign keys preserve relationships; parameterized queries separate input
from SQL. Cart changes persist after initial hydration.

Dates must be real calendar dates starting today or later. Rental days are
inclusive: Oct 14-15 = 2 days. Pending/confirmed bookings reserve stock.
Availability counts peak concurrent bookings, rather than adding reservations
on different days. Confirmation rechecks stock, prices and input inside a
queued transaction, then saves booking/items, clears the persisted cart and
logs the action. Failure rolls back. Old receipts retain their booked rates.

Allowed changes: Pending → Confirmed/Cancelled; Confirmed → Completed/Cancelled.
Completed/cancelled bookings are final. Completion is allowed on/after the end
date. Pending dates/contact/notes are editable. Changing dates rechecks stock and
recalculates totals at the booked rates. To change items, cancel and make a new
booking. Cancellation releases stock.

Active bookings block equipment deletion. Listings with historical bookings
are archived to preserve receipts; unreferenced listings are physically
deleted, demonstrating SQL DELETE. Seed equipment is created only once.

**Payment is a demonstration:** it records an intended method, charges no
money, and never marks payment collected. Reports show rental value, not revenue.

## Structure and comments

- `src/app/`: root stack and nested customer/supplier/admin tabs.
- `src/customerScreens.js`, `supplierScreens.js`, `adminScreens.js`: role screens.
- `src/database.js`: schema, validation, queries, transactions and audit log.
- `src/AppContext.js`: shared lists, SQLite cart hydration/persistence.
- `src/components.js`, `feedback.js`, `theme.js`: shared UI and dialogs.
- `src/DatabaseGate.js`: startup/error recovery and web locking.
- `assets/`: custom logo and supplied equipment photos.
- `tests/`: SQLite and web-lock regression tests.
- `docs/`: requirement map, presentation guide, actual screenshots and PDF.
- `scripts/`: web preview and documentation generation.

Comments explain the major data, validation, state and navigation blocks.

## Checks

```bash
npm run lint -- --no-cache
npm test
npm run typecheck
npx expo export --platform android --output-dir dist-android
npx expo export --platform web --output-dir dist-web
```

15 tests run production SQL in real SQLite, covering CRUD, dates/numbers,
atomic booking writes, concurrency, stock availability, lifecycle rules,
history, protected users, seed persistence, and web locks. Lint and compiler
configuration checks passed. `checkJs` is disabled, so the latter is not full
static type verification. Android Hermes and web exports passed.

The running Chromium app was tested at phone widths (including 320px) and
on desktop. The workflow checked cart persistence after reload, booking,
contact editing, supplier create/delete/status updates, administrator user
creation and reports, with no runtime errors. PNGs in `docs/screenshots` are
actual web-app captures. Native APK installation still needs testing on a phone.

For an optional repeatable browser workflow, install Playwright separately
(`npm install --no-save playwright` and `npx playwright install chromium`),
export the web app, then run `node scripts/ui_smoke.cjs` from the project root.
On Windows set `EVENTGEAR_PYTHON=python` if `python3` is unavailable.

## Optional web preview

Web SQLite needs a secure context and cross-origin isolation. The local server
supplies those headers and SPA fallback:

```bash
npx expo export --platform web --output-dir dist-web
python scripts/serve_web.py
```

Open `http://localhost:8765`. Use one tab at a time for the SQLite file.
This server is a local development preview.

## APK submission

**No APK has been generated here.** This workspace has no configured Android
SDK/Gradle build toolchain or authenticated Expo project. The Android export
is a JavaScript bundle, **not an installable APK**.

`eas.json` contains an internal preview profile with `android.buildType: "apk"`,
following https://docs.expo.dev/build-reference/apk/ . On your computer run:

```bash
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform android --profile preview
```

Use your team's Expo account/project when prompted. Allow EAS to generate/manage
Android signing credentials. Download the resulting APK from its build page,
install on a real Android phone, and follow `docs/DEMO_GUIDE.md` before submitting.

Alternatively, install Android Studio and its SDK, run
`npx expo prebuild --platform android`, open the generated Android project,
and build a debug APK. In its `android` folder use `gradlew.bat assembleDebug`
on Windows or `./gradlew assembleDebug` on macOS/Linux. The usual output is
`android/app/build/outputs/apk/debug/app-debug.apk`. Keep signing secrets out of Git.

## Documentation and remaining submission steps

1. Add the **actual team member names**; they were not supplied. The PDF marks
   this field as awaiting team details.
2. Build/test the **installable APK**, as above.
3. Push this source to your team's **GitHub repository** and submit its real URL;
   no team repository URL/account was supplied.
4. Submit APK, repository link, and `docs/EventGear_Documentation.pdf` through
   Google Classroom.

The PDF contains title, description, major-screen screenshots, database
structure, stack, architecture, verification, run/build instructions and demo.
The detailed PDF mapping is in `docs/REQUIREMENTS_CHECKLIST.md`.

To regenerate after adding team names, install `reportlab` and `pillow`, set
`EVENTGEAR_TEAM_MEMBERS` to the actual names, then run
`python scripts/generate_docs.py`. In PowerShell, set the variable with
`$env:EVENTGEAR_TEAM_MEMBERS="Name 1; Name 2"`.

## Scope

This is a working local course app. Clearing/uninstalling app data removes
local records. There is no secure sign-in, hosted multi-device synchronization,
real payment gateway or push service; these are not required by the supplied
CS15L PDF. A production marketplace would need those separate services.
