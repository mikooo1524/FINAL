# Customer accounts

## Use

1. Open the welcome screen. A fresh database first requires **Set up UserDemo** to create its owner.
2. After owner setup, select **Create an account** for a new customer or **Sign in** for an existing account.
3. Enter your full name, contact number, email, password and password confirmation.
4. Creating an account signs you in and opens the customer dashboard.
5. Use **Sign out** on that dashboard to end the session. Existing customers can use email and password to sign back in.
6. Open **Administrator → Users** to view the new customer's name, contact, email and registration date. Their bookings also show their name under admin and supplier reservations.

Passwords must be 8–128 characters. Email matching is case-insensitive, and duplicate emails are rejected. The profile is stored in users; credentials are stored separately in customer_credentials. Admin user lists and sign-in results never include the password hash. Admin-created contact records do not acquire sign-in credentials automatically.

Each account has its own persisted cart and rental history. Customers can view/edit/cancel only their own rentals through the customer UI and its database calls. Booking contact information is initially filled from the signed-in account. Admin/supplier management screens continue to read the bookings they manage. Administrators can assign a registered account a Customer, Supplier, or Admin role through Admin Users. Only UserDemo can switch among all demo roles.

## Storage and scope

This feature uses the project's local SQLite database. Accounts and records are available only in the same app installation/browser storage; there is no remote account synchronization, email verification, password recovery, or server authentication. Management routes require a signed-in account with the assigned role or UserDemo owner access. Local application guards do not provide server-side authorization.

Sessions are kept in memory: reloading/restarting requires signing in again. Account records and per-account carts persist. Existing equipment and reservations are preserved. The old shared cart is migrated to legacy demo customer #1, rather than being exposed to newly registered customers.

New password records use asynchronous [bcryptjs](https://github.com/dcodeIO/bcrypt.js/) at cost 10 with a random 16-byte salt from expo-crypto. Salt-keyed HMAC-SHA256, encoded as hex before bcrypt, preserves the entire password beyond bcrypt's 72-byte input limit. Cost 10 meets the bcrypt minimum in [OWASP password-storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#bcrypt). Plaintext passwords are not written to the database or audit log.

Existing PBKDF2-HMAC-SHA256 records retain their original 600,000-iteration verification. Web Crypto accelerates that verification when available; Expo Go uses the existing noble-hashes fallback. After successful verification, an old record is replaced with the new format. An incorrect password never changes the stored record. The first sign-in for an old account on a phone may therefore still be slow; subsequent sign-ins use bcrypt.

## Validation

- All 38 password/database/browser-lock tests pass, including invalid registration, duplicate emails, password checks, long Unicode passwords, legacy password migration, account isolation, scoped rental edits/cancellation, credential deletion and legacy-cart migration.
- Production web export passed.
- Android export with Hermes bytecode passed; no native-device installation was performed.
- An earlier headless Chromium workflow verified the original customer-authentication flow. Its script now needs updating for UserDemo setup, assigned roles, and the sign-out confirmation; it was not rerun as part of the password-performance change.

A desktop Node benchmark measured the previous JavaScript PBKDF2 path at approximately 1,660 ms and new bcrypt hashing at 87 ms (19× faster); verification took 80 ms. These are desktop measurements, not phone timing guarantees.

To run that workflow locally:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) 'node_modules/.cache/playwright'
npx playwright install chromium
npx expo export --platform web --output-dir dist-test/customer-auth
npm run test:auth-ui
```

It starts an isolated local test server and uses a fresh browser context; it does not create accounts in your running app's database. The older scripts/ui_smoke.cjs still contains outdated demo steps and has not been migrated to customer authentication.
