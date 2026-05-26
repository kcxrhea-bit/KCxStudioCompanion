# KCx Studio Companion v0.9 Beta - Project Map

**Audit date**: 2026-05-25  
**Project root**: `D:\KCxProjects\KCxStudioCompanion`  
**Version**: `0.9.0-beta.1`

## Scope

This map was created from local source inspection before release-audit code changes. It covers authored source, build configuration, packaging configuration, tests, documentation, generated artifacts, and major release risks.

## Entry Points

| Layer | File | Purpose |
|---|---|---|
| Electron main | `src/main/main.ts` | Creates the BrowserWindow, owns userData persistence, registers IPC handlers, runs commands, scans projects, tests providers. |
| Release helpers | `src/main/release.ts` | Provides release metadata, diagnostics logging, userData validation, defaults for release settings and license state. |
| Preload bridge | `src/preload/preload.ts` | Exposes `window.kcxApi` with state, release info, command execution, provider tests, project scanning, and build output events. |
| Renderer entry | `src/renderer/main.tsx` | Mounts React app and imports active CSS/theme layers. |
| Main renderer shell | `src/renderer/App.tsx` | Current primary UI/workflow container for project management, build analysis, prompt chains, patch review, provider routing, telemetry, and product surfaces. |
| Renderer types | `src/renderer/types.ts` | Shared app state, project, approval, provider, telemetry, release, and command request types. |

## Core Configuration

| File | Purpose |
|---|---|
| `package.json` | Scripts, dependency versions, app metadata, electron-builder Windows NSIS/portable configuration. |
| `vite.config.ts` | Renderer Vite build to `dist/renderer`. |
| `tsconfig.json` | Renderer TypeScript config. |
| `tsconfig.main.json` | Main/preload TypeScript config to `dist/main`. |
| `tsconfig.test.json` | Test-only TypeScript config for extracted pure modules. |
| `jest.config.js` | `ts-jest` configuration with tests under `tests/`. |

## Business Logic Modules

| File | Purpose | Notes |
|---|---|---|
| `src/lib/buildAnalysis.ts` | Pure build parser, safety warning detection, protected-file detection, prompt duplicate detection, chain grouping. | Mirrors logic extracted from `App.tsx` for tests. |
| `src/lib/projectScanner.ts` | Pure project scanner used by tests. | Main process has a similar inline scanner. |
| `src/lib/patchReview.ts` | Pure patch review heuristic. | Risk labels currently `low`, `medium`, `high`; no `critical` label yet. |
| `src/lib/commandRunner.ts` | Pure command runner around `spawn`. | Uses `shell: true`; see risks. |

## Renderer Systems

| Area | File(s) | Purpose |
|---|---|---|
| UI shell/workflows | `src/renderer/App.tsx` | Navigation, dashboard, project forms, build log workflow, approval queue, patch review, settings, provider routing, docs/product surfaces. |
| Ecosystem runtime | `src/renderer/components/*Node.tsx`, `EcosystemCluster.tsx`, `EcosystemStatusPanel.tsx`, `DashboardBackground.tsx`, `EcosystemTest.tsx` | Cinematic KCx cluster, dock/status visuals, runtime state visuals. |
| Styling | `src/styles/*.css`, `src/renderer/styles/grid-zero.css`, `src/renderer/styles/app.css` | Active renderer imports come from `src/renderer/main.tsx`; `components.css` contains current shell/layout rules. |
| Assets | `src/renderer/assets/*`, `src/renderer/assets/branding/kcx-dashboard-bg.png` | Runtime images, videos, ecosystem reference art, dashboard background. |

## Storage and Persistence

| Data | Location | Implementation |
|---|---|---|
| App state | Electron `app.getPath("userData")\kcx-studio-companion-state.json` | `src/main/main.ts` `getDataPath()`, `loadState()`, `saveState()`. |
| Backup state | Same path with `.bak` suffix | Created before save when `releaseSettings.backupOnSave !== false`. |
| Temp write | Same path with `.tmp` suffix | Written then renamed for safer saves. |
| Diagnostics | Electron `userData\logs\runtime.log` | `src/main/release.ts` `appendDiagnosticLog()`. |
| Theme preference | Browser `localStorage` key `kcx-studio-theme` | `src/context/ThemeContext.tsx`. |

## State Structures

Primary state is `AppState` in `src/renderer/types.ts`.

Important substructures:

- `projects`: project metadata, path, memory, build logs, build history, patch review history, scanner snapshot.
- `approvals`: prompt and command queue items, chain fields, status timestamps.
- `timeline`: session events for prompts, builds, scans, analysis, duplicates, protected-file hits.
- `aiProviders`: local/cloud provider configs including API key field.
- `aiRoutingRules`: task-to-provider routing matrix.
- `releaseSettings`: diagnostics, telemetry, experimental flag, backup-on-save, build/update channel.
- `license`: community/trial/licensed structure with entitlements and future account fields.

## IPC Surface

| IPC | Exposed as | Risk notes |
|---|---|---|
| `state:get` | `window.kcxApi.getState()` | Reads in-memory normalized state. |
| `state:save` | `window.kcxApi.saveState(nextState)` | Normalizes and writes local JSON. |
| `app:releaseInfo` | `window.kcxApi.getReleaseInfo()` | Low risk. |
| `cmd:run` | `window.kcxApi.runCommand(request)` | Release-critical. Executes commands through main process. |
| `project:scan` | `window.kcxApi.scanProject(rootPath)` | Reads local filesystem recursively. |
| `provider:test` | `window.kcxApi.testProviderConnection(provider)` | Can perform a GET request to configured endpoint. |
| `build-output-line` | `window.kcxApi.onBuildOutputLine(callback)` | Streams command output to renderer telemetry. |

## Command Execution Boundary

Commands execute in `src/main/main.ts` and `src/lib/commandRunner.ts` with `spawn(request.command, request.args, { cwd: request.cwd, shell: true })`.

Observed controls:

- Command approval queue exists for command items.
- `Development Tools` queues `npm.cmd run build` as an approval item in dev mode.
- Build Logs tab also has a direct `RUN BUILD` path that invokes `window.kcxApi.runCommand` immediately.
- No central dangerous-command blocklist or argument validation was present at Phase 0.
- `shell: true` increases shell-injection risk if request fields are untrusted.

## Project Scanner

Current skip directories:

- `node_modules`
- `.git`
- `dist`
- `build`
- `out`

Known gaps:

- Does not skip `.gradle`, `.idea`, `coverage`, `release`, `bin`, `obj`.
- Does not explicitly skip `.env`, `.pem`, `.key`, media/binary files.
- No max file count/depth guard.
- Permission errors inside recursive walk can throw.

## Build Analysis Coverage

Well-covered heuristics:

- Kotlin unresolved reference with file/line/column.
- TypeScript missing symbol and generic TS diagnostics.
- Missing modules.
- Android manifest/package issues.
- Room/KSP, Compose, Gradle task failures.
- Electron/Vite/npm failure signals.
- Unknown/clean logs fall back to `No known pattern`.

Known gaps:

- Xcode, Cargo/Rust, Make/C/C++, Maven, and custom build output are not supported.
- Multi-error logs are sorted by heuristic confidence but are not deeply deduplicated.
- Parser does not verify extracted file paths exist before presenting them.

## Tests

| File | Coverage |
|---|---|
| `tests/build-workflow.test.ts` | Build parser, prompt approval shape, command runner, protected files, safety warnings. |
| `tests/duplicate-prevention.test.ts` | Duplicate prompt matching by project, chain, prompt type, issue type, context, status, and kind. |
| `tests/project-scanner.test.ts` | Framework detection, skip dirs, file counts, entry points, empty/nonexistent paths. |
| `tests/prompt-chains.test.ts` | Chain grouping, chain status badge logic, duplicate prevention across chain types, patch review analyzer. |

## Packaging

Electron-builder is configured in `package.json`.

- `appId`: `labs.kcx.studio-companion`
- `productName`: `KCx Studio Companion`
- `icon`: `Build/KCxSC.ico`
- Output: `release/`
- Targets: `nsis`, `portable`, `dir`
- Installer/portable artifacts exist in `release/`.
- App is currently unsigned; SmartScreen/unknown publisher warning is expected.

## Existing Documentation

Root docs before this audit:

- `RELEASE_CHECKLIST.md`
- `INSTALL_GUIDE.md`
- `QUICK_START.md`
- `PRIVACY.md`
- `KNOWN_LIMITATIONS.md`
- `RELEASE_NOTES.md`

These are useful but short. The release audit needs fuller docs in `docs/`.

## Identified Risks

| Risk | Severity | Evidence | Release impact |
|---|---|---|---|
| Direct command execution path from Build Logs bypasses approval queue. | BLOCKER/HIGH | `App.tsx` `handleRunBuild()` calls `window.kcxApi.runCommand()` directly. | Must be fixed or clearly restricted before beta. |
| Command runner uses `shell: true` without central validation. | HIGH | `src/main/main.ts`, `src/lib/commandRunner.ts`. | Shell injection/destructive command exposure risk. |
| API keys are stored in local JSON state if entered. | HIGH | `AiProvider.apiKey` is persisted via `state:save`; no keychain/encryption. | Must be documented honestly; should be improved before public/paid. |
| Scanner exclusions are incomplete for release claims. | MEDIUM | Skip list omits `.gradle`, `.idea`, `coverage`, `release`, `bin`, `obj`, secret/key files. | Beta acceptable with limitations, but privacy docs must not overclaim. |
| Patch review lacks `critical` risk level and destructive-command detection. | MEDIUM | Risk is based mainly on phrases `refactor`, `rewrite`, `large cleanup`, `architecture change`. | Needs improvement before public beta if command/patch safety is advertised strongly. |
| Main process and pure scanner are duplicated. | MEDIUM | Similar scanner logic appears in `main.ts` and `src/lib/projectScanner.ts`. | Drift risk; not a beta blocker. |
| `App.tsx` remains large. | LOW/MEDIUM | Renderer shell is ~84 KB. | Existing extraction direction helps, but further modularization should continue post-beta. |
| Clean VM, antivirus, FPS, and RAM checks cannot be directly proven in this local CLI session. | INFO | Requires interactive Windows VM/manual observation. | Must be labeled not directly tested in audit reports. |

## Test Plan Priority

1. Automated baseline: `npm install`, typecheck, unit tests, build, packaging.
2. Security-critical command execution and approval boundary.
3. State load/save/recovery behavior from code and packaged run checks.
4. Project scanner safety/performance/exclusion behavior.
5. Build parser representative log coverage and limitations.
6. Prompt chain duplicate prevention and persistence.
7. Patch review/risk labeling.
8. Provider routing and privacy truth table.
9. Runtime/cinematic systems and accessibility checks.
10. Documentation accuracy and beta positioning.

