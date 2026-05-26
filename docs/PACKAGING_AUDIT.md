# Packaging / Release Pipeline Audit

**Audit date**: 2026-05-26  
**Result**: PASS with signing/security caveats

## Configuration Validation

| Item | Status | Value |
|---|---:|---|
| electron-builder config | PASS | `package.json` `build` field |
| appId | PASS | `labs.kcx.studio-companion` |
| productName | PASS | `KCx Studio Companion` |
| version | PASS | `0.9.0-beta.1` |
| icon | PASS/WARN | `Build/KCxSC.ico`; packaging logs path warning then resolves. |
| targets | PASS | NSIS, portable, dir/unpacked |
| output directory | PASS | `release/` |
| artifact naming | PASS | `${productName}-${version}-${os}-${arch}-Setup/Portable.exe` |
| asar | PASS | Enabled |
| requested execution level | PASS | `asInvoker` |
| code signing | WARN | Not configured; signing skipped. |

## Packaging Command

Command run:

`npm.cmd run dist`

Result:

PASS. Electron-builder generated:

- `release\KCx Studio Companion-0.9.0-beta.1-win-x64-Setup.exe`
- `release\KCx Studio Companion-0.9.0-beta.1-win-x64-Portable.exe`
- `release\KCx Studio Companion-0.9.0-beta.1-win-x64-Setup.exe.blockmap`
- `release\win-unpacked\KCx Studio Companion.exe`

## Artifact Sizes

Latest observed:

- Setup EXE: about 94.9 MB
- Portable EXE: about 94.5 MB
- Unpacked executable: about 189 MB

## Packaged Contents

ASAR inspection confirmed:

- main JS present
- preload JS present
- renderer index present
- dashboard background image present
- renderer asset bundles present

## Packaged App Launch

Automated process launch was attempted with `Start-Process`. In this non-interactive tool context the process returned exit code 0 and did not remain alive after 5 seconds. This is not treated as a conclusive functional launch failure because GUI apps may not behave normally in the automation context, but it is a manual pre-release verification item.

Required manual check before beta distribution:

- Launch `release\win-unpacked\KCx Studio Companion.exe` from a normal Windows desktop session.
- Confirm main window appears.
- Confirm About screen reports `packaged: yes`.
- Confirm Dashboard background and ecosystem assets render.
- Confirm IPC-backed state load/save works.

## Clean VM Testing

Not directly tested in this session:

- Fresh Windows 10 VM
- Fresh Windows 11 VM
- Windows Defender / SmartScreen behavior
- Third-party antivirus checks

Expected beta.1 behavior:

- Unknown publisher / SmartScreen warning because app is unsigned.

## Release Blockers / Caveats

| Severity | Issue | Release impact |
|---|---|---|
| HIGH for public | Unsigned EXE. | Acceptable for trusted private beta; not public-ready. |
| HIGH for public | Electron/electron-builder audit advisories. | Upgrade path needed before public beta. |
| MEDIUM | Manual packaged GUI launch not confirmed in this automation. | Must be checked before sending to testers. |
| LOW | Icon path warning in electron-builder logs. | Cleanup recommended. |

## Verdict

Packaging pipeline is functional for private beta artifacts. Public beta needs code signing, dependency upgrade triage, and clean VM validation.

