# Persistence / State Recovery Audit

**Audit date**: 2026-05-26  
**Result**: PASS for defensive startup, PARTIAL for migration/versioning

## Evidence Used

- `src/main/main.ts`
- `src/main/release.ts`
- `src/renderer/App.tsx`

## Recovery Mechanisms Implemented

- `ensureUserDataReady()` creates and validates userData/logs.
- `saveState()` writes to `.tmp` then renames to the state path.
- `backupState()` copies existing state to `.bak` before overwrite.
- `loadState()` catches parse/read failures.
- On state failure, `.bak` is attempted.
- If backup fails, a safe warning dialog is shown and defaults are used.
- `normalizeState()` repairs missing fields and invalid arrays.
- Renderer performs additional migration for project memory, build history, patch history, provider ids/names, routing, warnings, and timeline.

## Scenario Matrix

| Scenario | Status | Notes |
|---|---:|---|
| Normal saved state | PASS | Loaded and normalized. |
| Empty/fresh state | PASS | Missing file returns defaults. |
| Corrupted JSON | PASS by code inspection | Parse failure caught; backup/default fallback. |
| Missing fields | PASS | Default merge and renderer migration. |
| Old schema state | PARTIAL | Missing fields repaired; no explicit versioned migrations. |
| Partial writes | PASS/PARTIAL | Temp write + rename helps; backup helps; no `.tmp` recovery. |
| Interrupted save | PARTIAL | Previous `.bak` likely recoverable; not directly killed mid-save. |
| Restart during workflow | PASS by data model | Approvals/timeline persisted; active transient UI state not persisted. |
| Large history file | NOT DIRECTLY TESTED | No virtualization/stress test for 1000+ prompts. |
| Deleted project path | PARTIAL | Scanner nonexistent root safe; stale path UX limited. |
| Provider config missing | PASS | Providers are migrated/defaulted. |

## Findings

| Severity | Finding | Recommendation |
|---|---|---|
| MEDIUM | No explicit state schema version. | Add `stateVersion` and migration registry before public beta. |
| LOW | No `.tmp` cleanup/recovery branch. | Detect and remove/recover stale temp files. |
| LOW | User-facing recovery message is generic. | Add diagnostics path in recovery dialog. |

## Verdict

State recovery is good for beta.1. The app should survive corrupted JSON and missing fields. Public beta should add schema versioning and automated state-recovery tests.

