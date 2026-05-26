# How to Use Build Analysis

## Overview

Build Analysis turns pasted or imported build output into a structured issue summary. It can then generate fix, validation, and regression prompts.

## Workflow

1. Add and select a project.
2. Run your build in your normal terminal or IDE.
3. Copy the relevant build output.
4. Open **BUILD LOGS**.
5. Paste the log into the text area.
6. Click **Analyze Logs**.
7. Review the detected issue type, severity, confidence, files, and symbols.
8. Click **Generate Fix Prompt**.
9. Review the prompt in **APPROVAL QUEUE**.
10. Copy/send the prompt to your chosen AI workflow only after reviewing it.

## Build Command Button

The **RUN BUILD** control queues a command approval instead of executing immediately. Go to **APPROVAL QUEUE** to approve or reject the command.

## Supported Well

- Kotlin unresolved references
- Gradle task failures
- Room/KSP hints
- Compose compiler hints
- Android manifest/package hints
- TypeScript missing names and generic TS diagnostics
- npm/Vite/Electron build failure hints
- Missing module messages

## Partially Supported

- Long noisy logs
- Multi-error logs
- Electron main/preload-specific errors
- Dependency resolution failures with unusual formatting

## Not Yet Supported

- Xcode
- Rust/Cargo
- Make/C/C++
- Maven
- Highly custom build scripts

## Confidence Levels

- **High**: clear pattern with useful file/symbol/location.
- **Medium**: likely category but incomplete context.
- **Low**: unknown or ambiguous log.

Always verify parser output before approving an AI prompt.

## Best Practices

- Paste the complete error section, not only the final `BUILD FAILED` line.
- Fix the highest-confidence issue first.
- Run validation after applying a fix.
- Treat low-confidence output as a starting point, not an answer.

