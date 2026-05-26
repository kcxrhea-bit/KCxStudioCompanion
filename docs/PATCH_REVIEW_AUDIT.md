# Patch Review / Risk System Audit

**Audit date**: 2026-05-26  
**Result**: PARTIAL PASS

## Evidence Used

- `src/lib/patchReview.ts`
- Inline renderer patch review in `src/renderer/App.tsx`
- `tests/prompt-chains.test.ts`

## Risk Handling

| Patch type | Status | Notes |
|---|---:|---|
| Small safe patch | PASS | Clean summary labels low risk. |
| Large risky wording | PARTIAL | `refactor`, `rewrite`, `large cleanup`, `architecture change` influence risk. |
| Destructive patch/deletions | PARTIAL/FAIL | Deletes are not specifically recognized as high/critical. |
| Dependency changes | PARTIAL | File extraction catches `json`/`gradle`; no special risk boost. |
| Shell commands inside patch | PARTIAL/FAIL | No dedicated command extraction in patch review. |
| Ambiguous patch | PASS | Unknown outcome remains `unknown`; recommendation is cautious. |
| Malformed patch | PASS | Text heuristic does not crash on arbitrary input. |
| Security-sensitive files | PARTIAL/FAIL | `.env`, `.pem`, `.key`, auth/security paths are not specially flagged. |

## Risk Labels

Current labels:

- `low`
- `medium`
- `high`

No `critical` label exists in the type system.

## Strengths

- Patch review is human-readable and conservative enough for simple summaries.
- Captures changed files for common code/config extensions.
- Connects build outcome to recommended next step.
- Stores patch review history per project.

## Gaps

| Severity | Gap |
|---|---|
| HIGH before public beta | No critical risk tier or sensitive-file detection. |
| MEDIUM | Large diff size and file count are not measured. |
| MEDIUM | Destructive wording like `delete`, `remove`, `rm`, `del` is not currently enough to force high risk. |
| MEDIUM | Inline App.tsx review regex differs from extracted module ordering. |

## Verdict

Patch review is adequate as beta advisory tooling, not as a strong security gate. Public beta should add critical-risk detection for destructive diffs, dependencies, command suggestions, and sensitive files.

