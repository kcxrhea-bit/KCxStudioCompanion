# Local-First Privacy Audit

**Audit date**: 2026-05-26  
**Result**: PASS for local-first defaults, HIGH caveat for API key storage

## Storage Locations

| Data | Location | Notes |
|---|---|---|
| Project records | Electron userData `kcx-studio-companion-state.json` | Stores project names, paths, type, memory, snapshots. |
| Prompt approvals/chains | Same state file | Prompt content and statuses are local. |
| Build logs/history | Same state file | Build logs can contain sensitive paths/secrets if pasted by user. |
| Provider settings | Same state file | Includes provider base URLs, model names, enabled flags, and API keys if entered. |
| API keys/secrets | Same state file | Not encrypted or keychain-backed in current beta. |
| Diagnostics | `userData\logs\runtime.log` | Local file only. |
| Theme preference | Browser localStorage | `kcx-studio-theme`. |
| Project files | Original project folders | Files are scanned/read for metadata; not copied wholesale. |

Observed Windows userData folder name during audit:

- `%APPDATA%\kcx-studio-companion\`

## Privacy Truth Table

| Data Type | Stored Locally | Sent to Cloud | User Control |
|---|---:|---:|---|
| Project files | Yes, only metadata/snapshot in state | No automatic upload | User chooses project folder |
| Build logs | Yes | No automatic upload | User pastes/imports/clears |
| Prompts | Yes | Only if user copies/sends or future provider send is enabled | Human-in-the-loop |
| API keys | Yes, plaintext local state if entered | No automatic telemetry, but used for configured provider tests/future sends | User provides/removes |
| Telemetry | Yes, local runtime feed/diagnostics | No hidden telemetry found | Toggle modeled in settings |
| Crash/runtime logs | Yes, local diagnostics | No automatic upload found | User can delete files |

## Local-First Claims Validated

- No analytics SDK found.
- No hidden telemetry endpoint found.
- Cloud providers default disabled/placeholder.
- Prompt workflows are manual approval/copy-first.
- State and diagnostics are stored under Electron userData.

## Security Concerns

| Severity | Concern | Impact |
|---|---|---|
| HIGH | API keys are persisted in local JSON state if entered. | Private beta must disclose; public/paid should use OS keychain or encryption. |
| MEDIUM | Build logs/prompts may contain secrets pasted by the user. | Docs should warn users before cloud handoff. |
| MEDIUM | Scanner does not explicitly skip secret file names/extensions. | Improve scanner exclusions. |

## User-Facing Privacy Statement

KCx Studio Companion is local-first: project workflow data, build logs, prompt history, approvals, diagnostics, and settings are stored on your machine under Electron userData. The app does not include hidden analytics or automatic cloud upload behavior.

Cloud AI providers are optional. If you configure a cloud provider or manually copy a prompt into an external AI tool, the content you send may leave your machine under that provider's terms.

Beta caveat: provider API keys are currently stored in the local state file if entered. Treat the state file as sensitive and do not share it.

## Verdict

Local-first defaults are real, but security wording must be honest about plaintext local API key storage. This is acceptable for a small private beta, not for paid/public release without keychain work.

