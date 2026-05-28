import {
  DEFAULT_BUILD_COMMAND_PLACEHOLDER,
  DEFAULT_STARTUP_TAB,
  buildCommandPresets,
  createPresetCommand,
  detectProjectWorkflows,
  getProjectBuildCommand,
  getProjectBuildCommandPreset,
  selectStartupProjectId,
  withProjectBuildCommand,
} from "../src/lib/startupState";
import type { Project } from "../src/renderer/types";

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: "project-1",
  name: "Test Project",
  path: "C:\\Projects\\TestProject",
  projectType: "General Project",
  appGoal: "",
  currentPhase: "Build",
  features: [],
  memoryNotes: "",
  noRewriteRules: "",
  buildLogs: "",
  commandHistory: [],
  architectureNotes: { notes: "", importantFiles: "", doNotRewriteAreas: "", knownFragileSystems: "" },
  ...overrides,
});

describe("startup state defaults", () => {
  test("fresh launch opens Dashboard", () => {
    expect(DEFAULT_STARTUP_TAB).toBe("Dashboard");
  });

  test("blank default command for projects without saved command", () => {
    const project = makeProject();
    expect(getProjectBuildCommand(project)).toBe("");
    expect(getProjectBuildCommandPreset(project)).toBe("custom");
    expect(DEFAULT_BUILD_COMMAND_PLACEHOLDER).toBe("Select a preset or enter a command");
  });

  test("selected project restores when the saved id still exists", () => {
    const projects = [
      makeProject({ id: "kcx", name: "KCx Studio Companion" }),
      makeProject({ id: "easy", name: "EasyLauncher" }),
    ];
    expect(selectStartupProjectId(projects, "easy")).toBe("easy");
  });

  test("falls back to the first valid project without forcing KCx Studio Companion", () => {
    const projects = [
      makeProject({ id: "easy", name: "EasyLauncher" }),
      makeProject({ id: "kcx", name: "KCx Studio Companion" }),
    ];
    expect(selectStartupProjectId(projects, "")).toBe("easy");
  });

  test("no auto-generated npm command on startup", () => {
    const project = makeProject({
      name: "KCx Studio Companion",
      projectType: "Desktop App",
      snapshot: {
        filesFound: ["package.json"],
        majorSourceFolders: [],
        totalFileCount: 1,
        frameworks: ["Node"],
        buildSystems: ["npm"],
        entryPoints: ["package.json scripts"],
        approxProjectSize: "1 MB",
        detectedTypes: ["Node"],
        lastScanTime: new Date().toISOString(),
      },
    });
    expect(getProjectBuildCommand(project)).toBe("");
  });
});

describe("build command presets", () => {
  test("full command library preserves existing 41 tiles and adds ADB, Git, and Tools", () => {
    const groups = new Set(buildCommandPresets.map((preset) => preset.group));
    expect(groups.has("ADB")).toBe(true);
    expect(groups.has("Git Status")).toBe(true);
    expect(groups.has("Tools System")).toBe(true);
    expect(buildCommandPresets).toHaveLength(108);
    expect(buildCommandPresets.filter((preset) => preset.id.startsWith("adb-"))).toHaveLength(18);
    expect(buildCommandPresets.filter((preset) => preset.id.startsWith("git-"))).toHaveLength(26);
    expect(buildCommandPresets.filter((preset) => preset.id.startsWith("tools-"))).toHaveLength(23);
  });

  test("Android preset generation uses quoted project root", () => {
    expect(createPresetCommand("android-debug-build", "C:\\Users\\right\\AndroidStudioProjects\\EasyLauncher"))
      .toBe('cd /d "C:\\Users\\right\\AndroidStudioProjects\\EasyLauncher" && gradlew.bat assembleDebug');
    expect(createPresetCommand("android-release-build", "C:\\Users\\right\\AndroidStudioProjects\\EasyLauncher"))
      .toBe('cd /d "C:\\Users\\right\\AndroidStudioProjects\\EasyLauncher" && gradlew.bat assembleRelease');
    expect(createPresetCommand("android-clean", "C:\\Users\\right\\AndroidStudioProjects\\EasyLauncher"))
      .toBe('cd /d "C:\\Users\\right\\AndroidStudioProjects\\EasyLauncher" && gradlew.bat clean');
    expect(createPresetCommand("android-bundle-debug", "C:\\Users\\right\\AndroidStudioProjects\\EasyLauncher"))
      .toBe('cd /d "C:\\Users\\right\\AndroidStudioProjects\\EasyLauncher" && gradlew.bat bundleDebug');
    expect(createPresetCommand("android-bundle-release", "C:\\Users\\right\\AndroidStudioProjects\\EasyLauncher"))
      .toBe('cd /d "C:\\Users\\right\\AndroidStudioProjects\\EasyLauncher" && gradlew.bat bundleRelease');
    expect(createPresetCommand("android-build", "C:\\Users\\right\\AndroidStudioProjects\\EasyLauncher"))
      .toBe('cd /d "C:\\Users\\right\\AndroidStudioProjects\\EasyLauncher" && gradlew.bat build');
    expect(createPresetCommand("android-assemble", "C:\\Users\\right\\AndroidStudioProjects\\EasyLauncher"))
      .toBe('cd /d "C:\\Users\\right\\AndroidStudioProjects\\EasyLauncher" && gradlew.bat assemble');
    expect(createPresetCommand("android-check", "C:\\Users\\right\\AndroidStudioProjects\\EasyLauncher"))
      .toBe('cd /d "C:\\Users\\right\\AndroidStudioProjects\\EasyLauncher" && gradlew.bat check');
  });

  test("Android testing, install, and info presets use Gradle tasks", () => {
    const root = "C:\\Users\\right\\AndroidStudioProjects\\EasyLauncher";
    expect(createPresetCommand("android-unit-tests", root)).toBe(`cd /d "${root}" && gradlew.bat test`);
    expect(createPresetCommand("android-device-tests", root)).toBe(`cd /d "${root}" && gradlew.bat connectedAndroidTest`);
    expect(createPresetCommand("android-lint", root)).toBe(`cd /d "${root}" && gradlew.bat lint`);
    expect(createPresetCommand("android-lint-debug", root)).toBe(`cd /d "${root}" && gradlew.bat lintDebug`);
    expect(createPresetCommand("android-install-debug", root)).toBe(`cd /d "${root}" && gradlew.bat installDebug`);
    expect(createPresetCommand("android-uninstall-all", root)).toBe(`cd /d "${root}" && gradlew.bat uninstallAll`);
    expect(createPresetCommand("android-signing-report", root)).toBe(`cd /d "${root}" && gradlew.bat signingReport`);
    expect(createPresetCommand("android-tasks", root)).toBe(`cd /d "${root}" && gradlew.bat tasks`);
    expect(createPresetCommand("android-properties", root)).toBe(`cd /d "${root}" && gradlew.bat properties`);
    expect(createPresetCommand("android-dependencies", root)).toBe(`cd /d "${root}" && gradlew.bat dependencies`);
    expect(createPresetCommand("android-wrapper", root)).toBe(`cd /d "${root}" && gradlew.bat wrapper`);
  });

  test("Android presets fall back to bare gradlew task without project root", () => {
    expect(createPresetCommand("android-debug-build", "")).toBe("gradlew.bat assembleDebug");
  });

  test("Node and Electron preset generation", () => {
    expect(createPresetCommand("node-install", "D:\\KCxProjects\\KCxStudioCompanion")).toBe("npm.cmd install");
    expect(createPresetCommand("node-build", "D:\\KCxProjects\\KCxStudioCompanion")).toBe("npm.cmd run build");
    expect(createPresetCommand("node-dev", "D:\\KCxProjects\\KCxStudioCompanion")).toBe("npm.cmd run dev");
    expect(createPresetCommand("node-test", "D:\\KCxProjects\\KCxStudioCompanion")).toBe("npm.cmd test");
    expect(createPresetCommand("node-test-watch", "D:\\KCxProjects\\KCxStudioCompanion")).toBe("npm.cmd run test:watch");
    expect(createPresetCommand("node-lint", "D:\\KCxProjects\\KCxStudioCompanion")).toBe("npm.cmd run lint");
    expect(createPresetCommand("node-format", "D:\\KCxProjects\\KCxStudioCompanion")).toBe("npm.cmd run format");
    expect(createPresetCommand("node-clean", "D:\\KCxProjects\\KCxStudioCompanion")).toBe("npm.cmd run clean");
    expect(createPresetCommand("node-audit", "D:\\KCxProjects\\KCxStudioCompanion")).toBe("npm.cmd audit");
    expect(createPresetCommand("node-audit-fix", "D:\\KCxProjects\\KCxStudioCompanion")).toBe("npm.cmd audit fix");
    expect(createPresetCommand("node-outdated", "D:\\KCxProjects\\KCxStudioCompanion")).toBe("npm.cmd outdated");
    expect(createPresetCommand("node-update", "D:\\KCxProjects\\KCxStudioCompanion")).toBe("npm.cmd update");
    expect(createPresetCommand("electron-dev", "D:\\KCxProjects\\KCxStudioCompanion")).toBe("npm.cmd run dev");
    expect(createPresetCommand("electron-package", "D:\\KCxProjects\\KCxStudioCompanion")).toBe("npm.cmd run package");
    expect(createPresetCommand("electron-make", "D:\\KCxProjects\\KCxStudioCompanion")).toBe("npm.cmd run make");
    expect(createPresetCommand("electron-publish", "D:\\KCxProjects\\KCxStudioCompanion")).toBe("npm.cmd run publish");
    expect(createPresetCommand("electron-rebuild", "D:\\KCxProjects\\KCxStudioCompanion")).toBe("npm.cmd run rebuild");
    expect(createPresetCommand("electron-postinstall", "D:\\KCxProjects\\KCxStudioCompanion")).toBe("npm.cmd run postinstall");
  });

  test("EasyLauncher Gradle command comes from explicit preset", () => {
    const command = createPresetCommand("android-debug-build", "C:\\Users\\right\\AndroidStudioProjects\\EasyLauncher");
    expect(command).toBe('cd /d "C:\\Users\\right\\AndroidStudioProjects\\EasyLauncher" && gradlew.bat assembleDebug');
  });

  test("KCx Studio Companion npm command comes from explicit preset", () => {
    expect(createPresetCommand("node-build", "D:\\KCxProjects\\KCxStudioCompanion")).toBe("npm.cmd run build");
  });

  test("project-root preset generation", () => {
    expect(createPresetCommand("run-from-project-root", "C:\\Projects\\App")).toBe('cd /d "C:\\Projects\\App"');
    expect(createPresetCommand("open-project-root", "C:\\Projects\\App")).toBe('start "" "C:\\Projects\\App"');
    expect(createPresetCommand("open-terminal", "C:\\Projects\\App")).toBe('start cmd /k "cd /d \\"C:\\Projects\\App\\""');
  });

  test("Custom / Blank clears the command field", () => {
    expect(createPresetCommand("custom", "C:\\Projects\\App")).toBe("");
  });

  test("ADB preset generation", () => {
    expect(createPresetCommand("adb-devices")).toBe("adb devices");
    expect(createPresetCommand("adb-install")).toBe("adb install app/build/outputs/apk/debug/app-debug.apk");
    expect(createPresetCommand("adb-uninstall")).toBe("adb uninstall <package>");
    expect(createPresetCommand("adb-logcat-filter")).toBe("adb logcat *:E");
    expect(createPresetCommand("adb-screenshot")).toBe("adb shell screencap -p /sdcard/screen.png && adb pull /sdcard/screen.png");
    expect(createPresetCommand("adb-pair-wireless")).toBe("adb pair");
  });

  test("Git preset generation", () => {
    expect(createPresetCommand("git-status")).toBe("git status");
    expect(createPresetCommand("git-log")).toBe("git log --oneline -20");
    expect(createPresetCommand("git-fetch-all")).toBe("git fetch --all");
    expect(createPresetCommand("git-new-branch")).toBe("git checkout -b");
    expect(createPresetCommand("git-commit")).toBe('git commit -m ""');
    expect(createPresetCommand("git-hard-reset")).toBe("git reset --hard HEAD");
  });

  test("Tools preset generation", () => {
    expect(createPresetCommand("tools-kotlin-version")).toBe("kotlinc -version");
    expect(createPresetCommand("tools-sdk-manager")).toBe("sdkmanager --list");
    expect(createPresetCommand("tools-node-version")).toBe("node --version");
    expect(createPresetCommand("tools-clear-cache")).toBe("npm.cmd cache clean --force");
    expect(createPresetCommand("tools-gradle-scan")).toBe("gradlew.bat --scan");
    expect(createPresetCommand("tools-path-var")).toBe("echo %PATH%");
  });
});

describe("project build command persistence", () => {
  test("per-project command persistence", () => {
    const projects = [
      makeProject({ id: "kcx", buildCommand: "npm.cmd run build", buildCommandPreset: "node-build" }),
      makeProject({ id: "easy", buildCommand: 'cd /d "C:\\EasyLauncher" && gradlew.bat assembleDebug', buildCommandPreset: "android-debug-build" }),
    ];
    expect(getProjectBuildCommand(projects[0])).toBe("npm.cmd run build");
    expect(getProjectBuildCommand(projects[1])).toBe('cd /d "C:\\EasyLauncher" && gradlew.bat assembleDebug');
  });

  test("manual command persistence switches preset to custom", () => {
    const projects = [makeProject({ id: "easy", buildCommandPreset: "android-debug-build" })];
    const updated = withProjectBuildCommand(projects, "easy", "custom gradle command", "custom");
    expect(updated[0].buildCommand).toBe("custom gradle command");
    expect(updated[0].buildCommandCustom).toBe("custom gradle command");
    expect(updated[0].buildCommandPreset).toBe("custom");
  });

  test("last used command persists separately when running", () => {
    const projects = [makeProject({ id: "easy" })];
    const updated = withProjectBuildCommand(projects, "easy", "gradlew.bat assembleDebug", "android-debug-build", "gradlew.bat assembleDebug");
    expect(updated[0].buildCommand).toBe("gradlew.bat assembleDebug");
    expect(updated[0].lastBuildCommand).toBe("gradlew.bat assembleDebug");
  });

  test("project switching restores commands without overwriting other projects", () => {
    const projects = [
      makeProject({ id: "kcx", buildCommand: "npm.cmd run build", buildCommandPreset: "node-build" }),
      makeProject({ id: "easy", buildCommand: 'cd /d "C:\\EasyLauncher" && gradlew.bat assembleDebug', buildCommandPreset: "android-debug-build" }),
    ];
    const updated = withProjectBuildCommand(projects, "easy", "custom gradle command", "custom");
    expect(getProjectBuildCommand(updated.find((project) => project.id === "easy"))).toBe("custom gradle command");
    expect(getProjectBuildCommandPreset(updated.find((project) => project.id === "easy"))).toBe("custom");
    expect(getProjectBuildCommand(updated.find((project) => project.id === "kcx"))).toBe("npm.cmd run build");
    expect(getProjectBuildCommandPreset(updated.find((project) => project.id === "kcx"))).toBe("node-build");
  });
});

describe("project workflow hints", () => {
  test("detects Android indicators only for suggestions", () => {
    const project = makeProject({
      snapshot: {
        filesFound: ["gradlew.bat", "settings.gradle", "app/src/main/AndroidManifest.xml"],
        majorSourceFolders: ["app"],
        totalFileCount: 3,
        frameworks: ["Android"],
        buildSystems: ["Gradle"],
        entryPoints: ["AndroidManifest.xml"],
        approxProjectSize: "1 MB",
        detectedTypes: ["Android", "Kotlin"],
        lastScanTime: new Date().toISOString(),
      },
    });
    expect(detectProjectWorkflows(project).android).toBe(true);
  });

  test("detects Node/Electron indicators only for suggestions", () => {
    const project = makeProject({
      projectType: "Desktop App",
      snapshot: {
        filesFound: ["package.json", "electron-builder.json", "vite.config.ts"],
        majorSourceFolders: ["node_modules", "src"],
        totalFileCount: 3,
        frameworks: ["Node", "Vite"],
        buildSystems: ["npm"],
        entryPoints: ["package.json scripts"],
        approxProjectSize: "1 MB",
        detectedTypes: ["Node", "Electron"],
        lastScanTime: new Date().toISOString(),
      },
    });
    expect(detectProjectWorkflows(project).node).toBe(true);
  });
});
