# KCx Studio Companion - Documentation Consolidation Script

Write-Host "=== Documentation Consolidation ===" -ForegroundColor Cyan

# 1. Backup originals
Write-Host "`n[1/4] Backing up original root docs..." -ForegroundColor Yellow
$backupDir = "docs/archive-originals"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

if (Test-Path "INSTALL_GUIDE.md") {
    if (-not (Test-Path "$backupDir/INSTALL_GUIDE.md.original")) {
        Copy-Item "INSTALL_GUIDE.md" "$backupDir/INSTALL_GUIDE.md.original"
        Write-Host "  INSTALL_GUIDE.md original archived" -ForegroundColor Green
    } else {
        Write-Host "  INSTALL_GUIDE.md original already archived; preserving existing backup" -ForegroundColor Green
    }
}

if (Test-Path "KNOWN_LIMITATIONS.md") {
    if (-not (Test-Path "$backupDir/KNOWN_LIMITATIONS.md.original")) {
        Copy-Item "KNOWN_LIMITATIONS.md" "$backupDir/KNOWN_LIMITATIONS.md.original"
        Write-Host "  KNOWN_LIMITATIONS.md original archived" -ForegroundColor Green
    } else {
        Write-Host "  KNOWN_LIMITATIONS.md original already archived; preserving existing backup" -ForegroundColor Green
    }
}

Write-Host "Originals available at $backupDir" -ForegroundColor Green

# 2. Create merged INSTALL_GUIDE.md
Write-Host "`n[2/4] Creating merged INSTALL_GUIDE.md..." -ForegroundColor Yellow
@"
# Installation Guide

## System Requirements

- **OS**: Windows 10 or Windows 11, 64-bit
- **RAM**: 4 GB minimum, 8 GB recommended
- **Disk**: About 500 MB for the app plus local state/log data
- **Optional**: Ollama for local model experiments
- **Optional**: API keys for cloud providers if you choose to configure them

## Installation Methods

### Method 1: Windows Installer

1. Download ``KCx Studio Companion-0.9.0-beta.1-win-x64-Setup.exe``.
2. Run the installer.
3. Windows may show an unknown publisher or SmartScreen warning because beta.1 is unsigned.
   - Click **More info**
   - Click **Run anyway** if you trust the beta source
4. Choose an installation directory if prompted.
5. Launch from the desktop shortcut or Start Menu.

### Method 2: Portable EXE

1. Download ``KCx Studio Companion-0.9.0-beta.1-win-x64-Portable.exe``.
2. Place it in a folder you control.
3. Run it directly (same SmartScreen warning may appear).

## First Launch

On first launch the app creates its Electron userData folder and local diagnostics folder.

**Windows data path**:
%APPDATA%\kcx-studio-companion\

**Important local files**:
- ``kcx-studio-companion-state.json`` (project data, prompts, settings)
- ``kcx-studio-companion-state.json.bak`` (automatic backup)
- ``logs\runtime.log`` (diagnostics)

## Troubleshooting

### Windows Protected Your PC

This is expected for unsigned beta builds.

1. Click **More info**.
2. Click **Run anyway** if you trust the beta source.

### App State Seems Broken

The app attempts backup recovery automatically. For manual reset, close the app and rename this file:
%APPDATA%\kcx-studio-companion\kcx-studio-companion-state.json

Rename it to ``.json.old`` instead of deleting it - you can restore it if needed.

### App Will Not Launch

1. Check Task Manager for existing "KCx Studio Companion" processes.
2. End any orphaned processes.
3. Try the portable EXE or unpacked build.
4. Check ``logs\runtime.log`` under your userData folder.

## Uninstall

- **Installer**: Uninstall through Windows Settings -> Apps.
- **Portable**: Delete the portable EXE.
- **App data**: Remains in ``%APPDATA%\kcx-studio-companion\`` unless manually deleted.
"@ | Set-Content "INSTALL_GUIDE.md" -NoNewline
Write-Host "INSTALL_GUIDE.md merged" -ForegroundColor Green

# 3. Create merged KNOWN_LIMITATIONS.md
Write-Host "`n[3/4] Creating merged KNOWN_LIMITATIONS.md..." -ForegroundColor Yellow
@"
# Known Limitations - Beta v0.9

## Platform Support

- **Supported**: Windows 10/11 x64
- **Not yet supported**: macOS, Linux, Windows 7/8

## Installation & Packaging

- Beta builds are **unsigned** - Windows SmartScreen warnings are expected
- No auto-update yet (manual download required for future versions)
- Installer may show "Unknown publisher" warning - click "More info" -> "Run anyway"

## Build Analysis

**Well-supported**:
- Gradle, Kotlin, Room/KSP, Compose, Android Manifest
- npm/Vite/Electron, TypeScript

**Not yet supported**:
- Xcode, Rust/Cargo, Make/C/C++, Maven, custom build output

## Project Scanning

- Scanner excludes: ``node_modules``, ``.git``, ``dist``, ``build``, ``out``
- **Not yet excluded**: ``.gradle``, ``.idea``, ``coverage``, ``release``, ``bin``, ``obj``, ``.env``, secret files
- Very large projects may experience slow scans (synchronous main-process operation)
- No realtime file watcher yet

## Command Execution

- Commands queue for approval before execution
- Dangerous commands (rm, del, format, shell interpreters) are blocked
- Command runner uses ``shell: true`` - sandbox execution planned for beta.2
- Stop/cancel button not fully wired yet

## Provider Routing

- Cloud providers are **disabled by default** and optional
- API keys stored in local state if entered (**not keychain-backed yet**)
- Prompt sending to cloud providers is manual/copy-based (not automated)

## UI & Accessibility

- Grid Zero theme is the current primary interface
- Focus states and modal focus trapping need accessibility audit
- Animation-heavy screens should be tested on low-end hardware

## Security

- App runs commands with user privileges after approval
- No sandbox/container execution yet
- Electron/electron-builder dependency advisories require upgrade before public release

## What We Are NOT Claiming

- Not autonomous coding or AGI
- Not 100% parser accuracy
- Not enterprise-ready (no SSO, collaboration, cloud sync)
- Not a replacement for source control, CI, or your IDE
"@ | Set-Content "KNOWN_LIMITATIONS.md" -NoNewline
Write-Host "KNOWN_LIMITATIONS.md merged" -ForegroundColor Green

# 4. Update RELEASE_NOTES.md with Grid Zero mention
Write-Host "`n[4/4] Adding Grid Zero rename to RELEASE_NOTES.md..." -ForegroundColor Yellow
$releaseNotes = Get-Content "RELEASE_NOTES.md" -Raw
if ($releaseNotes -notmatch "Grid Zero") {
    $releaseNotes = $releaseNotes.TrimEnd() + "`n- **Theme**: Renamed from `"Tron Legacy`" to `"Grid Zero`" for copyright safety.`n"
    Set-Content "RELEASE_NOTES.md" $releaseNotes -NoNewline
    Write-Host "RELEASE_NOTES.md updated" -ForegroundColor Green
} else {
    Write-Host "Grid Zero already mentioned in RELEASE_NOTES.md" -ForegroundColor Green
}

Write-Host "`n=== Consolidation Complete ===" -ForegroundColor Cyan
Write-Host "Root docs now ship-ready for beta testers." -ForegroundColor Green
Write-Host "Original files backed up to: $backupDir" -ForegroundColor Yellow
