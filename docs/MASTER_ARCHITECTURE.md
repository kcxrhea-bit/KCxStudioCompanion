# KCx Studio Companion — Master Architecture

**Audit date**: 2026-07-21 (interactive + source-level audit)
**Version**: 0.9.5-beta
**Project root**: `D:\KCxProjects\KCxStudioCompanion`

This document is the canonical orientation file for future AI sessions and new contributors. It supersedes stale details in older docs. Cross-reference: `docs/PROJECT_MAP.md` (v0.9.0 era), `CLAUDE.md` (agent notes), `.agent.md` (surgical patch agent contract).

## 1. Master Architecture

Electron 33 + React 18 + TypeScript 5.7 + Vite 6. Windows-first.

| Layer | Files | Role |
|---|---|---|
| Main process | `src/main/main.ts`, `src/main/release.ts` | Window creation, state persistence, IPC, command execution, project scanning, provider tests, Ollama process management, diagnostics logging |
| Preload | `src/preload/preload.ts` | `window.kcxApi` bridge (contextIsolation on, nodeIntegration off) |
| Renderer shell | `src/renderer/App.tsx` (~1,600 lines, deliberate monolith) | All Companion state, handlers, tab rendering |
| Valhalla | `src/renderer/valhalla/` (ValhallaPage, ForgeCanvas, SystemInspector, header/sidebar) | Full-page ecosystem map + Cortex chamber |
| Cortex | `src/renderer/cortex/` | Renderer-side contained runtime: providers, bridges, execution queue/sandbox, SmartBrain, SERA, memory |
| Shared libs | `src/lib/` (startupState, buildAnalysis, commandRunner, commandSafety, patchReview, projectScanner) | Pure logic, test-friendly extractions |
| Theming | `src/context/ThemeContext.tsx`, `src/themes/` (tronLegacy "Grid Zero", defaultDark) | CSS-variable theme injection, persisted in localStorage |

**Routing**: none. Companion screens are conditional renders keyed on a `tab` string; `showValhalla` swaps the whole page. Dev-only tabs (Development Tools, Ecosystem Test) are gated on `NODE_ENV`/`import.meta.env.DEV`.

**IPC channels** (all `ipcMain.handle` except the event): `state:get`, `state:save`, `app:releaseInfo`, `diagnostics:clear-logs`, `cmd:run`, `provider:test`, `project:scan`, `src:tree` (depth ≤ 4), `ollama:start`, `ollama:stop`; event `build-output-line` streams live command output to the renderer.

## 2. Feature Map

- **Companion nav**: Dashboard, Projects, Project Memory | Approval Queue, AI Providers | Build Logs, Patch Review, Project Context, Session Timeline | Settings, Telemetry | Guide, About, Release Notes, First Launch, Product Foundation (+ dev-only: Development Tools, Ecosystem Test).
- **Guide** (added 2026-07-21): built-in manual, `src/renderer/components/GuideSection.tsx`, rendered as tab "Guide".
- **Ecosystem Dock**: header modal, pure visuals (K-Drone / Wolf-Core / X-Pod states driven by `systemState` + telemetry regex).
- **Build presets**: `src/lib/startupState.ts` — 100+ presets across Android/Node/Electron/Project Root/ADB/Git/Tools/Reset, rendered as a portal tile panel in Build Logs (see CLAUDE.md MUST checks).
- **Prompt chains**: Fix / Validation / Regression generators with per-issue-type instructions, project-memory safety blocks, protected-file collision detection, duplicate prevention keyed on (project, chain, type, issue, contextKey).
- **Spec Intake**: Cortex chamber feature; see §7.

## 3. Workflow Map

1. **Startup**: main `loadState()` (defensive: .bak restore → clean fallback + dialog) → renderer migrates/normalizes → restores last project → `cortexRuntime.initialize()` → saves back.
2. **Project selection**: header `<select>` → persists `settings.lastSelectedProjectId`, restores per-project build command/preset, emits `project-context-updated` to Cortex.
3. **Build**: RUN BUILD → `createCommandRequestFromInput` (parses `cd /d "…" && …` chains and `start "" "…"`) → queues a **command approval** → Approve & Execute → main `validateCommandRequest` (`src/lib/commandSafety.ts`) → `spawn(shell:true)` with live output → logs merged into project, `parseBuildIntel`, timeline events, auto re-analysis.
4. **Log analysis**: `analyzeHeuristic` in App.tsx classifies Kotlin / TS missing-symbol / missing-module / manifest / Room-KSP / Compose / Gradle / Electron-Vite-npm errors with confidence ranking; `src/lib/buildAnalysis.ts` mirrors this for tests.
5. **Prompt generation**: three generators queue prompt approvals; approvals are grouped into chains in the queue UI; handoff is manual copy ("manual handoff to Claude Code" confirmations).
6. **Patch review**: paste summary → heuristic record (files, risky phrases, outcome, recommended next step) → history on project.
7. **Cortex build loop**: failed analysis + Ollama enabled → auto create/approve/execute a read-only summarize request → `cortex-execution-completed` → if Cortex Auto-Queue on, auto-queue Fix prompt.
8. **Spec Intake**: see §7.

## 4. Data Map

| Data | Location | Notes |
|---|---|---|
| App state | `userData/kcx-studio-companion-state.json` | Atomic .tmp+rename, `.bak` backup (gated by backupOnSave), recovery dialog. Projects, projectMemory, approvals, timeline, aiProviders, aiRoutingRules, aiDecisionTrace, safetyWarnings, releaseSettings, license, settings |
| Diagnostics | `userData/logs/runtime.log` | Append-only; cleared via Settings |
| Theme | localStorage `kcx-studio-theme` | Grid Zero (tronLegacy) default |
| Cortex config | localStorage `cortex-runtime-config` | `{ ollamaEnabled }` |
| Session telemetry | in-memory (last 8) | Lost on restart; StrictMode doubles the init event in dev |
| Cortex timeline / dev logs / execution history | in-memory | Cleared by Clear All Logs / Fresh Start |

## 5. Current Application State (as audited)

- Clean dev boot: tsc watch 0 errors, Vite on 127.0.0.1:5173, Electron loads with detached DevTools.
- Claimed baseline (release notes): 281 tests / 14 suites passing; `tests/` contains 14 suites + setup.
- Preset trigger correctly disabled without a project; approval queue, timeline, telemetry all verified in empty state.
- Providers: Local KCx Brain connected/preferred; Codex Handoff disconnected; Ollama disabled by default.

## 6. Known Limitations & Defects (verified)

- Prompt delivery is manual copy/paste only; no automated sending.
- **Spec Intake silently discards output when no project is selected** (`App.tsx` spec-intake subscriber early-returns; no user feedback).
- Build STOP button is not wired to process cancellation; `isBuilding` is never set true (vestigial).
- `startupState.ts` preset bugs: `run-from-project-root` emits `` `cd \d` `` and `open-terminal` emits `` `start cmd \k … cd \d …` `` — template-literal `\d`/`\k` collapse to `d`/`k`, generating malformed commands (should be `/d`, `/k`).
- Main-process scanner: `.toc` (WoW addon) detection can never fire — `.toc` is not in the `wanted` list that `has()` searches.
- ForgeCanvas node positions static; external ecosystem bridges are placeholders at 0%.
- `commandRunner.ts` duplicates main.ts's inline runner (test extraction; keep in sync manually).
- CLAUDE.md preset-panel section describes the pre-tab 11-tile panel; the panel now has 8 tabs and 100+ tiles (structural MUST checks still hold).

## 7. Cortex Implementation (truthful)

`src/renderer/cortex/CortexRuntime.ts` singleton:

- **Registries**: 6 providers (StudioCompanionAnalysis, KCxModeAI, LocalOllamaRuntime, ValhallaRuntime, BuildTelemetryProvider, FutureCloudProvider), 19 bridges (internal + honest 0%-readiness external ecosystem placeholders). Bridge readiness derived live from runtime context (`CortexBridgeReadiness`).
- **Execution path**: ManualExecutionQueue → ExecutionPermissions → ExecutionSandbox (fail-closed: summarize-only purposes; shell/file/patch/autonomous intents blocked) → CortexExecutionEngine → adapters (OllamaProviderAdapter fetches localhost; KCxModeAIProviderAdapter). History in `CortexExecutionHistory`.
- **Spec Intake** (`createSpecIntakeRequest`): SmartBrainNormalizer sanitizes/classifies (task type, risk, normalization trace) + CortexMemory hints → Ollama path builds a grounded prompt embedding the real `src/` tree via `src:tree` IPC → fallback chain: Ollama → embedded KCxModeAI brain (`providers/kcxmodeai/godzillaBrain.ts` et al.) → rule-based structured prompt. Emits `spec-intake-completed`; App.tsx queues the approval (requires selected project).
- **Safety**: KCxSERA (`sera/KCxSERA.ts`) deterministic policy scanner (forbidden tokens: iex/irm/curl-pipe-bash/reg ops/rm -rf/…; high-risk: package installs, shell exec, permission changes); activation requests always denied (`state: "denied"`, containment lock) — ATTEMPT ACTIVATION is a simulation.
- **Ollama management**: enabling Ollama (AI Providers or chamber) calls `ollama:start` IPC (spawns `ollama serve`), enables the adapter, persists to localStorage, connects the KCxModeAI bridge. Main kills the process on window-all-closed.

## 8. Valhalla Implementation

`src/renderer/valhalla/ValhallaPage.tsx` + `ForgeCanvas.tsx` (ReactFlow): sectors (Creation Forge, Runtime Nexus, Cortex Core, Memory Vault, AI Systems, Device Grid) and system nodes with activity state derived from the Cortex snapshot. Sidebar tabs select sectors. Inspector actions route back into Companion tabs via `onNavigateToCompanionSection` (e.g. Memory Vault → Project Memory; KCx Cortex → "planned / not implemented" message for companion routing). The Cortex chamber (Forge Bay overlay) hosts: status grid, collapsible panels (Operational Summary, Runtime Viewer, Diagnostics, Providers, Bridges, readiness matrices, Activation Gate, **Spec Intake**, Local Execution Readiness, Execution Results, Event Timeline, Permission Layer, Next Activation Steps), and a command palette.

## 9. Development Startup

```
npm install
npm run dev        # concurrently: tsc watch (main) + vite (127.0.0.1:5173) + electron
```

DevTools opens detached. React StrictMode is on (double effect invocation in dev).

## 10. Packaging

```
npm run build      # tsc -p tsconfig.main.json + vite build  → dist/
npm run dist       # electron-builder --win nsis portable    → release/
```

electron-builder config in package.json: appId `labs.kcx.studio-companion`, asar, max compression, NSIS + portable artifacts, icon `Build/KCxSC.ico`.

## 11. Repository Conventions

- Surgical patches only; preserve App.tsx orchestration (see `.agent.md`).
- Windows commands: `npm.cmd`, `gradlew.bat`, `cd /d`, quoted paths.
- Docs are dated audit files in `docs/`; agent-facing notes in `CLAUDE.md`.
- Validation before completion: `npm run build` clean + `npm test`.
- Never edit `dist/`; never invent new folders/APIs without need.

## 12. Important Files

| File | Why it matters |
|---|---|
| `src/renderer/App.tsx` | All Companion UI/state/handlers; tab union derives from nav arrays |
| `src/renderer/cortex/CortexRuntime.ts` | Cortex singleton; spec intake, build loop, registries |
| `src/renderer/cortex/intelligence/SmartBrainNormalizer.ts` | Prompt sanitization/classification |
| `src/renderer/cortex/sera/KCxSERA.ts` | Deterministic execution-boundary policy |
| `src/renderer/cortex/execution/CortexExecutionSandbox.ts` | Fail-closed sandbox rules |
| `src/renderer/valhalla/ValhallaPage.tsx` | Valhalla mode + Cortex chamber |
| `src/lib/startupState.ts` | Preset ids/commands, startup selection, workflow hints |
| `src/lib/commandSafety.ts` | Command validation (shared main + tests) |
| `src/main/main.ts` | Persistence, IPC, scanner, runner, Ollama lifecycle |
| `src/renderer/components/GuideSection.tsx` | Built-in manual (Guide tab) |
| `tests/` | 14 Jest suites (ts-jest, node env) |
