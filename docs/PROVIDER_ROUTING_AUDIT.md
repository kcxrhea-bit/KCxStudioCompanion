# Provider Routing Audit

**Audit date**: 2026-05-26  
**Result**: PARTIAL PASS

## Evidence Used

- `src/renderer/App.tsx`
- `src/renderer/types.ts`
- `src/main/main.ts`

## Provider Model

Configured default providers:

- Local KCx Brain
- Ollama
- OpenRouter
- Groq
- Gemini API
- OpenAI

Provider settings include:

- enabled/disabled
- preferred
- status
- API key
- base URL
- model name
- timeout
- local-only flag
- capabilities

## Behavior Validation

| Check | Status | Notes |
|---|---:|---|
| Local provider default | PASS | Local KCx Brain enabled and local-only by default. |
| Disabled cloud providers | PASS | Cloud providers default disabled or placeholder. |
| Provider persistence | PASS | Provider config saved in app state. |
| Provider test | PASS/PARTIAL | `provider:test` checks enabled/key/local status and fetches configured endpoint. |
| Provider fallback model | PARTIAL | `routeTask()` records fallback provider but does not execute provider fallback requests. |
| No accidental cloud send | PASS by current implementation | Prompt sending is manual/copy-based; cloud request execution is not implemented for prompts. |
| API key privacy | FAIL/HIGH | API keys are stored in local JSON state if entered; no OS keychain/encryption yet. |

## Local-First Truth Table

| Action | Local by default | Network possible | User control |
|---|---:|---:|---|
| Build parsing | Yes | No | Full |
| Prompt generation | Yes | No | Full |
| Copy prompt to external AI | User-driven | Yes, outside app | User copies/sends |
| Provider test | No, if endpoint is cloud | Yes | User clicks test and configures endpoint |
| Cloud provider prompt execution | Not implemented | N/A | Future feature must require approval |

## Privacy Wording Recommendations

Use:

> KCx Studio Companion stores workflow data locally. Cloud providers are disabled unless you configure them. Provider tests and future provider sends may contact configured endpoints.

Do not claim:

- API keys are stored in OS keychain.
- Provider routing is fully implemented for cloud prompt execution.
- Cloud data never leaves the machine when cloud providers are enabled.

## Verdict

Provider architecture is a reasonable local-first foundation, but API key storage is not public-release ready. Keep cloud providers clearly optional and disabled for beta.1.

