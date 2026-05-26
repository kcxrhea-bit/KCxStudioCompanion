# Project Scanning Audit

**Audit date**: 2026-05-26  
**Result**: PARTIAL PASS

## Evidence Used

- `src/lib/projectScanner.ts`
- Inline scanner in `src/main/main.ts`
- `tests/project-scanner.test.ts`

## Supported Detection

The scanner detects:

- Node/npm via `package.json`
- Vite via `vite.config.ts` / `vite.config.js`
- TypeScript via `tsconfig.json`
- Android/Gradle via `build.gradle` / `settings.gradle`
- Android manifest via `AndroidManifest.xml`
- Electron via `electron-builder.json` / `electron.vite.config.ts`
- React via `.tsx` / `.jsx`
- Kotlin via `.kt`
- Python via `.py`

## Exclusions Implemented

Current skip directories:

- `node_modules`
- `.git`
- `dist`
- `build`
- `out`

Verified by tests:

- `node_modules`, `.git`, `dist`, `build`, and `out` are excluded from file counts.
- Empty and nonexistent roots return safe zero-count snapshots.

## Security and Privacy Findings

| Check | Status | Notes |
|---|---:|---|
| Does not upload scanned data | PASS | Scanner runs locally and returns summary data to renderer. |
| Avoids `node_modules` and build output | PASS | Covered by tests. |
| Avoids `.env` collection | PARTIAL/FAIL | `.env` is not explicitly excluded. It is counted, but not listed in `filesFound` unless wanted. |
| Avoids `.pem` / `.key` | PARTIAL/FAIL | No explicit exclusion. |
| Avoids large binary/media files | PARTIAL | Files are counted and sized; contents are not read, but there is no binary/media skip list. |
| Handles permission errors | PARTIAL | Root nonexistence is safe; nested `readdirSync` permission errors can throw. |

## Performance Characteristics

Strengths:

- Scanner returns bounded `filesFound` list of known config files, not all files.
- Top folders are capped to 12.
- Build output and dependency folders are skipped.

Gaps:

- No max file count, max depth, timeout, or progress event.
- Uses synchronous filesystem traversal in main process, so very large projects can block IPC/main responsiveness.
- No explicit skip for `.gradle`, `.idea`, `coverage`, `release`, `bin`, `obj`.

## Recommended Improvements

| Priority | Improvement |
|---|---|
| HIGH before public beta | Add per-directory try/catch, skip `.gradle`, `.idea`, `coverage`, `release`, `bin`, `obj`, and secret/key extensions. |
| MEDIUM | Add max file count and scan cancellation/timeout. |
| MEDIUM | Move scanning to async worker/thread or chunked traversal for very large projects. |
| LOW | Surface skipped/error directory counts in UI. |

## Verdict

Scanner is acceptable for trusted private beta projects. It is not yet strong enough to claim robust large-repo or secret-aware scanning without caveats.

