# How to Add a Project

## Step-by-Step

1. Launch KCx Studio Companion.
2. Open **PROJECTS** in the left sidebar.
3. Enter a project name.
4. Enter the project folder path.
5. Choose a project type.
6. Add an app goal and phase if useful.
7. Click **Add Project**.
8. Use **PROJECT CONTEXT** to scan the selected project.

## Supported Project Signals

The scanner recognizes common files such as:

- `package.json`
- `tsconfig.json`
- `vite.config.ts`
- `vite.config.js`
- `build.gradle`
- `settings.gradle`
- `AndroidManifest.xml`
- `electron-builder.json`
- `electron.vite.config.ts`

## Scanner Exclusions

Current beta exclusions:

- `node_modules`
- `.git`
- `dist`
- `build`
- `out`

Beta caveat: `.gradle`, `.idea`, `coverage`, `release`, `bin`, `obj`, and secret-like files are not yet explicitly excluded. The scanner stores summary metadata, but you should still avoid adding folders that contain secrets you do not want represented in local app state.

## Managing Projects

- Use the project dropdown in the header to switch projects.
- Use the delete button on project cards to remove a project from the app.
- Removing a project from the app does not delete your source folder.

## Current Limitations

- Duplicate project paths are not blocked yet.
- Rename is not implemented yet.
- Invalid paths can be saved; scans of nonexistent roots return empty snapshots.
- Permission errors inside nested folders need more defensive handling.

