# Known Limitations - Beta v0.9

## Platform

Supported:

- Windows 10 x64
- Windows 11 x64

Not supported yet:

- macOS
- Linux
- Windows 7/8

## Packaging

- Beta.1 builds are unsigned.
- Windows SmartScreen/unknown publisher warnings are expected.
- No auto-update yet.
- Manual installer/portable distribution only.

## Build Analysis

Supported best:

- Gradle
- Kotlin unresolved references
- Room/KSP hints
- Compose hints
- Android manifest hints
- npm/Vite/Electron hints
- TypeScript diagnostics

Not yet supported:

- Xcode
- Rust/Cargo
- Make/C/C++
- Maven
- Custom non-standard build output

## Project Scanning

- Scanner is synchronous in the main process.
- Very large projects may take time.
- Current exclusions are useful but incomplete.
- Secret-like files are not explicitly excluded yet.
- No realtime file watcher yet.

## Command Execution

- Commands are now queued for approval from the Build Logs workflow.
- Dangerous commands are blocked by a validator.
- The runner still uses `shell: true`; this is a beta.2 hardening target.
- Stop/cancel is not fully wired for running commands.

## Provider Routing

- Cloud providers are optional and disabled by default.
- Prompt sending to cloud providers is not fully automated in beta.1.
- API keys are stored in local state if entered; keychain storage is not implemented yet.

## UI and Accessibility

- Dark cinematic theme is the current primary UI.
- Focus states and modal focus trapping need a full accessibility pass.
- Animation-heavy screens should be tested on low-end hardware.

## Security

- App runs local commands with the user's privileges after approval.
- No sandbox/container execution yet.
- Electron/electron-builder dependency advisories require a planned upgrade before public beta.

## What We Are Not Claiming

- Not autonomous coding.
- Not AGI.
- Not 100 percent parser accuracy.
- Not enterprise-ready.
- Not a replacement for source control, CI, or an IDE.

