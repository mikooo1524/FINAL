# Undo unused-code cleanup

Run restore.ps1 with PowerShell to restore the exact pre-cleanup contents of all 37 changed files. The script verifies backup checksums and workspace paths first. It overwrites those files, including any edits made to them after this cleanup. Your app database, dependencies and assets are not changed.
