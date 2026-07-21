# KCx Studio Companion — Claude Code Notes

> **See also**: `docs/MASTER_ARCHITECTURE.md` (full architecture audit, 2026-07-21). The preset panel has grown since the 2026-05-27 audit below: it now renders 8 tabs (Android, Node/NPM, Electron, Project Root, ADB, Git, Tools, Reset) with 100+ tiles via `commandPresetGroups` in App.tsx. The structural MUST checks below still hold. A "Guide" tab (built-in manual, `src/renderer/components/GuideSection.tsx`) was added 2026-07-21.

## Architecture Overview

Electron + React + TypeScript. Main process, preload bridge (`window.kcxApi`), and renderer.
State is persisted via IPC (`window.kcxApi.saveState` / `getState`).

Key source files:
- `src/renderer/App.tsx` — monolithic renderer: all UI, state, and handlers
- `src/lib/startupState.ts` — preset definitions, command generation, project state helpers
- `src/renderer/styles/app.css` — all renderer styles
- `src/lib/buildAnalysis.ts` — heuristic log analysis
- `src/lib/commandRunner.ts` — safe child-process runner
- `src/lib/commandSafety.ts` — block dangerous commands

## Preset Tile Panel (audited 2026-05-27)

The command preset UI is a **tile panel**, not a `<select>` dropdown.

### Structure
- Trigger button: `.preset-trigger-btn`, `disabled={!selectedProject}`, `App.tsx:1094–1099`
- Panel wrapper: `.preset-panel-wrapper` with `ref={presetPanelRef}`, `App.tsx:1091`
- Panel: `.preset-panel` (always in DOM, hidden via CSS — not conditionally rendered), `App.tsx:1101`
- 4 sections: Android (3 tiles), Node/Electron (5 tiles), Project Root (2 tiles), Reset (1 tile)
- Total: 11 tiles

### State
- `presetPanelOpen: boolean` — `App.tsx:71`
- `buildCommandPreset: BuildCommandPresetId` — `App.tsx:70`
- `presetPanelRef: RefObject<HTMLDivElement>` — `App.tsx:86`

### Close triggers
- Outside click: `document mousedown` listener, `App.tsx:112–121`
- Escape key: `window keydown` listener, `App.tsx:122–129`
- Tile click: `setPresetPanelOpen(false)` inline in each onClick
- Both effects return cleanup (`removeEventListener`)

### Command generation (`startupState.ts`)
- Android presets use `cd /d "path" && gradlew.bat <task>` (Windows, quoted path)
- Node/Electron presets ignore project root entirely
- `open-project-root` → `start "" "path"` (opens in Explorer) — NOT `cd /d`
- `run-from-project-root` → `cd /d "path"` (changes directory)
- `custom` → `""` (blank)
- **Empty root behavior**: Android presets with empty root return bare Gradle command (`"gradlew.bat assembleDebug"`), not blank. This is safe but differs from a "blank" expectation.
- `node-dev` and `electron-dev` intentionally share `npm.cmd run dev` via switch fall-through

### Highlight state
- Tile gets `is-selected` when `buildCommandPreset === tile-id`
- Manual edit (`updateBuildCommand`) sets preset to `"custom"` → Custom/Blank tile highlights
- Project switch restores preset ID via `getProjectBuildCommandPreset(nextProject)`

## MUST Checks for Future Changes to Preset Panel

1. **No `<select>` for preset selection.** grep for `command-preset-select` must return zero.
2. **Trigger button must be disabled when no project selected.** `disabled={!selectedProject}`
3. **Panel renders via React Portal into `document.body`** — not inline in the component tree.
4. **Panel uses `position: fixed` with `z-index: 9999`** — must not push content down and must clear all stacking contexts.
5. **Panel is conditionally rendered** (only mounted when `presetPanelOpen` is `true`) — not hidden via CSS.
6. **Trigger button position is calculated via `getBoundingClientRect()` on open**, stored in `panelPos` state, used to place the fixed panel next to the button.
7. **Both event listeners must return cleanup functions** to avoid memory leaks on unmount.
8. **`applyBuildCommandPreset` must not call `handleRunBuild` or any build/execution IPC.**
9. **`updateBuildCommand` must always set `buildCommandPreset` to `"custom"`** when command is edited manually.
10. **`open-project-root` uses `start "" "path"`, NOT `cd /d "path"`.** Do not confuse these.
11. **`node-dev` and `electron-dev` intentionally generate the same command.** This is correct.
12. **Custom/Blank tile IS highlighted** when `buildCommandPreset === "custom"` (including after manual edits).

## Known Edge Cases

- **Trailing backslash in path** (`C:\path\`): `quoteRoot` produces `"C:\path\"` — the `\` before closing `"` can cause cmd.exe quote-balancing issues. Uncommon in practice.
- **Panel does not close on project switch**: If panel is open when user changes project, it stays open but updates (new project's tile highlights). Acceptable behavior.
- **13.9 edge case**: Consider adding `setPresetPanelOpen(false)` to `handleProjectChange` if this becomes an issue.

## Missing Test Coverage (as of 2026-05-27 audit)

These unit tests are absent from `tests/startupState.test.ts`:
- `createPresetCommand("android-debug", "C:\\Dev\\My App")` — space-in-path quoting for Android
- `createPresetCommand("custom", "any")` === `""` — explicit blank assertion
- `createPresetCommand("android-debug", "")` — empty root behavior documented

## Test Commands

```
npm run build       # must pass clean
npm test            # 281 tests, 14 suites (v0.9.5-beta baseline)
npm test startupState  # command generation / persistence suite
```

## Windows Specifics

- All commands use `gradlew.bat`, `npm.cmd`, `cd /d`, double-quoted paths
- `&&` chaining works in cmd.exe and PowerShell 7+; NOT in PowerShell 5.1
- The Electron runner uses Node `child_process` internally — not user-facing shell — so PowerShell 5 is not a concern for tile-triggered builds
