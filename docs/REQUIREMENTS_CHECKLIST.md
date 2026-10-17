# CS15L requirement mapping

| PDF requirement | Implementation / evidence | Status |
| --- | --- | --- |
| Unique logo and branding | Custom calendar/EG icon; launcher and role screen; navy/teal theme | Implemented |
| Four+ screens with dashboard | Three role dashboards; catalog, cart, booking, checkout, rentals, users and reports | Implemented |
| React Navigation | Expo Router uses React Navigation; Stack + nested role Tabs | Implemented |
| Meaningful input transaction | Dates/contact/notes/quantities; reservation + items commit to SQLite and appear in history | Implemented |
| SQLite or backend | expo-sqlite, foreign keys, indexes, persisted eventgear.db | Implemented |
| CREATE | Equipment/user create and reservation insert | Implemented |
| READ | Catalog, history/details, users and reports | Implemented |
| UPDATE | Equipment, user, pending booking contact/note, booking status | Implemented |
| DELETE | Physical removal of unreferenced listings/users; archive historical equipment | Implemented |
| Modern responsive UI | Shared UI, branding, dialogs, validation, loading/empty/error states, phone/tablet layouts | Implemented; native phone review pending |
| RN components/hooks/props/events/forms/lists/state | Functional components, hooks, controlled fields, FlatList, Context | Implemented |
| Logical structure and comments | Routes/screens/components/database separation; explanatory comments | Implemented |
| Pitch/demo/discussion/Q&A | docs/DEMO_GUIDE.md | Prepared; team presents live |
| Installable APK | eas.json APK build profile + README build instructions | Build and real-device install pending |
| GitHub link and complete source | Source/config/assets/database/tests/README ready to push | Actual team repository URL pending |
| Short documentation PDF | docs/EventGear_Documentation.pdf | Prepared |
| Title/description/stack/database structure | Documentation PDF | Included |
| Major-screen screenshots | Actual running web-app captures; PNGs + PDF | Included |
| Team members | Regenerate PDF with EVENTGEAR_TEAM_MEMBERS | Actual names pending |

## Changes from the partial app

Enabled Administrator; added overview, user-directory CRUD, reports and audit.
Added SQLite carts, customer edit/cancel, cross-platform confirmations, strict
calendar/numeric validation, stock-safe transactions, protected deletion and
valid status transitions. Replaced default Expo logo, aligned dependencies,
and added regression tests, documentation and APK build configuration.

## Remaining submission actions

Enter team names; build and install the APK; verify on Android; push to the
team's GitHub repository; submit the APK, real repository link and PDF through
Google Classroom. APK/repository/team details are not fabricated in this delivery.
