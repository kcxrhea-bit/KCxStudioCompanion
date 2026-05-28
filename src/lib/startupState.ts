import type { Project } from "../renderer/types";

export const DEFAULT_STARTUP_TAB = "Dashboard";
export const DEFAULT_BUILD_COMMAND_PLACEHOLDER = "Select a preset or enter a command";

export type BuildCommandPresetId =
  | "custom"
  | "android-debug-build"
  | "android-release-build"
  | "android-clean"
  | "android-bundle-debug"
  | "android-bundle-release"
  | "android-build"
  | "android-assemble"
  | "android-check"
  | "android-unit-tests"
  | "android-device-tests"
  | "android-lint"
  | "android-lint-debug"
  | "android-install-debug"
  | "android-uninstall-all"
  | "android-signing-report"
  | "android-tasks"
  | "android-properties"
  | "android-dependencies"
  | "android-wrapper"
  | "node-install"
  | "node-build"
  | "node-dev"
  | "node-test"
  | "node-test-watch"
  | "node-lint"
  | "node-format"
  | "node-clean"
  | "node-audit"
  | "node-audit-fix"
  | "node-outdated"
  | "node-update"
  | "electron-dev"
  | "electron-package"
  | "electron-make"
  | "electron-publish"
  | "electron-rebuild"
  | "electron-postinstall"
  | "open-project-root"
  | "run-from-project-root"
  | "open-terminal"
  | "adb-devices"
  | "adb-install"
  | "adb-uninstall"
  | "adb-logcat"
  | "adb-logcat-clear"
  | "adb-logcat-filter"
  | "adb-screenshot"
  | "adb-reboot"
  | "adb-reboot-recovery"
  | "adb-shell"
  | "adb-push"
  | "adb-pull"
  | "adb-list-packages"
  | "adb-clear-app"
  | "adb-start-app"
  | "adb-kill-app"
  | "adb-wifi-connect"
  | "adb-pair-wireless"
  | "git-status"
  | "git-log"
  | "git-diff"
  | "git-diff-staged"
  | "git-branches"
  | "git-remotes"
  | "git-pull"
  | "git-push"
  | "git-fetch"
  | "git-fetch-all"
  | "git-pull-rebase"
  | "git-new-branch"
  | "git-switch-branch"
  | "git-merge"
  | "git-delete-branch"
  | "git-force-delete"
  | "git-add-all"
  | "git-commit"
  | "git-amend"
  | "git-stash"
  | "git-stash-pop"
  | "git-stash-list"
  | "git-undo-last"
  | "git-hard-reset"
  | "git-clean"
  | "git-discard-file"
  | "tools-kotlin-version"
  | "tools-java-version"
  | "tools-javac-version"
  | "tools-sdk-manager"
  | "tools-avd-manager"
  | "tools-list-targets"
  | "tools-list-devices"
  | "tools-node-version"
  | "tools-npm-version"
  | "tools-npx-version"
  | "tools-list-global"
  | "tools-clear-cache"
  | "tools-check-updates"
  | "tools-gradle-version"
  | "tools-gradle-daemon"
  | "tools-stop-daemon"
  | "tools-gradle-scan"
  | "tools-disk-usage"
  | "tools-processes"
  | "tools-kill-process"
  | "tools-env-vars"
  | "tools-path-var"
  | "tools-ip-address";

export type BuildCommandPresetGroup =
  | "Android Builds"
  | "Android Testing"
  | "Android Install"
  | "Android Info"
  | "Node / NPM"
  | "Electron"
  | "Project Root"
  | "ADB"
  | "Git Status"
  | "Git Sync"
  | "Git Branches"
  | "Git Commits"
  | "Git Reset"
  | "Tools Kotlin/Java"
  | "Tools Android SDK"
  | "Tools Node/System"
  | "Tools Gradle"
  | "Tools System"
  | "Reset";

export type BuildCommandPreset = {
  id: BuildCommandPresetId;
  label: string;
  group: BuildCommandPresetGroup;
};

export type ProjectWorkflowHints = {
  android: boolean;
  node: boolean;
};

export const buildCommandPresets: BuildCommandPreset[] = [
  { id: "android-debug-build", label: "Debug Build", group: "Android Builds" },
  { id: "android-release-build", label: "Release Build", group: "Android Builds" },
  { id: "android-clean", label: "Clean", group: "Android Builds" },
  { id: "android-bundle-debug", label: "Bundle Debug", group: "Android Builds" },
  { id: "android-bundle-release", label: "Bundle Release", group: "Android Builds" },
  { id: "android-build", label: "Build", group: "Android Builds" },
  { id: "android-assemble", label: "Assemble", group: "Android Builds" },
  { id: "android-check", label: "Check", group: "Android Builds" },
  { id: "android-unit-tests", label: "Unit Tests", group: "Android Testing" },
  { id: "android-device-tests", label: "Device Tests", group: "Android Testing" },
  { id: "android-lint", label: "Lint", group: "Android Testing" },
  { id: "android-lint-debug", label: "Lint Debug", group: "Android Testing" },
  { id: "android-install-debug", label: "Install Debug", group: "Android Install" },
  { id: "android-uninstall-all", label: "Uninstall All", group: "Android Install" },
  { id: "android-signing-report", label: "Signing Report", group: "Android Install" },
  { id: "android-tasks", label: "Tasks", group: "Android Info" },
  { id: "android-properties", label: "Properties", group: "Android Info" },
  { id: "android-dependencies", label: "Dependencies", group: "Android Info" },
  { id: "android-wrapper", label: "Wrapper", group: "Android Info" },
  { id: "node-install", label: "Install", group: "Node / NPM" },
  { id: "node-build", label: "Build", group: "Node / NPM" },
  { id: "node-dev", label: "Dev", group: "Node / NPM" },
  { id: "node-test", label: "Test", group: "Node / NPM" },
  { id: "node-test-watch", label: "Test Watch", group: "Node / NPM" },
  { id: "node-lint", label: "Lint", group: "Node / NPM" },
  { id: "node-format", label: "Format", group: "Node / NPM" },
  { id: "node-clean", label: "Clean", group: "Node / NPM" },
  { id: "node-audit", label: "Audit", group: "Node / NPM" },
  { id: "node-audit-fix", label: "Audit Fix", group: "Node / NPM" },
  { id: "node-outdated", label: "Outdated", group: "Node / NPM" },
  { id: "node-update", label: "Update", group: "Node / NPM" },
  { id: "electron-dev", label: "Dev", group: "Electron" },
  { id: "electron-package", label: "Package", group: "Electron" },
  { id: "electron-make", label: "Make", group: "Electron" },
  { id: "electron-publish", label: "Publish", group: "Electron" },
  { id: "electron-rebuild", label: "Rebuild", group: "Electron" },
  { id: "electron-postinstall", label: "Postinstall", group: "Electron" },
  { id: "open-project-root", label: "Open in Explorer", group: "Project Root" },
  { id: "run-from-project-root", label: "Run From Root", group: "Project Root" },
  { id: "open-terminal", label: "Open Terminal", group: "Project Root" },
  { id: "adb-devices", label: "Devices", group: "ADB" },
  { id: "adb-install", label: "Install APK", group: "ADB" },
  { id: "adb-uninstall", label: "Uninstall", group: "ADB" },
  { id: "adb-logcat", label: "Logcat", group: "ADB" },
  { id: "adb-logcat-clear", label: "Logcat Clear", group: "ADB" },
  { id: "adb-logcat-filter", label: "Logcat Filter", group: "ADB" },
  { id: "adb-screenshot", label: "Screenshot", group: "ADB" },
  { id: "adb-reboot", label: "Reboot", group: "ADB" },
  { id: "adb-reboot-recovery", label: "Reboot Recovery", group: "ADB" },
  { id: "adb-shell", label: "Shell", group: "ADB" },
  { id: "adb-push", label: "Push File", group: "ADB" },
  { id: "adb-pull", label: "Pull File", group: "ADB" },
  { id: "adb-list-packages", label: "List Packages", group: "ADB" },
  { id: "adb-clear-app", label: "Clear App Data", group: "ADB" },
  { id: "adb-start-app", label: "Start App", group: "ADB" },
  { id: "adb-kill-app", label: "Kill App", group: "ADB" },
  { id: "adb-wifi-connect", label: "WiFi Connect", group: "ADB" },
  { id: "adb-pair-wireless", label: "Pair Wireless", group: "ADB" },
  { id: "git-status", label: "Status", group: "Git Status" },
  { id: "git-log", label: "Log", group: "Git Status" },
  { id: "git-diff", label: "Diff", group: "Git Status" },
  { id: "git-diff-staged", label: "Staged Diff", group: "Git Status" },
  { id: "git-branches", label: "Branches", group: "Git Status" },
  { id: "git-remotes", label: "Remotes", group: "Git Status" },
  { id: "git-pull", label: "Pull", group: "Git Sync" },
  { id: "git-push", label: "Push", group: "Git Sync" },
  { id: "git-fetch", label: "Fetch", group: "Git Sync" },
  { id: "git-fetch-all", label: "Fetch All", group: "Git Sync" },
  { id: "git-pull-rebase", label: "Pull Rebase", group: "Git Sync" },
  { id: "git-new-branch", label: "New Branch", group: "Git Branches" },
  { id: "git-switch-branch", label: "Switch Branch", group: "Git Branches" },
  { id: "git-merge", label: "Merge", group: "Git Branches" },
  { id: "git-delete-branch", label: "Delete Branch", group: "Git Branches" },
  { id: "git-force-delete", label: "Force Delete", group: "Git Branches" },
  { id: "git-add-all", label: "Add All", group: "Git Commits" },
  { id: "git-commit", label: "Commit", group: "Git Commits" },
  { id: "git-amend", label: "Amend", group: "Git Commits" },
  { id: "git-stash", label: "Stash", group: "Git Commits" },
  { id: "git-stash-pop", label: "Stash Pop", group: "Git Commits" },
  { id: "git-stash-list", label: "Stash List", group: "Git Commits" },
  { id: "git-undo-last", label: "Undo Last", group: "Git Reset" },
  { id: "git-hard-reset", label: "Hard Reset", group: "Git Reset" },
  { id: "git-clean", label: "Clean", group: "Git Reset" },
  { id: "git-discard-file", label: "Discard File", group: "Git Reset" },
  { id: "tools-kotlin-version", label: "Kotlin Version", group: "Tools Kotlin/Java" },
  { id: "tools-java-version", label: "Java Version", group: "Tools Kotlin/Java" },
  { id: "tools-javac-version", label: "Javac Version", group: "Tools Kotlin/Java" },
  { id: "tools-sdk-manager", label: "SDK Manager", group: "Tools Android SDK" },
  { id: "tools-avd-manager", label: "AVD Manager", group: "Tools Android SDK" },
  { id: "tools-list-targets", label: "List Targets", group: "Tools Android SDK" },
  { id: "tools-list-devices", label: "List Devices", group: "Tools Android SDK" },
  { id: "tools-node-version", label: "Node Version", group: "Tools Node/System" },
  { id: "tools-npm-version", label: "NPM Version", group: "Tools Node/System" },
  { id: "tools-npx-version", label: "NPX Version", group: "Tools Node/System" },
  { id: "tools-list-global", label: "List Global Pkgs", group: "Tools Node/System" },
  { id: "tools-clear-cache", label: "Clear NPM Cache", group: "Tools Node/System" },
  { id: "tools-check-updates", label: "Check Updates", group: "Tools Node/System" },
  { id: "tools-gradle-version", label: "Gradle Version", group: "Tools Gradle" },
  { id: "tools-gradle-daemon", label: "Gradle Daemon", group: "Tools Gradle" },
  { id: "tools-stop-daemon", label: "Stop Daemon", group: "Tools Gradle" },
  { id: "tools-gradle-scan", label: "Gradle Scan", group: "Tools Gradle" },
  { id: "tools-disk-usage", label: "Disk Usage", group: "Tools System" },
  { id: "tools-processes", label: "Running Processes", group: "Tools System" },
  { id: "tools-kill-process", label: "Kill Process", group: "Tools System" },
  { id: "tools-env-vars", label: "Environment Vars", group: "Tools System" },
  { id: "tools-path-var", label: "Path Variable", group: "Tools System" },
  { id: "tools-ip-address", label: "IP Address", group: "Tools System" },
  { id: "custom", label: "Custom / Blank", group: "Reset" },
];

const hasAny = (values: string[] | undefined, matcher: RegExp): boolean =>
  Array.isArray(values) && values.some((value) => matcher.test(value));

const quoteRoot = (projectRoot: string): string => `"${projectRoot.trim()}"`;

const gradleCommand = (projectRoot: string, task: string): string => {
  const root = projectRoot.trim();
  return root ? `cd /d ${quoteRoot(root)} && gradlew.bat ${task}` : `gradlew.bat ${task}`;
};

const normalizePresetId = (presetId: string | undefined): BuildCommandPresetId => {
  switch (presetId) {
    case "android-debug":
      return "android-debug-build";
    case "android-release-bundle":
      return "android-bundle-release";
    default:
      return buildCommandPresets.some((preset) => preset.id === presetId) ? presetId as BuildCommandPresetId : "custom";
  }
};

export const getProjectBuildCommand = (project: Project | undefined): string =>
  typeof project?.buildCommand === "string" ? project.buildCommand : "";

export const getProjectBuildCommandPreset = (project: Project | undefined): BuildCommandPresetId =>
  normalizePresetId(project?.buildCommandPreset);

export const createPresetCommand = (presetId: BuildCommandPresetId, projectRoot = ""): string => {
  const root = projectRoot.trim();
  switch (presetId) {
    case "android-debug-build":
      return gradleCommand(root, "assembleDebug");
    case "android-release-build":
      return gradleCommand(root, "assembleRelease");
    case "android-clean":
      return gradleCommand(root, "clean");
    case "android-bundle-debug":
      return gradleCommand(root, "bundleDebug");
    case "android-bundle-release":
      return gradleCommand(root, "bundleRelease");
    case "android-build":
      return gradleCommand(root, "build");
    case "android-assemble":
      return gradleCommand(root, "assemble");
    case "android-check":
      return gradleCommand(root, "check");
    case "android-unit-tests":
      return gradleCommand(root, "test");
    case "android-device-tests":
      return gradleCommand(root, "connectedAndroidTest");
    case "android-lint":
      return gradleCommand(root, "lint");
    case "android-lint-debug":
      return gradleCommand(root, "lintDebug");
    case "android-install-debug":
      return gradleCommand(root, "installDebug");
    case "android-uninstall-all":
      return gradleCommand(root, "uninstallAll");
    case "android-signing-report":
      return gradleCommand(root, "signingReport");
    case "android-tasks":
      return gradleCommand(root, "tasks");
    case "android-properties":
      return gradleCommand(root, "properties");
    case "android-dependencies":
      return gradleCommand(root, "dependencies");
    case "android-wrapper":
      return gradleCommand(root, "wrapper");
    case "node-install":
      return "npm.cmd install";
    case "node-build":
      return "npm.cmd run build";
    case "node-dev":
      return "npm.cmd run dev";
    case "node-test":
      return "npm.cmd test";
    case "node-test-watch":
      return "npm.cmd run test:watch";
    case "node-lint":
      return "npm.cmd run lint";
    case "node-format":
      return "npm.cmd run format";
    case "node-clean":
      return "npm.cmd run clean";
    case "node-audit":
      return "npm.cmd audit";
    case "node-audit-fix":
      return "npm.cmd audit fix";
    case "node-outdated":
      return "npm.cmd outdated";
    case "node-update":
      return "npm.cmd update";
    case "electron-dev":
      return "npm.cmd run dev";
    case "electron-package":
      return "npm.cmd run package";
    case "electron-make":
      return "npm.cmd run make";
    case "electron-publish":
      return "npm.cmd run publish";
    case "electron-rebuild":
      return "npm.cmd run rebuild";
    case "electron-postinstall":
      return "npm.cmd run postinstall";
    case "open-project-root":
      return root ? `start "" ${quoteRoot(root)}` : "start .";
    case "run-from-project-root":
      return root ? `cd /d ${quoteRoot(root)}` : "";
    case "open-terminal":
      return root ? `start cmd /k "cd /d \\"${root}\\""` : "start cmd /k";
    case "adb-devices":
      return "adb devices";
    case "adb-install":
      return "adb install app/build/outputs/apk/debug/app-debug.apk";
    case "adb-uninstall":
      return "adb uninstall <package>";
    case "adb-logcat":
      return "adb logcat";
    case "adb-logcat-clear":
      return "adb logcat -c";
    case "adb-logcat-filter":
      return "adb logcat *:E";
    case "adb-screenshot":
      return "adb shell screencap -p /sdcard/screen.png && adb pull /sdcard/screen.png";
    case "adb-reboot":
      return "adb reboot";
    case "adb-reboot-recovery":
      return "adb reboot recovery";
    case "adb-shell":
      return "adb shell";
    case "adb-push":
      return "adb push";
    case "adb-pull":
      return "adb pull";
    case "adb-list-packages":
      return "adb shell pm list packages";
    case "adb-clear-app":
      return "adb shell pm clear";
    case "adb-start-app":
      return "adb shell am start";
    case "adb-kill-app":
      return "adb shell am force-stop";
    case "adb-wifi-connect":
      return "adb tcpip 5555";
    case "adb-pair-wireless":
      return "adb pair";
    case "git-status":
      return "git status";
    case "git-log":
      return "git log --oneline -20";
    case "git-diff":
      return "git diff";
    case "git-diff-staged":
      return "git diff --staged";
    case "git-branches":
      return "git branch -a";
    case "git-remotes":
      return "git remote -v";
    case "git-pull":
      return "git pull";
    case "git-push":
      return "git push";
    case "git-fetch":
      return "git fetch";
    case "git-fetch-all":
      return "git fetch --all";
    case "git-pull-rebase":
      return "git pull --rebase";
    case "git-new-branch":
      return "git checkout -b";
    case "git-switch-branch":
      return "git checkout";
    case "git-merge":
      return "git merge";
    case "git-delete-branch":
      return "git branch -d";
    case "git-force-delete":
      return "git branch -D";
    case "git-add-all":
      return "git add .";
    case "git-commit":
      return "git commit -m \"\"";
    case "git-amend":
      return "git commit --amend --no-edit";
    case "git-stash":
      return "git stash";
    case "git-stash-pop":
      return "git stash pop";
    case "git-stash-list":
      return "git stash list";
    case "git-undo-last":
      return "git reset HEAD~1";
    case "git-hard-reset":
      return "git reset --hard HEAD";
    case "git-clean":
      return "git clean -fd";
    case "git-discard-file":
      return "git checkout --";
    case "tools-kotlin-version":
      return "kotlinc -version";
    case "tools-java-version":
      return "java -version";
    case "tools-javac-version":
      return "javac -version";
    case "tools-sdk-manager":
      return "sdkmanager --list";
    case "tools-avd-manager":
      return "avdmanager list avd";
    case "tools-list-targets":
      return "avdmanager list target";
    case "tools-list-devices":
      return "avdmanager list device";
    case "tools-node-version":
      return "node --version";
    case "tools-npm-version":
      return "npm.cmd --version";
    case "tools-npx-version":
      return "npx.cmd --version";
    case "tools-list-global":
      return "npm.cmd list -g --depth=0";
    case "tools-clear-cache":
      return "npm.cmd cache clean --force";
    case "tools-check-updates":
      return "npx.cmd npm-check-updates";
    case "tools-gradle-version":
      return "gradle --version";
    case "tools-gradle-daemon":
      return "gradle --status";
    case "tools-stop-daemon":
      return "gradle --stop";
    case "tools-gradle-scan":
      return "gradlew.bat --scan";
    case "tools-disk-usage":
      return "dir /s";
    case "tools-processes":
      return "tasklist";
    case "tools-kill-process":
      return "taskkill /F /IM";
    case "tools-env-vars":
      return "set";
    case "tools-path-var":
      return "echo %PATH%";
    case "tools-ip-address":
      return "ipconfig";
    case "custom":
    default:
      return "";
  }
};

export const detectProjectWorkflows = (project: Project | undefined): ProjectWorkflowHints => {
  const snapshot = project?.snapshot;
  const android =
    project?.projectType === "Android App" ||
    hasAny(snapshot?.filesFound, /(^|[\\/])(gradlew\.bat|settings\.gradle)$/i) ||
    hasAny(snapshot?.filesFound, /(^|[\\/])app[\\/]src[\\/]main($|[\\/])/i) ||
    hasAny(snapshot?.buildSystems, /^Gradle$/i) ||
    hasAny(snapshot?.detectedTypes, /^Android$/i) ||
    hasAny(snapshot?.frameworks, /^Android$/i);
  const node =
    hasAny(snapshot?.filesFound, /(^|[\\/])(package\.json|electron-builder\.json|vite\.config\.[jt]s)$/i) ||
    hasAny(snapshot?.majorSourceFolders, /^node_modules$/i) ||
    hasAny(snapshot?.buildSystems, /^npm$/i) ||
    hasAny(snapshot?.detectedTypes, /^(Node|Electron)$/i) ||
    hasAny(snapshot?.frameworks, /^(Node|Vite)$/i);
  return { android, node };
};

export const getBuildCommandPlaceholder = (): string => DEFAULT_BUILD_COMMAND_PLACEHOLDER;

export const selectStartupProjectId = (projects: Project[], lastSelectedProjectId?: string): string => {
  const restored = projects.find((project) => project.id === lastSelectedProjectId);
  return restored?.id || projects[0]?.id || "";
};

export const withProjectBuildCommand = (
  projects: Project[],
  projectId: string,
  command: string,
  preset: BuildCommandPresetId = "custom",
  lastUsedCommand?: string,
): Project[] =>
  projects.map((project) => project.id === projectId
    ? {
      ...project,
      buildCommand: command,
      buildCommandCustom: preset === "custom" ? command : project.buildCommandCustom,
      buildCommandPreset: preset,
      lastBuildCommand: lastUsedCommand ?? project.lastBuildCommand,
    }
    : project);
