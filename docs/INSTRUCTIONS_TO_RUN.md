# Instructions to Run KCx Studio Companion

## Quick Start

1. Install the app or run the portable EXE.
2. Open **PROJECTS** and add your project path.
3. Select the project from the header dropdown.
4. Open **PROJECT CONTEXT** and scan the project.
5. Run your normal build in a terminal or IDE.
6. Paste build output into **BUILD LOGS**.
7. Click **Analyze Logs**.
8. Generate and review fix/validation/regression prompts in **APPROVAL QUEUE**.

## Running a Build Command

The Build Logs command input defaults to:

`npm.cmd run build`

Clicking **RUN BUILD** queues a command approval. It does not execute silently.

To execute:

1. Open **APPROVAL QUEUE**.
2. Review the command.
3. Approve and execute only if it is expected and safe.
4. Review captured output.

## Android/Kotlin Workflow

1. Add your Android project.
2. Run your Gradle command externally, such as:

```powershell
.\gradlew assembleDebug
```

3. Paste the error output into **BUILD LOGS**.
4. Analyze logs.
5. Generate a fix prompt.
6. Review and copy/send to your AI workflow.
7. Apply changes manually.
8. Generate validation and regression prompts.

## Electron/Vite/TypeScript Workflow

1. Add your Electron/Vite project.
2. Run:

```powershell
npm.cmd run build
```

3. Paste output into **BUILD LOGS** or queue the command from the app.
4. Analyze logs.
5. Use prompt chains for fix, validation, and regression.

## Provider Setup

### Local / Ollama

1. Install and run Ollama separately.
2. Enable/configure Ollama in **AI Providers**.
3. Test the local endpoint if desired.

### Cloud Providers

1. Enable the provider intentionally.
2. Enter base URL/model/key if required.
3. Treat API keys as sensitive because beta.1 stores them in local app state.
4. Review prompts before sending data outside your machine.

## Troubleshooting

### Build Analysis Finds Nothing

- Paste the complete error section.
- Include file paths and stack traces if available.
- Check `KNOWN_LIMITATIONS.md` for unsupported build systems.

### Prompt Queue Looks Duplicated

The app blocks duplicate pending prompts with identical chain metadata. Completed or sent prompts may allow a new pending prompt for the same issue.

### State Recovery

State lives in:

`%APPDATA%\kcx-studio-companion\`

The app writes a `.bak` backup when backup-on-save is enabled.

