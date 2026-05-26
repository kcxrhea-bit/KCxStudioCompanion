# What Local-First and Private Mean

KCx Studio Companion is local-first by default. It stores workflow data on your machine and does not include hidden analytics or automatic cloud upload behavior.

## What Stays Local

- Project records and paths
- Project memory
- Build logs
- Prompt history
- Approval queue state
- Patch review history
- Session timeline
- Diagnostics logs
- Theme preference

## What May Leave Your Machine

Only by user action or provider configuration:

- A prompt you manually copy into an external AI tool.
- A request to a cloud provider you configure in the provider settings.
- A provider test request to a configured endpoint.

## API Key Caveat

In beta.1, provider API keys are stored in the local state file if entered. They are not yet stored in OS keychain and are not encrypted by the app.

Treat this file as sensitive:

`%APPDATA%\kcx-studio-companion\kcx-studio-companion-state.json`

## Data Storage

| Data | Stored locally | Sent automatically | Notes |
|---|---:|---:|---|
| Project files | Metadata only | No | Source files remain in your project folder. |
| Build logs | Yes | No | You paste/import them. |
| Prompts | Yes | No | You decide where to send them. |
| Provider settings | Yes | No hidden telemetry | Provider tests may contact configured endpoints. |
| API keys | Yes | No hidden telemetry | Plaintext local beta caveat. |
| Telemetry/diagnostics | Yes | No | Local runtime/debug data. |

## Practical Privacy Guidance

- Use local workflows for sensitive projects.
- Review prompts before copying them to a cloud tool.
- Do not share your state file.
- Clear build logs that contain secrets.
- Avoid entering API keys until keychain storage is added unless you accept the beta caveat.

