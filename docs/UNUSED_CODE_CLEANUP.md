# Unused-code cleanup

Completed October 17, 2026 (Asia/Taipei).

Removed 31 redundant default React imports, four unused styles, `colors.warning`, the unread `stats.pending` query result, the uncalled navigation `push()` helper and four uncalled direct navigation aliases, and the unused Python `ImageReader` import.

Named React imports and `React.Component` in DatabaseGate.js were preserved. Dependencies, assets, saved application data, audit logging, and UI layouts were not changed. Dependency candidates and configuration-only compatibility branches remain available for separate review. UNUSED_CODE_SCAN.md describes the pre-cleanup scan and is retained as a historical report.

## Validation

- 27 database and browser-lock tests passed.
- ESLint for `src` and `scripts` passed.
- Existing TypeScript configuration check passed.
- Production web export passed: 882 modules bundled into `dist-cleanup-check`.
- All 37 original file backups passed SHA-256 verification; the PowerShell restore script passed syntax validation.
- Interactive visual checks and native-device tests were not performed.

The previously identified CommonJS lint-environment issue in `tests/webDatabaseLock.test.cjs` remains outside this cleanup. Tests run successfully with Node.

## Undo

The exact pre-cleanup contents of all 37 changed files are stored under:

`.cleanup-backups/unused-code-2026-10-17T01-53-59-587Z`

From the project directory containing package.json, run in PowerShell:

```powershell
& '.\.cleanup-backups\unused-code-2026-10-17T01-53-59-587Z\restore.ps1'
```

The script checks backup hashes and destination paths before restoring. It overwrites the 37 files with their saved versions, including any changes made to those files after this cleanup. It does not change the application database or dependencies.
