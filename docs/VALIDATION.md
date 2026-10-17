# Validation results - October 13, 2026

## Automated and build checks

- ESLint (`npm run lint -- --no-cache`): passed, no lint findings.
- Automated tests (`npm test`): **15 passed, 0 failed**.
- Compiler/config check (`npm run typecheck`): passed. JavaScript `checkJs`
  is disabled; this is not a full static type-safety test.
- Expo SDK package compatibility: aligned with installed SDK 57 requirements.
  The offline compatibility check passed; remote check encountered a proxy timeout.
- Android export: passed, including Hermes bytecode and assets.
- Web export: passed, including SQLite WASM worker and assets.

## SQLite regression coverage

Schema initialization and foreign keys; valid/invalid calendar dates and
inclusive days; equipment CRUD; invalid numeric input; authoritative booking
prices/totals/items; persisted cart clearing; audit creation; invalid/past/empty/
duplicate/stale bookings with no partial writes; concurrent overbooking rejection;
peak daily availability and inclusive boundaries; customer detail updates;
allowed status transitions; cancellation releasing stock; historical equipment
archiving with valid receipts; administrator user CRUD and protected demo
accounts; completed rental reports; deliberately empty catalog preservation;
and browser database locks.

Tests use the application's actual database functions/SQL with Node's SQLite,
not a fake database implementation. The adapter translates async method names.
Native expo-sqlite installation behavior is checked only by export compilation.

## Running-browser checks

Chromium exercised the exported app at **390 x 844**, **320 x 740** and
**1280 x 900**. These workflows passed with no browser runtime errors:

- Customer catalog/detail -> add-to-cart success dialog -> cart.
- Cart persists after browser reload.
- Booking form -> availability -> checkout -> method demo -> reservation saved.
- Rental history/detail -> pending customer contact edit and save confirmation.
- Supplier dashboard -> create listing -> saved catalog -> delete confirmation.
- Supplier booking review -> confirm status -> success feedback.
- Administrator overview -> user create -> saved user -> reports and audit.

Screen captures are stored in `docs/screenshots`. They show the real exported
application with local demonstration records. They are not design mockups.

## Remaining verification

An installable APK was not generated; the environment lacks a configured
Android SDK/Gradle toolchain and authenticated Expo build project. No native
Android emulator/device was available. Build an APK using the provided EAS
profile or Android Studio, install it on a real phone, and repeat the demo
including create/edit/delete, restart persistence and confirmation dialogs.

Team names and a real team GitHub URL must be supplied before submission.
