import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { appendDiagnosticLog, clearDiagnosticLogs, defaultLicenseState, defaultReleaseSettings, ensureUserDataReady, getReleaseInfo, showSafeFailureDialog, type LicenseState, type ReleaseSettings } from "./release";
import { validateCommandRequest } from "../lib/commandSafety";

type FeatureStatus = "todo" | "in progress" | "done";
type ProjectType = "Android App" | "Desktop App" | "Website" | "Game / Addon" | "3D Print / Maker" | "Robotics / Electronics" | "General Project";
type BuildStatus = "Success" | "Failed" | "Running" | "Waiting Approval";
type ProjectSnapshot = { filesFound: string[]; majorSourceFolders: string[]; totalFileCount: number; frameworks: string[]; buildSystems: string[]; entryPoints: string[]; approxProjectSize: string; detectedTypes: string[]; lastScanTime: string };

type FeatureItem = { id: string; name: string; status: FeatureStatus };
type CommandHistoryItem = { id: string; command: string; timestamp: string; success: boolean; outputPreview: string };
type ArchitectureNotes = { notes: string; importantFiles: string; doNotRewriteAreas: string; knownFragileSystems: string };
type BuildIntelligence = { buildSuccessful: boolean; buildFailed: boolean; kotlinCompileErrors: number; typescriptErrors: number; gradleErrors: number; missingDependencyErrors: number };
type Project = { id: string; name: string; path: string; projectType: ProjectType; appGoal: string; currentPhase: string; features: FeatureItem[]; memoryNotes: string; noRewriteRules: string; buildLogs: string; buildCommand?: string; buildCommandPreset?: string; buildCommandCustom?: string; lastBuildCommand?: string; buildStatus?: BuildStatus; commandHistory: CommandHistoryItem[]; snapshot?: ProjectSnapshot; architectureNotes: ArchitectureNotes; buildIntel?: BuildIntelligence };
type ApprovalItem = { id: string; projectId: string; kind: "prompt" | "command"; title: string; payload: string; status: "pending" | "approved" | "sent" | "completed" | "failed" | "rejected"; createdAt: string; approvedAt?: string; sentAt?: string; completedAt?: string; failedAt?: string };
type AppState = { projects: Project[]; approvals: ApprovalItem[]; releaseSettings?: ReleaseSettings; license?: LicenseState; settings: { openAiApiKeyPlaceholder: string; ollamaPlaceholder: string; vsCodeExecutable: string; androidStudioExecutable: string; projectRootPath: string; gradleWrapperPath: string; terminalPath: string; lastSelectedProjectId?: string } };
type CommandRequest = { projectId: string; command: string; args: string[]; cwd?: string };
type ProviderStatus = "connected" | "configured" | "not-configured" | "disconnected" | "disabled" | "placeholder" | "missing_api_key" | "unreachable" | "local_only" | "unavailable";
type ProviderTestInput = { displayName: string; apiKey: string; baseUrl: string; modelName: string; timeout: number; localOnly: boolean; enabled: boolean; status: ProviderStatus };

let ollamaProcess: ReturnType<typeof spawn> | null = null;

const startOllama = (): { started: boolean; message: string } => {
  if (ollamaProcess && !ollamaProcess.killed) {
    return { started: true, message: "Ollama already running." };
  }
  try {
    ollamaProcess = spawn("ollama", ["serve"], {
      detached: false,
      shell: true,
      stdio: "ignore"
    });
    ollamaProcess.on("error", (err) => {
      appendDiagnosticLog(`Ollama start error: ${String(err)}`);
      ollamaProcess = null;
    });
    ollamaProcess.on("exit", (code) => {
      appendDiagnosticLog(`Ollama exited with code ${String(code)}`);
      ollamaProcess = null;
    });
    return { started: true, message: "Ollama serve started." };
  } catch (err) {
    return { started: false, message: `Failed to start Ollama: ${String(err)}` };
  }
};

const stopOllama = (): void => {
  if (ollamaProcess && !ollamaProcess.killed) {
    ollamaProcess.kill();
    ollamaProcess = null;
  }
};

const defaultState: AppState = { projects: [], approvals: [], releaseSettings: defaultReleaseSettings, license: defaultLicenseState, settings: { openAiApiKeyPlaceholder: "", ollamaPlaceholder: "", vsCodeExecutable: "", androidStudioExecutable: "", projectRootPath: "", gradleWrapperPath: "", terminalPath: "", lastSelectedProjectId: "" } };
let mainWindow: BrowserWindow | null = null;
let state: AppState = defaultState;
const getDataPath = (): string => path.join(app.getPath("userData"), "kcx-studio-companion-state.json");
const backupState = (): void => {
  try {
    const file = getDataPath();
    if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.bak`);
  } catch (error) {
    appendDiagnosticLog(`state backup failed: ${String(error)}`);
  }
};
const saveState = (): void => {
  ensureUserDataReady();
  if (state.releaseSettings?.backupOnSave !== false) backupState();
  const tempPath = `${getDataPath()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), "utf8");
  fs.renameSync(tempPath, getDataPath());
};

const normalizeState = (candidate: Partial<AppState>): AppState => ({
  ...defaultState,
  ...candidate,
  projects: Array.isArray(candidate.projects) ? candidate.projects.filter((p) => p && typeof p.id === "string" && typeof p.name === "string").map((p) => ({
    ...p,
    path: typeof p.path === "string" ? p.path : "",
    projectType: p.projectType || "Android App",
    currentPhase: p.currentPhase || "Idea",
    features: Array.isArray(p.features) ? p.features : [],
    commandHistory: Array.isArray(p.commandHistory) ? p.commandHistory : [],
    buildCommand: typeof p.buildCommand === "string" ? p.buildCommand : "",
    buildCommandPreset: typeof p.buildCommandPreset === "string" ? p.buildCommandPreset : "custom",
    buildCommandCustom: typeof p.buildCommandCustom === "string" ? p.buildCommandCustom : "",
    lastBuildCommand: typeof p.lastBuildCommand === "string" ? p.lastBuildCommand : "",
    buildStatus: p.buildStatus || "Waiting Approval",
    architectureNotes: p.architectureNotes || { notes: "", importantFiles: "", doNotRewriteAreas: "", knownFragileSystems: "" }
  })) : [],
  approvals: Array.isArray(candidate.approvals) ? candidate.approvals : [],
  releaseSettings: { ...defaultReleaseSettings, ...(candidate.releaseSettings || {}) },
  license: { ...defaultLicenseState, ...(candidate.license || {}) },
  settings: { ...defaultState.settings, ...(candidate.settings || {}) }
});

const loadState = (): AppState => {
  try {
    const file = getDataPath();
    if (!fs.existsSync(file)) return defaultState;
    return normalizeState(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch (error) {
    appendDiagnosticLog(`state load failed: ${String(error)}`);
    try {
      const backup = `${getDataPath()}.bak`;
      if (fs.existsSync(backup)) return normalizeState(JSON.parse(fs.readFileSync(backup, "utf8")));
    } catch (backupError) {
      appendDiagnosticLog(`state backup load failed: ${String(backupError)}`);
    }
    showSafeFailureDialog("KCx Studio Companion recovered storage", "Saved state could not be read, so the app started with a clean local workspace. A backup file is kept next to the state file when available.");
    return defaultState;
  }
};

const runCommand = (request: CommandRequest, sender?: any): Promise<{ success: boolean; output: string; code: number | null }> => new Promise((resolve) => {
  const safety = validateCommandRequest(request);
  if (!safety.ok) {
    appendDiagnosticLog(`command blocked: ${safety.reason || "unknown reason"}`);
    resolve({ success: false, output: `Command blocked: ${safety.reason || "unsafe command request"}`, code: -1 });
    return;
  }
  const child = spawn(request.command, request.args, { cwd: request.cwd, shell: true });
  let output = "";
  child.stdout.on("data", (d) => {
    const text = d.toString();
    output += text;
    if (sender) {
      text.trim().split('\n').forEach((line: string) => {
        if (line.trim()) {
          const payload = { id: `build-${Date.now()}-${Math.random()}`, at: new Date().toISOString(), label: line.trim(), level: 'info' };
          appendDiagnosticLog(`build stdout: ${line.trim()}`);
          sender.send('build-output-line', payload);
        }
      });
    }
  });
  child.stderr.on("data", (d) => {
    const text = d.toString();
    output += text;
    if (sender) {
      text.trim().split('\n').forEach((line: string) => {
        if (line.trim()) {
          const payload = { id: `build-${Date.now()}-${Math.random()}`, at: new Date().toISOString(), label: line.trim(), level: 'warning' };
          appendDiagnosticLog(`build stderr: ${line.trim()}`);
          sender.send('build-output-line', payload);
        }
      });
    }
  });
  child.on("close", (code) => resolve({ success: code === 0, output, code }));
  child.on("error", (err) => resolve({ success: false, output: String(err), code: -1 }));
});

const scanProject = (rootPath: string): ProjectSnapshot => {
  const wanted = ["package.json", "build.gradle", "settings.gradle", "gradle.properties", "AndroidManifest.xml", "README.md", "tsconfig.json", "vite.config.ts", "vite.config.js", "electron-builder.json", "electron.vite.config.ts"];
  const found = new Set<string>();
  const folders = new Set<string>();
  const extCount = new Map<string, number>();
  let total = 0;
  let size = 0;
  const topEntries = fs.existsSync(rootPath) ? fs.readdirSync(rootPath, { withFileTypes: true }) : [];
  topEntries.forEach((e) => { if (e.isDirectory()) folders.add(e.name); });

  const walk = (dir: string) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (["node_modules", ".git", "dist", "build", "out"].includes(e.name)) continue;
        walk(full);
      } else {
        total += 1;
        try { size += fs.statSync(full).size; } catch { }
        const ext = path.extname(e.name).toLowerCase();
        extCount.set(ext, (extCount.get(ext) || 0) + 1);
        if (wanted.includes(e.name)) found.add(path.relative(rootPath, full));
      }
    }
  };
  if (fs.existsSync(rootPath)) walk(rootPath);

  const frameworks: string[] = [];
  const buildSystems: string[] = [];
  const entryPoints: string[] = [];
  const detectedTypes: string[] = [];
  const has = (name: string) => Array.from(found).some((f) => f.endsWith(name));
  if (has("package.json")) { frameworks.push("Node"); buildSystems.push("npm"); detectedTypes.push("Node"); }
  if (has("vite.config.ts") || has("vite.config.js")) { frameworks.push("Vite"); }
  if (has("tsconfig.json")) { frameworks.push("TypeScript"); detectedTypes.push("TypeScript"); }
  if (has("build.gradle") || has("settings.gradle")) { buildSystems.push("Gradle"); detectedTypes.push("Android"); }
  if (has("AndroidManifest.xml")) { frameworks.push("Android"); }
  if (has("electron.vite.config.ts") || has("electron-builder.json") || has("main.ts")) { detectedTypes.push("Electron"); }
  if ((extCount.get(".tsx") || 0) > 0 || (extCount.get(".jsx") || 0) > 0) detectedTypes.push("React");
  if ((extCount.get(".kt") || 0) > 0) detectedTypes.push("Kotlin");
  if ((extCount.get(".py") || 0) > 0) detectedTypes.push("Python");
  if (has(".toc")) detectedTypes.push("WoW Addon");
  if (has("package.json")) entryPoints.push("package.json scripts");
  if (has("AndroidManifest.xml")) entryPoints.push("AndroidManifest.xml");

  return {
    filesFound: Array.from(found).sort(),
    majorSourceFolders: Array.from(folders).slice(0, 12),
    totalFileCount: total,
    frameworks: Array.from(new Set(frameworks)),
    buildSystems: Array.from(new Set(buildSystems)),
    entryPoints,
    approxProjectSize: `${(size / (1024 * 1024)).toFixed(2)} MB`,
    detectedTypes: Array.from(new Set(detectedTypes)),
    lastScanTime: new Date().toISOString()
  };
};

const testProviderConnection = async (provider: ProviderTestInput): Promise<{ status: ProviderStatus; message: string }> => {
  if (!provider.enabled) return { status: "disabled", message: "Provider disabled." };
  if (provider.status === "placeholder") return { status: "placeholder", message: "Placeholder provider." };
  if (provider.localOnly && !provider.apiKey.trim()) return { status: "local_only", message: "Local-only provider ready." };
  if (!provider.localOnly && !provider.apiKey.trim()) return { status: "missing_api_key", message: "Missing API key." };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.max(1000, provider.timeout || 5000));
    const endpoint = provider.baseUrl.trim() || "http://127.0.0.1:11434";
    const response = await fetch(endpoint, { method: "GET", signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) return { status: "unreachable", message: `Endpoint responded ${response.status}.` };
    if (!provider.modelName.trim()) return { status: "unavailable", message: "Invalid model." };
    return { status: "connected", message: "Connected." };
  } catch {
    return { status: "unreachable", message: "Endpoint unreachable." };
  }
};


const createWindow = async (): Promise<void> => {
  const preloadPath = path.join(__dirname, "..", "preload", "preload.js");
  const rendererIndexPath = path.join(__dirname, "..", "..", "renderer", "index.html");
  const devUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";
  const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

  mainWindow = new BrowserWindow({
  width: 1400,
  height: 900,
  backgroundColor: "#090f1a",
  webPreferences: {
    preload: preloadPath,
    contextIsolation: true,
    nodeIntegration: false,
    webgl: true  // Enable WebGL/GPU features
  }
});

  mainWindow.webContents.on("did-fail-load", (_event, code, desc, url) => {
    console.error(`[renderer] failed to load: code=${code} desc="${desc}" url="${url}"`);
  });
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    console.error("[renderer] render-process-gone", details);
  });
  mainWindow.webContents.on("console-message", (_event, level, message) => {
    if (level >= 2) {
      console.error(`[renderer-console] ${message}`);
    }
  });

  if (isDev) {
    await mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    await mainWindow.loadFile(rendererIndexPath);
  }
};

// Force GPU acceleration for video playback
app.commandLine.appendSwitch('ignore-gpu-blacklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-hardware-overlays');
app.commandLine.appendSwitch('disable-software-rasterizer');

app.whenReady().then(() => {
  const storage = ensureUserDataReady();
  appendDiagnosticLog(`startup ${JSON.stringify(getReleaseInfo())}`);
  if (!storage.ok) showSafeFailureDialog("KCx Studio Companion storage warning", `Local storage was not writable: ${storage.message}`);
  state = loadState();
  ipcMain.handle("state:get", () => state);
  ipcMain.handle("state:save", (_evt, nextState: AppState) => { state = normalizeState(nextState); saveState(); return state; });
  ipcMain.handle("app:releaseInfo", () => getReleaseInfo());
  ipcMain.handle("diagnostics:clear-logs", async () => clearDiagnosticLogs());
  ipcMain.handle("cmd:run", async (evt, request: CommandRequest) => runCommand(request, evt.sender));
  ipcMain.handle("provider:test", async (_evt, provider: ProviderTestInput) => testProviderConnection(provider));
  ipcMain.handle("project:scan", (_evt, rootPath: string) => {
    console.log("[main] project:scan", rootPath);
    return scanProject(rootPath);
  });
  ipcMain.handle("src:tree", (_evt, rootPath: string) => {
    const SKIP = new Set(["node_modules", ".git", "dist", "build", "out", ".vite"]);
    const lines: string[] = [];
    const walk = (dir: string, prefix: string, depth: number) => {
      if (depth > 4) return;
      let entries: fs.Dirent[];
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      entries.sort((a, b) => {
        if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      for (const e of entries) {
        if (SKIP.has(e.name)) continue;
        lines.push(`${prefix}${e.isDirectory() ? e.name + "/" : e.name}`);
        if (e.isDirectory()) walk(path.join(dir, e.name), prefix + "  ", depth + 1);
      }
    };
    const srcPath = path.join(rootPath, "src");
    if (fs.existsSync(srcPath)) { lines.push("src/"); walk(srcPath, "  ", 1); }
    return lines.join("\n");
  });
  ipcMain.handle("ollama:start", () => startOllama());
  ipcMain.handle("ollama:stop", () => stopOllama());
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => {
  stopOllama();
  if (process.platform !== "darwin") app.quit();
});
