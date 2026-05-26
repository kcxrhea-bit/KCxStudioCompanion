# Command Approval / Execution Boundary Audit

**Audit date**: 2026-05-26  
**Result**: PASS after targeted fix, with residual hardening work

## Evidence Used

- `src/main/main.ts`
- `src/lib/commandRunner.ts`
- `src/lib/commandSafety.ts`
- `src/renderer/App.tsx`
- `tests/build-workflow.test.ts`

## Fix Applied During Audit

Before the audit fix:

- Build Logs `RUN BUILD` executed immediately.
- Main process command runner accepted requests without central safety validation.

After the audit fix:

- Build Logs `RUN BUILD` creates a pending command approval item.
- Main process validates command requests before `spawn`.
- Pure command runner validates command requests before `spawn`.
- Tests cover dangerous command blocking, shell-control character blocking, and destructive `git reset --hard` blocking.

## Current Command Boundary

| Check | Status | Notes |
|---|---:|---|
| Commands require explicit approval | PASS for Build Logs and dev tool queued commands | Build Logs now queues command approvals. |
| Rejected commands do not run | PASS by UI condition | Queue only shows execute button for pending command items. |
| Output capture works | PASS | stdout/stderr captured and streamed as telemetry. |
| Failure handled | PASS | Non-zero exit returns `success: false`; tested. |
| Long-running behavior | PARTIAL | Output streams, but cancellation is not wired. |
| Working directory controlled | PASS/PARTIAL | Request includes `cwd`; no path allowlist. |
| Dangerous commands flagged/blocked | PASS for known critical cases | Validator blocks deletion commands, shell interpreters, shell metacharacters, destructive git. |
| No hidden background execution | PASS after fix | User-initiated build path now queues approval. |
| Shell injection risk | PARTIAL | Validator reduces obvious metacharacter risk, but `shell: true` remains. |

## Dangerous Commands Blocked

The validator blocks command roots including:

- `rm`, `rmdir`, `rd`, `del`, `erase`
- `format`, `diskpart`, `shutdown`, `bcdedit`
- `reg`, `sc`, `takeown`, `icacls`
- shell interpreters: `cmd`, `powershell`, `pwsh`, `bash`, `sh`, `wscript`, `cscript`, `mshta`
- `git reset --hard`
- forced `git clean`
- shell control characters in command or args

## Residual Risks

| Severity | Risk | Recommendation |
|---|---|---|
| MEDIUM | `shell: true` remains in the runner. | Move to shell-free spawn where possible in beta.2. |
| MEDIUM | Allowlist is not project- or command-purpose aware. | Add risk labels and user confirmation for medium-risk commands. |
| LOW | Stop button does not cancel running process. | Track child process and wire cancellation. |

## Verdict

The beta.1 command boundary is substantially safer after the targeted patch. It is acceptable for private beta with clear warnings. Public beta should replace `shell: true`, add risk labels, and implement cancellation.

