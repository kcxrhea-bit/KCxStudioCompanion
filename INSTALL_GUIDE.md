# Installation Guide

## System Requirements

- **OS**: Windows 10 or Windows 11, 64-bit
- **RAM**: 4 GB minimum, 8 GB recommended
- **Disk**: About 500 MB for the app plus local state/log data
- **Optional**: Ollama for local model experiments
- **Optional**: API keys for cloud providers if you choose to configure them

## Installation Methods

### Method 1: Windows Installer

1. Download `KCx Studio Companion-0.9.0-beta.1-win-x64-Setup.exe`.
2. Run the installer.
3. Windows may show an unknown publisher or SmartScreen warning because beta.1 is unsigned.
   - Click **More info**
   - Click **Run anyway** if you trust the beta source
4. Choose an installation directory if prompted.
5. Launch from the desktop shortcut or Start Menu.

### Method 2: Portable EXE

1. Download `KCx Studio Companion-0.9.0-beta.1-win-x64-Portable.exe`.
2. Place it in a folder you control.
3. Run it directly (same SmartScreen warning may appear).

## First Launch

On first launch the app creates its Electron userData folder and local diagnostics folder.

**Windows data path**:
%APPDATA%\kcx-studio-companion\

**Important local files**:
- `kcx-studio-companion-state.json` (project data, prompts, settings)
- `kcx-studio-companion-state.json.bak` (automatic backup)
- `logs\runtime.log` (diagnostics)

## Troubleshooting

### Windows Protected Your PC

This is expected for unsigned beta builds.

1. Click **More info**.
2. Click **Run anyway** if you trust the beta source.

### App State Seems Broken

The app attempts backup recovery automatically. For manual reset, close the app and rename this file:
%APPDATA%\kcx-studio-companion\kcx-studio-companion-state.json

Rename it to `.json.old` instead of deleting it - you can restore it if needed.

### App Will Not Launch

1. Check Task Manager for existing "KCx Studio Companion" processes.
2. End any orphaned processes.
3. Try the portable EXE or unpacked build.
4. Check `logs\runtime.log` under your userData folder.

## Uninstall

- **Installer**: Uninstall through Windows Settings -> Apps.
- **Portable**: Delete the portable EXE.
- **App data**: Remains in `%APPDATA%\kcx-studio-companion\` unless manually deleted.