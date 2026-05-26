# Project Management Smoke Test

**Audit date**: 2026-05-26  
**Result**: PARTIAL PASS

## Evidence Used

- Code inspection of project workflows in `src/renderer/App.tsx`.
- Scanner tests in `tests/project-scanner.test.ts`.
- State normalization in `src/main/main.ts`.

## Workflow Results

| Workflow | Status | Notes |
|---|---:|---|
| Add project normal path | PASS | `addProject()` creates a project record and persists it. |
| Add duplicate path | FAIL/MEDIUM | No duplicate-path prevention was found. Same path can be added multiple times. |
| Add invalid path | PARTIAL | UI accepts path strings; scanner returns empty snapshot for nonexistent path in pure tests. |
| Add inaccessible path | NOT DIRECTLY TESTED | Recursive scanner can throw on permission errors inside walk; needs defensive handling. |
| Remove project | PASS | Delete confirmation exists; state updates project list and active project fallback. |
| Rename project | NOT IMPLEMENTED | No explicit rename workflow found. |
| Switch between projects | PASS | Project select sets active `projectId`; project-specific views read selected project. |
| Persistence after restart | PASS by code inspection | Projects are saved in app state and reloaded via `getState()`. |
| Project memory isolation | PASS | Memory is stored per project; views update selected project only. |
| Stale project references | PARTIAL | Deleted/moved folders do not crash scanner if root path is absent, but user-facing warning is limited. |

## Data Integrity

Strengths:

- Deleting active project resets active selection to next available project.
- Missing project fields are normalized at startup.
- Project memory and build history are project-scoped.

Gaps:

- Duplicate path prevention is missing.
- Project path validation is minimal.
- Rename is not available.
- Permission errors during nested scanning are not fully protected.

## Release Impact

| Severity | Issue | Recommendation |
|---|---|---|
| MEDIUM | Duplicate project paths can be added. | Add duplicate-path warning before public beta. |
| MEDIUM | Scanner permission errors can throw inside recursion. | Catch per-directory read errors and surface a safe warning. |
| LOW | Rename workflow absent. | Document as beta limitation. |

## Verdict

Acceptable for a small private beta if duplicate-path and invalid-path behavior are documented. Public beta should add validation, duplicate prevention, and clearer stale-folder handling.

