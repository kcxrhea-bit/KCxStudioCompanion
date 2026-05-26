# Release Checklist

## Build

- Run `npm install` after dependency changes.
- Run `npm run test`.
- Run `npm run build`.
- Run `npm run dist:dir`.
- Run `npm run dist` on Windows to create NSIS and portable artifacts in `release/`.

## Verification

- Launch unpacked build from `release/win-unpacked/KCx Studio Companion.exe`.
- Validate first launch with empty userData.
- Validate restart after project creation, build log import, prompt generation, and provider setting changes.
- Validate corrupted state recovery by temporarily replacing userData state JSON with malformed JSON.
- Confirm no API keys, secrets, or local absolute development paths are included in release artifacts.

## Signing

- For public release, add Windows code-signing certificate before distribution.
- Re-run Defender and SmartScreen checks after signing.

