# KCx Studio Companion v0.9 Beta - Test Baseline Report

**Audit date**: 2026-05-26  
**Version**: `0.9.0-beta.1`  
**Platform used for audit**: Windows x64, PowerShell, Node/npm project workspace

## Summary

Automated baseline is passing after one targeted release-safety fix to command execution. The test suite increased from 140 to 143 tests because command safety coverage was added.

| Area | Result | Notes |
|---|---:|---|
| Dependency install | PASS | `npm install` reported `up to date`. |
| npm `typecheck` script | WARN | No `typecheck` script exists. Equivalent `npx tsc --noEmit` was run. |
| TypeScript | PASS | `npx tsc --noEmit` returned 0 errors. |
| npm `lint` script | WARN | No `lint` script exists. Recommend adding ESLint before public beta. |
| Unit tests | PASS | 4 suites, 143/143 tests passing. |
| Production build | PASS | Main and renderer build succeeded. |
| Packaging | PASS | NSIS installer, portable EXE, and unpacked app generated. |
| Production dependency audit | PASS | `npm audit --omit=dev` found 0 vulnerabilities. |
| Full dependency audit | WARN/HIGH | Full audit reports high advisories in Electron/electron-builder dependency chain; fixes require breaking major upgrades. |

## Commands Run

| Command | Result | Key output / evidence | Release impact |
|---|---:|---|---|
| `npm.cmd install` | PASS | `up to date in 1s` | No install blocker. |
| `npm.cmd run typecheck` | WARN | Missing script: `typecheck` | Add script for release hygiene. |
| `npx.cmd tsc --noEmit` | PASS | 0 TypeScript errors | No TS blocker. |
| `npm.cmd run lint` | WARN | Missing script: `lint` | Add linting before public beta. |
| `npm.cmd test -- --runInBand` | PASS | 4 suites passed, 143 tests passed | No test blocker. |
| `npm.cmd run build` | PASS | Vite transformed 51 modules; `dist/renderer` generated | Build ready. |
| `npm.cmd run dist` | PASS | `release\KCx Studio Companion-0.9.0-beta.1-win-x64-Setup.exe` and portable EXE generated | Packaging ready with caveats. |
| `npm.cmd audit --omit=dev` | PASS | `found 0 vulnerabilities` | Runtime app dependencies clean by npm production classification. |
| `npm.cmd audit` | WARN/HIGH | 10 high severity advisories in Electron/electron-builder chain | Upgrade Electron/electron-builder before public release. |

## Current Test Count

`143/143` tests passing.

Test suites:

- `tests/build-workflow.test.ts`
- `tests/duplicate-prevention.test.ts`
- `tests/project-scanner.test.ts`
- `tests/prompt-chains.test.ts`

## Build Artifacts Generated

| Artifact | Status |
|---|---:|
| `dist/main/main/main.js` | Present |
| `dist/main/preload/preload.js` | Present |
| `dist/renderer/index.html` | Present |
| `dist/renderer/assets/kcx-dashboard-bg-*.png` | Present |
| `release/win-unpacked/KCx Studio Companion.exe` | Present |
| `release/KCx Studio Companion-0.9.0-beta.1-win-x64-Setup.exe` | Present |
| `release/KCx Studio Companion-0.9.0-beta.1-win-x64-Portable.exe` | Present |

ASAR inspection confirmed these files are packaged:

- `\dist\main\main\main.js`
- `\dist\main\preload\preload.js`
- `\dist\renderer\index.html`
- `\dist\renderer\assets\kcx-dashboard-bg-DslyCvib.png`

## Warnings

- Jest/Node emitted `[DEP0190]` warning because command-runner tests invoke child processes with `shell: true`. This matches the audited implementation and is now partly mitigated by command validation, but `shell: true` remains a future hardening target.
- `npm audit` reports high advisories affecting Electron `<=39.8.4` and the electron-builder/tar chain. The suggested fix is a breaking upgrade (`electron@42.2.0`, `electron-builder@26.8.1`). Do not apply with `--force` during beta.1 without a dedicated compatibility pass.
- Packaging logs repeatedly note no signing info, so signing is skipped. This is expected for beta.1 but a public-release blocker.
- Electron-builder reports `path doesn't exist path=...\Build\Build\KCxSC.ico` before resolving to `Build\KCxSC.ico`. Packaging succeeds, but the icon path should be cleaned up before public release.

## Targeted Fix Applied During Baseline

Issue found:

- Build Logs direct `RUN BUILD` path executed commands immediately rather than routing through approval.
- Main command runner accepted shell-backed command requests without central safety validation.

Fix applied:

- Added `src/lib/commandSafety.ts`.
- Main process now blocks dangerous command roots, shell interpreters, destructive git operations, and shell-control characters before spawning.
- Pure command runner uses the same validator.
- Build Logs `RUN BUILD` now creates a pending command approval instead of executing immediately.
- Added 3 command safety tests.

After fix:

- `npx tsc --noEmit`: PASS
- `npm test -- --runInBand`: PASS, 143/143
- `npm run build`: PASS
- `npm run dist`: PASS

## Known Issues Requiring Follow-Up

| Severity | Issue | Impact |
|---|---|---|
| HIGH | Electron/electron-builder audit advisories require breaking upgrades. | Acceptable only for small private beta with disclosure; public beta should upgrade. |
| MEDIUM | No `lint` or `typecheck` npm scripts. | Release process should add script aliases. |
| MEDIUM | Command runner still uses `shell: true`. | Validator reduces risk, but shell-free execution should be a beta.2 hardening item. |
| LOW | Packaging icon path warning. | Build succeeds, but config path should be normalized. |

