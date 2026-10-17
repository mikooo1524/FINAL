# Unused-code scan

Date: October 17, 2026 (Asia/Taipei)

This is a static audit of the current source, routes, configuration, assets, tests, documentation and scripts. No application code, assets or dependencies were removed. This report is the only file added by the scan.

## Scope and method

- 39 JavaScript source files, including 24 Expo Router route/layout files.
- TypeScript compiler diagnostics with unused locals/parameters enabled for this scan, without changing tsconfig.json.
- AST-based stylesheet reference analysis, including dynamically selected status-pill styles.
- Import/re-export/require reachability from every Expo Router route and layout.
- Source and configuration references to assets, theme properties and navigation helpers.
- Installed package dependencies and peer dependencies, plus Expo Router's installed source.
- ESLint for source, scripts and tests; database tests and the existing typecheck.
- A Babel probe confirmed that the current Expo preset uses the automatic JSX runtime.

No entire source file was orphaned: all 39 were reachable. No named exported function was found with no source/test references. These results do not prove every runtime branch executes on every platform. Dependencies were not uninstalled, no native/web bundle was rebuilt, and browser interaction coverage was not measured. Python script imports were inspected by reference; Python is unavailable in this environment.

## Confirmed unused pieces

| Location | Item | Evidence |
| --- | --- | --- |
| src/RoleSelectionScreen.js:73 | brandIcon style | No style reference. |
| src/RoleSelectionScreen.js:74 | brandEmoji style | No style reference. |
| src/RoleSelectionScreen.js:75 | caseEmoji style | No style reference. |
| src/customerScreens.js:513 | center style | No style reference. |
| src/theme.js:12 | colors.warning | No colour reference in source/configuration/scripts/tests. |
| src/database.js:440 | stats.pending | Returned by getAdminOverview but no consumer reads it. The visible card uses todayStats.pending instead. |
| src/navigationCompat.js:61 | compat.push() | No current caller; this is separate from ordinary array.push() calls. |
| scripts/generate_docs.py:14 | ImageReader import | Imported but never referenced. |

There are also 31 redundant default React imports. JSX uses the automatic runtime; named hooks still need their imports. Keep the React import in DatabaseGate.js because it uses React.Component. The exact redundant import locations appear below.

## Unreferenced assets

The following files have no references in the app, app.json, scripts, tests, README or Markdown documentation:

- assets/android-icon-monochrome.png
- assets/eventgear-logo.svg
- assets/splash-icon.png

The configured icon.png, favicon.png, Android foreground/background icons and all six equipment photos are used. Do not remove those as part of this cleanup. Documentation screenshots are used by the PDF generator and are not app-runtime assets.

## Currently uncalled navigation branches

In src/navigationCompat.js, direct aliases Home (line 9), Cart (line 11), My Rentals (line 12), and Dashboard (line 13) have no current call sites. Current callers use grouped CustomerTabs/SupplierTabs routes or other aliases. The CustomerTabs Equipment child branch and SupplierTabs Reservations/Manage Equipment child branches also have no current parameterized callers. These can be simplified for the current app, but retain them if the compatibility API is intended to support future callers.

## Dependency cleanup candidates: verify builds before removal

These three direct dependencies have no app/config import. The installed Expo Router uses its bundled navigation implementation, and the installed-package scan found no consumers of the first two:

- @react-navigation/bottom-tabs
- @react-navigation/native-stack
- @react-navigation/native: current installed consumers are the above navigation packages and @react-navigation/elements. Treat this as cleanup of the whole unused navigation dependency group, not an isolated uninstall.

These are candidates rather than an assertion that uninstalling them has been validated. No package was removed. Other packages without direct imports have Expo, web, native, peer-dependency or tooling roles: expo, expo-constants, expo-linking, react-dom, react-native-web, react-native-screens, react-native-gesture-handler, react-native-reanimated and react-native-worklets. Do not classify them as unused solely from application import counts. Development dependencies support linting, JSX types or typechecking.

## Code still executing, but with no visible feature

The audit_log table and audit() writes are active. The app still writes audit entries during equipment, booking and user mutations, and tests inspect them. Recent activity was removed, so there is no production screen that reads these records. This is retained logging functionality, not unreachable code. Removing it is a product/data-retention choice, not a safe automatic dead-code deletion.

## Configuration-only inactive branches

All three entries in RoleSelectionScreen.js currently have active: true. Therefore the disabled-role styling, disabled button path and Soon label do not execute with the current data. The roleCardDisabled style is referenced and would become used if a role were disabled. Keep or simplify the entire optional-role feature deliberately; it is not an unreferenced style.

## Outdated maintenance code, not unused code

scripts/ui_smoke.cjs is documented as a manual test, but it has drifted from the app:

- Line 28 fills all visible inputs as though only Contact exists; date inputs were added.
- Lines 30?31 expect Equipment catalog and + Add, which were removed/renamed.
- Lines 41?42 expect suppliers to update booking status, which is now admin-only.
- Line 50 expects Recent activity, which was removed.
- It imports playwright, which is not declared in package.json. This optional test requires a separately provisioned test environment.

README.md and scripts/generate_docs.py still describe supplier status updates, recent activity/audit reports, and cancelling/rebooking to change dates. Those descriptions are outdated. docs/VALIDATION.md records an older 15-test run and should be treated as a historical result, not current proof. serve_web.py, generate_docs.py and ui_smoke.cjs are referenced manual tools; they are not orphaned merely because the app does not import them.

## Validation

- Source ESLint passed during the full source/scripts/tests run; the combined run reports one pre-existing configuration error: tests/webDatabaseLock.test.cjs:7 uses CommonJS __dirname, which the ESLint environment does not declare.
- This __dirname finding is not unused code; Node provides it when running that CommonJS test.
- Current database/lock test and typecheck results are reported with this scan in the chat.

## Redundant default React imports

Remove only the default React binding; preserve named hooks and components.

- src/AppContext.js:1 (or the React import at the top of that file)
- src/OverviewIcon.js:1 (or the React import at the top of that file)
- src/RoleSelectionScreen.js:1 (or the React import at the top of that file)
- src/adminScreens.js:1 (or the React import at the top of that file)
- src/app/(admin)/_layout.js:1 (or the React import at the top of that file)
- src/app/(admin)/equipment.js:1 (or the React import at the top of that file)
- src/app/(admin)/index.js:1 (or the React import at the top of that file)
- src/app/(admin)/reports.js:1 (or the React import at the top of that file)
- src/app/(admin)/reservations.js:1 (or the React import at the top of that file)
- src/app/(admin)/users.js:1 (or the React import at the top of that file)
- src/app/(customer)/_layout.js:1 (or the React import at the top of that file)
- src/app/(customer)/cart.js:1 (or the React import at the top of that file)
- src/app/(customer)/equipment.js:1 (or the React import at the top of that file)
- src/app/(customer)/index.js:1 (or the React import at the top of that file)
- src/app/(customer)/my-rentals.js:1 (or the React import at the top of that file)
- src/app/(supplier)/_layout.js:1 (or the React import at the top of that file)
- src/app/(supplier)/index.js:1 (or the React import at the top of that file)
- src/app/(supplier)/manage-equipment.js:1 (or the React import at the top of that file)
- src/app/(supplier)/reservations.js:1 (or the React import at the top of that file)
- src/app/_layout.js:1 (or the React import at the top of that file)
- src/app/booking.js:1 (or the React import at the top of that file)
- src/app/checkout.js:1 (or the React import at the top of that file)
- src/app/equipment-details.js:1 (or the React import at the top of that file)
- src/app/equipment-form.js:1 (or the React import at the top of that file)
- src/app/index.js:1 (or the React import at the top of that file)
- src/app/payment.js:1 (or the React import at the top of that file)
- src/app/rental-details.js:1 (or the React import at the top of that file)
- src/components.js:1 (or the React import at the top of that file)
- src/customerScreens.js:1 (or the React import at the top of that file)
- src/feedback.js:1 (or the React import at the top of that file)
- src/supplierScreens.js:1 (or the React import at the top of that file)
