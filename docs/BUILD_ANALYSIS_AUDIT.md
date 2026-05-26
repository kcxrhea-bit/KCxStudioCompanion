# Build Analysis Audit

**Audit date**: 2026-05-26  
**Result**: PASS for beta scope, PARTIAL for broad parser coverage

## Evidence Used

- `src/lib/buildAnalysis.ts`
- Inline renderer parser in `src/renderer/App.tsx`
- `tests/build-workflow.test.ts`
- `tests/prompt-chains.test.ts`

## Representative Log Coverage

| Log type | Status | Evidence |
|---|---:|---|
| Kotlin unresolved reference | PASS | Tested with file, line, column, symbol extraction. |
| Gradle task failure | PASS | Tested. |
| Room/KSP failure | PASS | Tested heuristic. |
| Compose compiler issue | PASS | Tested heuristic. |
| Android Manifest issue | PASS | Tested heuristic. |
| TypeScript missing symbol | PASS | Tested with file, line, column, symbol extraction. |
| Generic TypeScript error | PASS | Heuristic exists. |
| npm/Vite/Electron error | PASS | Tested heuristic. |
| Missing module/dependency | PASS | Tested. |
| Malformed/unknown log | PASS | Returns `No known pattern`, low severity, low confidence. |
| Long noisy log | PARTIAL | Sorting exists, but no stress/performance test. |
| Multi-error log | PARTIAL | Multiple issues are collected and confidence-sorted; no deep dedupe. |

## Parser Strengths

- Extracts Kotlin file/line/column and unresolved symbol.
- Extracts TypeScript file/line/column for `Cannot find name`.
- Distinguishes high/medium/low severity.
- Produces confidence values.
- Unknown logs degrade safely instead of crashing.
- Build intelligence separately counts success/failure and common categories.

## Parser Weaknesses

- Does not verify extracted file paths exist.
- Does not support Xcode, Cargo/Rust, Make/C/C++, Maven, or custom build formats.
- Long logs are parsed linearly without bounds.
- Inline parser and extracted parser can drift over time.
- Confidence is heuristic, not statistically validated.

## Prompt Generation Quality

Generated fix/validation/regression prompts are issue-type aware and include:

- Detected issue type
- Severity
- File/symbol/location when available
- Original build log
- Do-not-rewrite and protected-file safety rules

## Release Impact

No build-analysis release blockers were found. Parser limitations should be documented in beta materials and expanded in beta.2.

## Recommended Test Additions

- Large log with 10+ mixed errors.
- Truncated log.
- Dependency resolution failures from npm and Gradle.
- Electron preload/main module errors.
- Scanner-backed path verification for extracted file paths.

