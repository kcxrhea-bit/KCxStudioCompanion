# Installation Guide

## System Requirements

- **OS**: Windows 10 or Windows 11, 64-bit
- **RAM**: 4 GB minimum, 8 GB recommended
- **Disk**: About 500 MB for the app plus local state/log data
- **Optional**: Ollama for local model experiments
- **Optional**: API keys for cloud providers if you choose to configure them

## Installation Methods

### Method 1: NSIS Installer

1. Download `KCx Studio Companion-0.9.0-beta.1-win-x64-Setup.exe`.
2. Run the installer.
3. Windows may show an unknown publisher or SmartScreen warning because beta.1 is unsigned.
4. Choose an installation directory if prompted.
5. Launch from the desktop shortcut or Start Menu.

### Method 2: Portable EXE

1. Download `KCx Studio Companion-0.9.0-beta.1-win-x64-Portable.exe`.
2. Place it in a folder you control.
3. Run it directly.

## First Launch

On first launch the app creates its Electron userData folder and local diagnostics folder.

Observed Windows data path format:

`%APPDATA%\kcx-studio-companion\`

Important local files:

- `kcx-studio-companion-state.json`
- `kcx-studio-companion-state.json.bak`
- `logs\runtime.log`

## Troubleshooting

### Windows Protected Your PC

This is expected for unsigned beta builds.

1. Click **More info**.
2. Click **Run anyway** if you trust the beta source.

### App State Seems Broken

The app attempts backup recovery automatically. For manual reset, close the app and move this file out of the userData folder:

`kcx-studio-companion-state.json`

Do not delete it if you need project memory or prompt history.

### App Will Not Launch

1. Check Task Manager for existing KCx Studio Companion processes.
2. End orphaned processes.
3. Try the unpacked build or portable EXE.
4. Check `logs\runtime.log` under userData.

## Uninstall

- Installer: uninstall through Windows Settings.
- Portable: delete the portable EXE.
- Local app data remains unless you manually delete `%APPDATA%\kcx-studio-companion\`.

