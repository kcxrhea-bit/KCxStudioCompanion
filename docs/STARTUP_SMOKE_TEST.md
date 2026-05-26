# Startup Smoke Test

**Audit date**: 2026-05-26  
**Result**: PASS with manual verification caveats

## Evidence Used

- Code inspection of `src/main/main.ts`, `src/main/release.ts`, `src/preload/preload.ts`.
- Automated `npm run build` and `npm run dist`.
- ASAR inspection confirming main, preload, renderer, and assets are packaged.
- Brief packaged process launch from automation was attempted but not considered a full visual startup test because the app exited in the non-interactive launcher context.

## Startup Scenarios

| Scenario | Status | Evidence / notes |
|---|---:|---|
| Clean first launch | PASS by code inspection | `ensureUserDataReady()` creates `userData` and `logs`; `loadState()` returns defaults when state file is missing. |
| Existing saved state | PASS by code inspection | `loadState()` reads `kcx-studio-companion-state.json` and normalizes state. |
| Empty state file | PASS with recovery | JSON parse failure is caught; backup is attempted; default state is used if needed. |
| Malformed/corrupted JSON | PASS with recovery | `loadState()` wraps parse in try/catch, logs diagnostics, attempts `.bak`, shows safe warning dialog, returns default. |
| Missing state fields | PASS | `normalizeState()` merges defaults and repairs arrays/settings/license/release settings. |
| Old schema/version state | PARTIAL | Missing fields are normalized, but there is no explicit schema version or migration registry. |
| Rapid restart | NOT DIRECTLY TESTED | Needs interactive launch/close loop. Save path uses temp write + rename, reducing corruption risk. |
| Launch after interrupted save | PARTIAL | `.tmp` atomic rename and `.bak` exist; no explicit `.tmp` recovery path was found. |

## IPC Startup Safety

| Check | Status | Notes |
|---|---:|---|
| Preload bridge available | PASS by code inspection | `contextBridge.exposeInMainWorld("kcxApi", ...)` exposes required methods. |
| Context isolation | PASS | `contextIsolation: true`. |
| Node integration disabled | PASS | `nodeIntegration: false`. |
| Main to renderer communication | PASS by tests/build | Build-output listener registered and removable. |
| Renderer load paths | PASS | Dev loads `VITE_DEV_SERVER_URL`; production loads packaged `dist/renderer/index.html`. |

## Production Path Behavior

No hardcoded development workspace path was found in `src` or `dist`. `PROJECT_MAP.md` intentionally contains the audit path.

Packaged ASAR contains:

- `\dist\main\main\main.js`
- `\dist\main\preload\preload.js`
- `\dist\renderer\index.html`
- renderer assets, including the KCx dashboard background

## Performance Baselines

Not directly tested in this CLI session:

- Cold start time under 3 seconds
- Initial RAM under 200 MB
- Idle CPU under 5 percent
- 60 FPS rendering

Reason: these require interactive Windows desktop observation or a VM/app automation harness. They should be part of beta tester checklist.

## Findings

| Severity | Finding | Release impact |
|---|---|---|
| MEDIUM | No explicit schema version or migration table. | Acceptable for private beta; add before public beta. |
| LOW | No explicit `.tmp` recovery if temp file remains after interrupted save. | Low risk because `.bak` exists; improve in beta.2. |
| INFO | Packaged launch could not be visually confirmed from this automation context. | Manual launch verification required before distribution. |

## Verdict

Startup architecture is defensively designed and acceptable for private beta with a manual packaged-app launch pass. Public beta should add schema versioning and an explicit startup/recovery test harness.

