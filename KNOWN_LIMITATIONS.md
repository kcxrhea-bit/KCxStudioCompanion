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

- Scanner excludes: `node_modules`, `.git`, `dist`, `build`, `out`
- **Not yet excluded**: `.gradle`, `.idea`, `coverage`, `release`, `bin`, `obj`, `.env`, secret files
- Very large projects may experience slow scans (synchronous main-process operation)
- No realtime file watcher yet

## Command Execution

- Commands queue for approval before execution
- Dangerous commands (rm, del, format, shell interpreters) are blocked
- Command runner uses `shell: true` - sandbox execution planned for beta.2
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