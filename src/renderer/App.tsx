import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AiDecisionTrace, AiProvider, AiRoutingRule, AppState, ApprovalItem, BuildAnalysisResult, BuildIntelligence, BuildLogRecord, CommandRequest, PatchReviewRecord, Project, ProjectType, ProviderStatus, ReleaseInfo, SafetyWarning, SystemState, TimelineEvent, TimelineType } from "./types";
import { ThemeSwitcher } from "../components/ThemeSwitcher";
import { EcosystemCluster } from "./components/EcosystemCluster";
import { EcosystemStatusPanel } from "./components/EcosystemStatusPanel";
import { EcosystemTest } from "./components/EcosystemTest";
import { DashboardBackground } from "./components/DashboardBackground";
import kcxEcosystemReference from "./assets/kcx-ecosystem-reference.png";
import kcxDashboardBg from "./assets/branding/kcx-dashboard-bg.png";
import { ValhallaPage } from "./valhalla/ValhallaPage";
import { cortexEventBus } from "./cortex/CortexEventBus";
import { cortexRuntime } from "./cortex/CortexRuntime";
import { clearSystemLogs } from "./system/clearSystemLogs";
import { BuildCommandPresetId, DEFAULT_STARTUP_TAB, detectProjectWorkflows, createPresetCommand, getBuildCommandPlaceholder, getProjectBuildCommand, getProjectBuildCommandPreset, selectStartupProjectId, withProjectBuildCommand } from "../lib/startupState";

const coreWorkflowNavItems = ["Dashboard", "Projects", "Project Memory"] as const;
const aiOperationsNavItems = ["Prompt Generator", "Approval Queue", "AI Providers"] as const;
const developmentNavItems = ["Build Logs", "Patch Review", "Project Context", "Session Timeline"] as const;
const systemNavItems = ["Settings", "Telemetry"] as const;
const productInfoNavItems = ["About", "Release Notes", "First Launch", "Product Foundation"] as const;
const devDebugNavItems = ["Development Tools", "Ecosystem Test"] as const;
const navItems = [...coreWorkflowNavItems, ...aiOperationsNavItems, ...developmentNavItems, ...systemNavItems, ...productInfoNavItems, ...devDebugNavItems] as const;
const sectionKey = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const projectTypes: ProjectType[] = ["Android App", "Desktop App", "Website", "Game / Addon", "3D Print / Maker", "Robotics / Electronics", "General Project"];
const phases = ["Idea", "Plan", "Build", "Test", "Fix", "Finalize"];
type PresetActiveTab = "android" | "node" | "electron" | "root" | "adb" | "git" | "tools" | "reset";
const commandPresetGroups: Array<{ id: string; label: string; colorClass: string; tiles: Array<{ id: BuildCommandPresetId; label: string }> }> = [
  { id: "android-builds", label: "Android Builds", colorClass: "preset-tile-android", tiles: [
    { id: "android-debug-build", label: "Debug Build" },
    { id: "android-release-build", label: "Release Build" },
    { id: "android-clean", label: "Clean" },
    { id: "android-bundle-debug", label: "Bundle Debug" },
    { id: "android-bundle-release", label: "Bundle Release" },
    { id: "android-build", label: "Build" },
    { id: "android-assemble", label: "Assemble" },
    { id: "android-check", label: "Check" }
  ] },
  { id: "android-testing", label: "Android Testing", colorClass: "preset-tile-android-test", tiles: [
    { id: "android-unit-tests", label: "Unit Tests" },
    { id: "android-device-tests", label: "Device Tests" },
    { id: "android-lint", label: "Lint" },
    { id: "android-lint-debug", label: "Lint Debug" }
  ] },
  { id: "android-install", label: "Android Install", colorClass: "preset-tile-android-install", tiles: [
    { id: "android-install-debug", label: "Install Debug" },
    { id: "android-uninstall-all", label: "Uninstall All" },
    { id: "android-signing-report", label: "Signing Report" }
  ] },
  { id: "android-info", label: "Android Info", colorClass: "preset-tile-android-info", tiles: [
    { id: "android-tasks", label: "Tasks" },
    { id: "android-properties", label: "Properties" },
    { id: "android-dependencies", label: "Dependencies" },
    { id: "android-wrapper", label: "Wrapper" }
  ] },
  { id: "node-npm", label: "Node / NPM", colorClass: "preset-tile-node", tiles: [
    { id: "node-install", label: "Install" },
    { id: "node-build", label: "Build" },
    { id: "node-dev", label: "Dev" },
    { id: "node-test", label: "Test" },
    { id: "node-test-watch", label: "Test Watch" },
    { id: "node-lint", label: "Lint" },
    { id: "node-format", label: "Format" },
    { id: "node-clean", label: "Clean" },
    { id: "node-audit", label: "Audit" },
    { id: "node-audit-fix", label: "Audit Fix" },
    { id: "node-outdated", label: "Outdated" },
    { id: "node-update", label: "Update" }
  ] },
  { id: "electron", label: "Electron", colorClass: "preset-tile-electron", tiles: [
    { id: "electron-dev", label: "Dev" },
    { id: "electron-package", label: "Package" },
    { id: "electron-make", label: "Make" },
    { id: "electron-publish", label: "Publish" },
    { id: "electron-rebuild", label: "Rebuild" },
    { id: "electron-postinstall", label: "Postinstall" }
  ] },
  { id: "project-root", label: "Project Root", colorClass: "preset-tile-root", tiles: [
    { id: "open-project-root", label: "Open in Explorer" },
    { id: "run-from-project-root", label: "Run From Root" },
    { id: "open-terminal", label: "Open Terminal" }
  ] },
  { id: "adb", label: "ADB", colorClass: "preset-tile-adb", tiles: [
    { id: "adb-devices", label: "Devices" },
    { id: "adb-install", label: "Install APK" },
    { id: "adb-uninstall", label: "Uninstall" },
    { id: "adb-logcat", label: "Logcat" },
    { id: "adb-logcat-clear", label: "Logcat Clear" },
    { id: "adb-logcat-filter", label: "Logcat Filter" },
    { id: "adb-screenshot", label: "Screenshot" },
    { id: "adb-reboot", label: "Reboot" },
    { id: "adb-reboot-recovery", label: "Reboot Recovery" },
    { id: "adb-shell", label: "Shell" },
    { id: "adb-push", label: "Push File" },
    { id: "adb-pull", label: "Pull File" },
    { id: "adb-list-packages", label: "List Packages" },
    { id: "adb-clear-app", label: "Clear App Data" },
    { id: "adb-start-app", label: "Start App" },
    { id: "adb-kill-app", label: "Kill App" },
    { id: "adb-wifi-connect", label: "WiFi Connect" },
    { id: "adb-pair-wireless", label: "Pair Wireless" }
  ] },
  { id: "git-status", label: "Status", colorClass: "preset-tile-git", tiles: [
    { id: "git-status", label: "Status" },
    { id: "git-log", label: "Log" },
    { id: "git-diff", label: "Diff" },
    { id: "git-diff-staged", label: "Staged Diff" },
    { id: "git-branches", label: "Branches" },
    { id: "git-remotes", label: "Remotes" }
  ] },
  { id: "git-sync", label: "Sync", colorClass: "preset-tile-git", tiles: [
    { id: "git-pull", label: "Pull" },
    { id: "git-push", label: "Push" },
    { id: "git-fetch", label: "Fetch" },
    { id: "git-fetch-all", label: "Fetch All" },
    { id: "git-pull-rebase", label: "Pull Rebase" }
  ] },
  { id: "git-branches", label: "Branches", colorClass: "preset-tile-git", tiles: [
    { id: "git-new-branch", label: "New Branch" },
    { id: "git-switch-branch", label: "Switch Branch" },
    { id: "git-merge", label: "Merge" },
    { id: "git-delete-branch", label: "Delete Branch" },
    { id: "git-force-delete", label: "Force Delete" }
  ] },
  { id: "git-commits", label: "Commits", colorClass: "preset-tile-git", tiles: [
    { id: "git-add-all", label: "Add All" },
    { id: "git-commit", label: "Commit" },
    { id: "git-amend", label: "Amend" },
    { id: "git-stash", label: "Stash" },
    { id: "git-stash-pop", label: "Stash Pop" },
    { id: "git-stash-list", label: "Stash List" }
  ] },
  { id: "git-reset", label: "Reset", colorClass: "preset-tile-git", tiles: [
    { id: "git-undo-last", label: "Undo Last" },
    { id: "git-hard-reset", label: "Hard Reset" },
    { id: "git-clean", label: "Clean" },
    { id: "git-discard-file", label: "Discard File" }
  ] },
  { id: "tools-kotlin-java", label: "Kotlin/Java", colorClass: "preset-tile-tools", tiles: [
    { id: "tools-kotlin-version", label: "Kotlin Version" },
    { id: "tools-java-version", label: "Java Version" },
    { id: "tools-javac-version", label: "Javac Version" }
  ] },
  { id: "tools-android-sdk", label: "Android SDK", colorClass: "preset-tile-tools", tiles: [
    { id: "tools-sdk-manager", label: "SDK Manager" },
    { id: "tools-avd-manager", label: "AVD Manager" },
    { id: "tools-list-targets", label: "List Targets" },
    { id: "tools-list-devices", label: "List Devices" }
  ] },
  { id: "tools-node-system", label: "Node/System", colorClass: "preset-tile-tools", tiles: [
    { id: "tools-node-version", label: "Node Version" },
    { id: "tools-npm-version", label: "NPM Version" },
    { id: "tools-npx-version", label: "NPX Version" },
    { id: "tools-list-global", label: "List Global Pkgs" },
    { id: "tools-clear-cache", label: "Clear NPM Cache" },
    { id: "tools-check-updates", label: "Check Updates" }
  ] },
  { id: "tools-gradle", label: "Gradle", colorClass: "preset-tile-tools", tiles: [
    { id: "tools-gradle-version", label: "Gradle Version" },
    { id: "tools-gradle-daemon", label: "Gradle Daemon" },
    { id: "tools-stop-daemon", label: "Stop Daemon" },
    { id: "tools-gradle-scan", label: "Gradle Scan" }
  ] },
  { id: "tools-system", label: "System", colorClass: "preset-tile-tools", tiles: [
    { id: "tools-disk-usage", label: "Disk Usage" },
    { id: "tools-processes", label: "Running Processes" },
    { id: "tools-kill-process", label: "Kill Process" },
    { id: "tools-env-vars", label: "Environment Vars" },
    { id: "tools-path-var", label: "Path Variable" },
    { id: "tools-ip-address", label: "IP Address" }
  ] },
  { id: "reset", label: "Reset", colorClass: "preset-tile-reset", tiles: [
    { id: "custom", label: "Custom / Blank" }
  ] }
];
const presetGroupIdsByTab: Record<PresetActiveTab, string[]> = {
  android: ["android-builds", "android-testing", "android-install", "android-info"],
  node: ["node-npm"],
  electron: ["electron"],
  root: ["project-root"],
  adb: ["adb"],
  git: ["git-status", "git-sync", "git-branches", "git-commits", "git-reset"],
  tools: ["tools-kotlin-java", "tools-android-sdk", "tools-node-system", "tools-gradle", "tools-system"],
  reset: ["reset"]
};
const getPresetActiveTab = (preset: BuildCommandPresetId): PresetActiveTab => {
  if (preset.startsWith("node-")) return "node";
  if (preset.startsWith("electron-")) return "electron";
  if (preset.startsWith("android-")) return "android";
  if (preset.startsWith("adb-")) return "adb";
  if (preset.startsWith("git-")) return "git";
  if (preset.startsWith("tools-")) return "tools";
  if (preset === "open-project-root" || preset === "run-from-project-root" || preset === "open-terminal") return "root";
  return "android";
};
const id = () => crypto.randomUUID();
type TelemetryLevel = "info" | "processing" | "warning" | "error";
type SystemTelemetryEvent = {
  id: string;
  at: string;
  label: string;
  level?: TelemetryLevel;
};
const defaultProviders: AiProvider[] = [
  { providerId: "local-kcx", displayName: "Local KCx Brain", enabled: true, preferred: true, status: "connected", apiKey: "", baseUrl: "http://127.0.0.1", modelName: "kcx-local", timeout: 5000, localOnly: true, supportsStreaming: false, capabilities: ["offline_orchestrator", "workflow_routing", "safety_warnings", "next_step_suggestions", "risk_analysis", "build_parsing", "summarizer"] },
  { providerId: "codex-handoff", displayName: "Codex Handoff", enabled: false, preferred: false, status: "disconnected", apiKey: "", baseUrl: "", modelName: "", timeout: 5000, localOnly: true, supportsStreaming: false, capabilities: ["coding_assistant", "patch_review"] },
  { providerId: "ollama", displayName: "Ollama", enabled: false, preferred: false, status: "configured", apiKey: "", baseUrl: "http://127.0.0.1:11434", modelName: "phi3:latest", timeout: 5000, localOnly: true, supportsStreaming: true, capabilities: ["summarizer", "planning_engine", "offline_orchestrator"] },
];
const defaultRouting: AiRoutingRule[] = [
  { task: "build_parsing", provider: "Local KCx Brain", reason: "Local build classification hook" },
  { task: "coding_patch", provider: "Codex Handoff", reason: "Coding assistant routing" },
  { task: "summaries", provider: "Ollama", reason: "Local summarizer hook" },
  { task: "planning", provider: "Ollama", reason: "Local planning route" },
  { task: "prompt_cleanup", provider: "Local KCx Brain", reason: "Prompt cleanup hook" },
  { task: "workflow_routing", provider: "Local KCx Brain", reason: "Offline orchestrator hook" },
  { task: "safety_warnings", provider: "Local KCx Brain", reason: "Safety layer hook" },
  { task: "next_step_suggestions", provider: "Ollama", reason: "Local next-step suggestion hook" },
];
const defaultState: AppState = { projects: [], approvals: [], timeline: [], aiDecisionTrace: [], safetyWarnings: [], aiProviders: defaultProviders, aiRoutingRules: defaultRouting, releaseSettings: { diagnosticsEnabled: true, telemetryEnabled: false, experimentalFeaturesEnabled: false, backupOnSave: true, buildChannel: "private-beta", updateChannel: "manual" }, license: { mode: "community", licenseKeyHash: "", entitlements: ["local_orchestration", "project_memory", "manual_provider_routing"] }, settings: { openAiApiKeyPlaceholder: "", ollamaPlaceholder: "", vsCodeExecutable: "", androidStudioExecutable: "", projectRootPath: "", gradleWrapperPath: "", terminalPath: "", lastSelectedProjectId: "" } };
const parseBuildIntel = (logs: string): BuildIntelligence => ({ buildSuccessful: /BUILD SUCCESSFUL/i.test(logs), buildFailed: /BUILD FAILED/i.test(logs), kotlinCompileErrors: (logs.match(/kotlin.*error|e:\s.*\.kt[:\s]|\.kt:\d+|Unresolved reference|Expecting an expression|Expecting member declaration/gi) || []).length, typescriptErrors: (logs.match(/TS\d{4}|typescript.*error/gi) || []).length, gradleErrors: (logs.match(/gradle.*error|\* What went wrong/gi) || []).length, missingDependencyErrors: (logs.match(/cannot find module|could not resolve|missing dependency|unresolved reference/gi) || []).length });
const isValidOllamaEndpoint = (baseUrl: string) => {
  try {
    const url = new URL(baseUrl.trim());
    return (url.protocol === "http:" || url.protocol === "https:") && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  } catch {
    return false;
  }
};
const getOllamaProviderStatus = (provider: AiProvider, enabled = provider.enabled): ProviderStatus => {
  if (!enabled) return "disabled";
  return isValidOllamaEndpoint(provider.baseUrl || "") ? "configured" : "not-configured";
};
const REMOVED_PROVIDER_IDS = new Set(["openai", "openrouter", "groq", "gemini"]);
const isRemovedProvider = (provider: Partial<AiProvider> & { name?: string; id?: string }) => {
  const pid = provider.providerId ?? (provider as { id?: string }).id ?? "";
  return REMOVED_PROVIDER_IDS.has(pid);
};
const normalizeAiProviders = (
  savedProviders: AppState["aiProviders"] | undefined,
  ollamaRuntimeStatus?: { enabled: boolean }
): AiProvider[] => {
  const source = [...(Array.isArray(savedProviders) ? savedProviders : []), ...defaultProviders];
  const seen = new Set<string>();
  return source
    .filter((provider) => !isRemovedProvider(provider))
    .map((provider, index) => {
      const providerId = provider.providerId || (provider as { id?: string }).id || defaultProviders[index]?.providerId || `provider-${index}`;
      const fallback = defaultProviders.find((entry) => entry.providerId === providerId) || defaultProviders[index] || defaultProviders[0];
      return {
        ...fallback,
        ...provider,
        providerId,
        displayName: ((provider as { displayName?: string; name?: string }).displayName || (provider as { displayName?: string; name?: string }).name || fallback.displayName) as AiProvider["displayName"]
      };
    })
    .filter((provider) => {
      if (seen.has(provider.providerId)) return false;
      seen.add(provider.providerId);
      return true;
    })
    .map((provider) => {
      if (provider.providerId === "local-kcx") return { ...provider, enabled: true, preferred: true, status: "connected" as const };
      if (provider.providerId === "codex-handoff") return { ...provider, enabled: false, preferred: false, status: "disconnected" as const };
      if (provider.providerId === "ollama") {
        const forced = { ...provider, baseUrl: "http://127.0.0.1:11434", modelName: "phi3:latest", localOnly: true };
        if (ollamaRuntimeStatus) {
          return { ...forced, enabled: ollamaRuntimeStatus.enabled, status: getOllamaProviderStatus(forced, ollamaRuntimeStatus.enabled) };
        }
        return forced;
      }
      return provider;
    });
};

export function App() {
  const [showValhalla, setShowValhalla] = useState(false);

  const [state, setState] = useState<AppState>(defaultState);
  const [tab, setTab] = useState<(typeof navItems)[number]>(DEFAULT_STARTUP_TAB);
  const [projectId, setProjectId] = useState("");
  const [projectForm, setProjectForm] = useState({ name: "", path: "", projectType: "Android App" as ProjectType, appGoal: "", currentPhase: "Idea" });
  const [timelineFilter, setTimelineFilter] = useState("all");
  const [copyStatus, setCopyStatus] = useState<{ id: string; message: string } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanEventAt, setLastScanEventAt] = useState(0);
  const [buildLogInput, setBuildLogInput] = useState("");
  const [buildCommand, setBuildCommand] = useState("");
  const [buildCommandPreset, setBuildCommandPreset] = useState<BuildCommandPresetId>("custom");
  const [presetPanelOpen, setPresetPanelOpen] = useState(false);
  const [presetActiveTab, setPresetActiveTab] = useState<PresetActiveTab>("android");
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });
  const [isBuilding, setIsBuilding] = useState(false);
  const [lastBuildResult, setLastBuildResult] = useState<{ success: boolean; duration: number } | null>(null);
  const [patchReviewInput, setPatchReviewInput] = useState("");
  const [systemState, setSystemState] = useState<SystemState>("idle");
  const [systemTelemetry, setSystemTelemetry] = useState<SystemTelemetryEvent[]>([]);
  const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(null);
  const [telemetryFilter, setTelemetryFilter] = useState<"all" | "warning" | "error">("all");
  const [isEcosystemDockOpen, setIsEcosystemDockOpen] = useState(false);
  const [clearLogsModalOpen, setClearLogsModalOpen] = useState(false);
  const [freshStartModalOpen, setFreshStartModalOpen] = useState(false);
  const [cortexAutoQueue, setCortexAutoQueue] = useState(true);
  const generateFixPromptRef = useRef<(() => Promise<void>) | null>(null);
  const getLatestBuildAnalysisRef = useRef<
    (() => { latest: BuildLogRecord | undefined; issue: BuildAnalysisResult | undefined }) | null
  >(null);
  const presetPanelWrapperRef = useRef<HTMLDivElement>(null);
  const presetPanelRef = useRef<HTMLDivElement>(null);
  const triggerBtnRef = useRef<HTMLButtonElement>(null);
  const isDevelopment = (typeof process !== "undefined" && process.env.NODE_ENV === "development") || import.meta.env.DEV;
  const selectedProject = useMemo(() => state.projects.find((p) => p.id === projectId), [state.projects, projectId]);
  const buildWorkflowHints = useMemo(() => detectProjectWorkflows(selectedProject), [selectedProject]);
  const pendingCount = state.approvals.filter((a) => a.status === "pending").length;
  const sentCount = state.approvals.filter((a) => a.status === "sent").length;
  const completedCount = state.approvals.filter((a) => a.status === "completed").length;
  const failedCount = state.approvals.filter((a) => a.status === "failed").length;
  const updatePresetPanelPosition = () => {
    if (!triggerBtnRef.current) return;
    const rect = triggerBtnRef.current.getBoundingClientRect();
    const top = Math.max(0, Math.min(rect.bottom + 4, window.innerHeight - 500));
    const left = Math.max(0, Math.min(rect.left, window.innerWidth - 560));
    setPanelPos({ top, left });
  };
  useEffect(() => { window.kcxApi.getReleaseInfo().then(setReleaseInfo).catch(() => undefined); }, []);
  useEffect(() => { window.kcxApi.getState().then((saved) => { cortexRuntime.initialize(); const projects = saved.projects.map((p) => ({ ...p, buildCommand: typeof p.buildCommand === "string" ? p.buildCommand : "", buildCommandPreset: typeof p.buildCommandPreset === "string" ? p.buildCommandPreset : "custom", buildCommandCustom: typeof p.buildCommandCustom === "string" ? p.buildCommandCustom : "", lastBuildCommand: typeof p.lastBuildCommand === "string" ? p.lastBuildCommand : "", commandHistory: p.commandHistory || [], buildLogHistory: p.buildLogHistory || [], patchReviewHistory: p.patchReviewHistory || [], buildIntel: p.buildIntel || parseBuildIntel(p.buildLogs || ""), architectureNotes: p.architectureNotes || { notes: "", importantFiles: "", doNotRewriteAreas: "", knownFragileSystems: "" }, projectMemory: p.projectMemory || { projectGoal: p.appGoal || "", importantFiles: "", protectedFiles: "", protectedSymbols: "", doNotRewriteRules: "Do not rewrite working architecture.\nAvoid broad refactors.\nDo not modify protected files unless absolutely required.", workflowNotes: "" } })); const ollamaRuntimeStatus = cortexRuntime.getOllamaRuntimeStatus(); const migratedProviders = normalizeAiProviders(saved.aiProviders, ollamaRuntimeStatus); const nextState: AppState = { ...defaultState, ...saved, settings: { ...defaultState.settings, ...(saved.settings || {}) }, timeline: saved.timeline || [], aiProviders: migratedProviders, aiRoutingRules: saved.aiRoutingRules || defaultRouting, aiDecisionTrace: saved.aiDecisionTrace || [], safetyWarnings: saved.safetyWarnings || [], projects }; const startupProjectId = selectStartupProjectId(projects, nextState.settings.lastSelectedProjectId); const startupProject = projects.find((p) => p.id === startupProjectId); setState(nextState); setProjectId(startupProjectId); setBuildCommand(getProjectBuildCommand(startupProject)); setBuildCommandPreset(getProjectBuildCommandPreset(startupProject)); setTab(DEFAULT_STARTUP_TAB); setShowValhalla(false); setCopyStatus(null); void window.kcxApi.saveState(nextState); const initialTelemetryEvent: SystemTelemetryEvent = { id: crypto.randomUUID(), at: new Date().toISOString(), label: "App/session initialized", level: "info" }; setSystemTelemetry((prev) => [initialTelemetryEvent, ...prev].slice(0, 8)); }); }, []);
  useEffect(() => {
    const removeListener = window.kcxApi.onBuildOutputLine((event: SystemTelemetryEvent) => {
      console.log('[renderer] onBuildOutputLine received — id:', event?.id, 'at:', event?.at, 'label:', event?.label, 'level:', event?.level);
      setSystemTelemetry((prev) => [event, ...prev].slice(0, 8));
      cortexRuntime.receiveLiveLogLine(event.label || "");
    });
    return removeListener;
  }, []);
  useEffect(() => {
    if (!isEcosystemDockOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsEcosystemDockOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isEcosystemDockOpen]);
  useEffect(() => {
    if (!presetPanelOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const isInsideWrapper = presetPanelWrapperRef.current?.contains(target);
      const isInsidePanel = presetPanelRef.current?.contains(target);
      if (!isInsideWrapper && !isInsidePanel) {
        setPresetPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [presetPanelOpen]);
  useEffect(() => {
    if (!presetPanelOpen) return;
    updatePresetPanelPosition();
    const onReposition = () => updatePresetPanelPosition();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [presetPanelOpen]);
  useEffect(() => {
    if (!presetPanelOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPresetPanelOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [presetPanelOpen]);
  useEffect(() => {
    if (!isDevelopment && (tab === "Development Tools" || tab === "Ecosystem Test")) {
      setTab("Dashboard");
    }
  }, [isDevelopment, tab]);
  useEffect(() => {
    if (!selectedProject) return;
    const ollamaProvider = state.aiProviders.find(p => p.providerId === "ollama");
    cortexEventBus.emit("project-context-updated", "project-context-changed", {
      projectName: selectedProject.name,
      buildLogTail: (selectedProject.buildLogs ?? "").slice(-800),
      lastErrorType: selectedProject.buildLogHistory?.[0]?.analysis?.[0]?.detectedType ?? "",
      ollamaStatus: ollamaProvider?.status ?? "unknown",
      filesFound: selectedProject.snapshot?.filesFound?.slice(0, 20),
      frameworks: selectedProject.snapshot?.frameworks,
      majorSourceFolders: selectedProject.snapshot?.majorSourceFolders?.slice(0, 8),
      detectedTypes: selectedProject.snapshot?.detectedTypes
    });
  }, [selectedProject, state.aiProviders]);
  useEffect(() => cortexEventBus.subscribe((event) => {
    if (event.type !== "cortex-status-changed" || typeof event.payload?.ollamaEnabled !== "boolean") return;
    const enabled = Boolean(event.payload.ollamaEnabled);
    setState((current) => {
      const nextState = {
        ...current,
        aiProviders: current.aiProviders.map((provider) =>
          provider.providerId === "ollama"
            ? { ...provider, enabled, status: getOllamaProviderStatus(provider, enabled) }
            : provider
        )
      };
      void window.kcxApi.saveState(nextState);
      return nextState;
    });
  }), []);
  const persist = async (next: AppState) => { setState(next); await window.kcxApi.saveState(next); };
  const pushEvent = (type: TimelineType, summary: string, details?: string, pid?: string): TimelineEvent => ({ id: id(), timestamp: new Date().toISOString(), type, projectId: pid || selectedProject?.id || "", summary, details });
  const upProject = async (updates: Partial<Project>) => { if (!selectedProject) return; await persist({ ...state, projects: state.projects.map((p) => p.id === selectedProject.id ? { ...p, ...updates } : p) }); };
  const handleProjectChange = async (nextProjectId: string) => {
    const nextProject = state.projects.find((p) => p.id === nextProjectId);
    setProjectId(nextProjectId);
    setBuildCommand(getProjectBuildCommand(nextProject));
    setBuildCommandPreset(getProjectBuildCommandPreset(nextProject));
    await persist({ ...state, settings: { ...state.settings, lastSelectedProjectId: nextProjectId } });
  };
  const updateBuildCommand = async (command: string) => {
    setBuildCommand(command);
    setBuildCommandPreset("custom");
    if (!selectedProject) return;
    await persist({ ...state, projects: withProjectBuildCommand(state.projects, selectedProject.id, command, "custom") });
  };
  const applyBuildCommandPreset = async (preset: BuildCommandPresetId) => {
    if (!selectedProject) return;
    const command = createPresetCommand(preset, selectedProject.path);
    setBuildCommandPreset(preset);
    setBuildCommand(command);
    await persist({ ...state, projects: withProjectBuildCommand(state.projects, selectedProject.id, command, preset) });
  };
  const routeTask = (task: AiRoutingRule["task"], actionCategory: string): AiDecisionTrace => {
    const rule = state.aiRoutingRules.find((r) => r.task === task) || defaultRouting[0];
    const fallback = state.aiProviders.find((p) => p.enabled && p.displayName !== rule.provider);
    return { id: id(), timestamp: new Date().toISOString(), task, provider: rule.provider, reason: rule.reason, actionCategory, fallbackProvider: fallback?.displayName, timingMs: 0, success: true, riskLevel: "low" };
  };
  const updateProvider = async (providerId: string, updates: Partial<AiProvider>) => {
    const nextProviders = state.aiProviders.map((p) => {
      if (p.providerId !== providerId) return p;
      const next = { ...p, ...updates };
      if (typeof updates.enabled === "boolean") {
        if (!updates.enabled) return { ...next, status: "disabled" as const };
        if (providerId === "local-kcx") return { ...next, status: "connected" as const };
        if (providerId === "codex-handoff") return { ...next, status: "disconnected" as const };
        if (providerId === "ollama") return { ...next, status: getOllamaProviderStatus(next, true) };
      }
      if (providerId === "ollama") return { ...next, status: getOllamaProviderStatus(next, Boolean(next.enabled)) };
      return next;
    });
    await persist({ ...state, aiProviders: nextProviders });
    if (providerId === "ollama" && typeof updates.enabled === "boolean") {
      if (updates.enabled) await cortexRuntime.enableLocalOllamaManualSummaries();
      else cortexRuntime.disableLocalOllamaManualSummaries();
    }
  };
  const testProvider = async (provider: AiProvider) => {
    const result = await window.kcxApi.testProviderConnection(provider);
    await updateProvider(provider.providerId, { status: result.status });
    setCopyStatus({ id: provider.providerId, message: result.message });
  };
  const detectSafetyWarnings = (text: string): SafetyWarning[] => {
    const warnings: SafetyWarning[] = [];
    if (/rewrite entire|massive rewrite|rewrite whole/i.test(text)) warnings.push({ id: id(), timestamp: new Date().toISOString(), projectId: selectedProject?.id || "", message: "Massive rewrite risk detected.", severity: "high" });
    if (/delete|remove .*files|heavy refactor|large refactor/i.test(text)) warnings.push({ id: id(), timestamp: new Date().toISOString(), projectId: selectedProject?.id || "", message: "Delete/refactor-heavy prompt risk detected.", severity: "high" });
    if (/new architecture|re-architect|replace architecture/i.test(text)) warnings.push({ id: id(), timestamp: new Date().toISOString(), projectId: selectedProject?.id || "", message: "Architecture drift risk detected.", severity: "medium" });
    if (!/build|test/i.test(text)) warnings.push({ id: id(), timestamp: new Date().toISOString(), projectId: selectedProject?.id || "", message: "Prompt may be missing build/test instructions.", severity: "medium" });
    return warnings;
  };
  const copyText = async (value: string, approvalId: string): Promise<boolean> => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        setCopyStatus({ id: approvalId, message: "Copied" });
        return true;
      }
    } catch {
      // fallback below
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      setCopyStatus({ id: approvalId, message: ok ? "Copied" : "Copy failed" });
      return ok;
    } catch {
      setCopyStatus({ id: approvalId, message: "Copy failed" });
      return false;
    }
  };

  const addProject = async () => { if (!projectForm.name || !projectForm.path) return; const p: Project = { id: id(), ...projectForm, features: [], memoryNotes: "", noRewriteRules: "do not rewrite working code", buildLogs: "", buildCommand: "", buildCommandPreset: "custom", buildCommandCustom: "", lastBuildCommand: "", commandHistory: [], architectureNotes: { notes: "", importantFiles: "", doNotRewriteAreas: "", knownFragileSystems: "" }, projectMemory: { projectGoal: projectForm.appGoal || "", importantFiles: "", protectedFiles: "", protectedSymbols: "", doNotRewriteRules: "Do not rewrite working architecture.\nAvoid broad refactors.\nDo not modify protected files unless absolutely required.", workflowNotes: "" }, buildIntel: parseBuildIntel("") }; await persist({ ...state, projects: [...state.projects, p], settings: { ...state.settings, lastSelectedProjectId: p.id } }); setProjectId(p.id); setBuildCommand(""); setBuildCommandPreset("custom"); };
  const handleDeleteProject = async (deleteProjectId: string) => {
    if (!window.confirm("Delete this project? This cannot be undone.")) return;
    const nextProjects = state.projects.filter((p) => p.id !== deleteProjectId);
    const nextProjectId = projectId === deleteProjectId ? (nextProjects[0]?.id || "") : projectId;
    await persist({ ...state, projects: nextProjects, settings: { ...state.settings, lastSelectedProjectId: nextProjectId } });
    setProjectId(nextProjectId);
    const nextProject = nextProjects.find((p) => p.id === nextProjectId);
    setBuildCommand(getProjectBuildCommand(nextProject));
    setBuildCommandPreset(getProjectBuildCommandPreset(nextProject));
    pushSystemTelemetry("Project deleted", "info");
  };
  const splitList = (value: string) => value.split(/\r?\n|,/).map((v) => v.trim()).filter(Boolean);
  const buildMemorySafetyBlock = (project: Project) => {
    const mem = project.projectMemory;
    const protectedFiles = splitList(mem?.protectedFiles || "");
    const doNotRewrite = mem?.doNotRewriteRules || "Do not rewrite working architecture.\nAvoid broad refactors.\nDo not modify protected files unless absolutely required.";
    const workflow = mem?.workflowNotes || "";
    return `Safety rules:
- Do not rewrite working architecture.
- Avoid broad refactors.
- Do not modify protected files unless absolutely required.
- Protected files: ${protectedFiles.join(", ") || "None specified"}
- Do-not-rewrite rules: ${doNotRewrite}
- Workflow notes: ${workflow || "None"}`;
  };
  const detectProtectedFileHit = (project: Project, issue: BuildAnalysisResult) => {
    const protectedFiles = splitList(project.projectMemory?.protectedFiles || "").map((f) => f.toLowerCase());
    const issueFiles = (issue.likelyFiles || []).map((f) => f.toLowerCase());
    const hits = issueFiles.filter((f) => protectedFiles.some((p) => f.includes(p) || p.includes(f)));
    return { hasHit: hits.length > 0, hits };
  };
  const generateNextPrompt = async () => {
    if (!selectedProject) return;
    const prompt = `Project: ${selectedProject.name}\nBuild and test after patch.`;
    const safety = detectSafetyWarnings(prompt);
    const nextApproval: ApprovalItem = {
      id: id(),
      projectId: selectedProject.id,
      kind: "prompt",
      title: "Generated Next Prompt (Planning)",
      payload: prompt,
      status: "pending",
      createdAt: new Date().toISOString()
    };
    const next = {
      ...state,
      approvals: [nextApproval, ...state.approvals],
      timeline: [pushEvent("Prompt Generated", "Prompt generated", "Next prompt queued"), ...state.timeline],
      aiDecisionTrace: [routeTask("prompt_cleanup", "next_prompt_generation"), routeTask("safety_warnings", "safety_scan"), routeTask("next_step_suggestions", "planning"), ...state.aiDecisionTrace],
      safetyWarnings: [...safety, ...state.safetyWarnings]
    };
    await persist(next);
    setTab("Approval Queue");
  };
  const updateApprovalStatus = async (a: ApprovalItem, status: ApprovalItem["status"]) => { const now = new Date().toISOString(); const evtMap: Partial<Record<ApprovalItem["status"], TimelineType>> = { approved: "Prompt Approved", sent: "Prompt Sent", completed: "Prompt Completed", failed: "Prompt Failed" }; await persist({ ...state, approvals: state.approvals.map((x) => x.id !== a.id ? x : { ...x, status, approvedAt: status === "approved" ? now : x.approvedAt, sentAt: status === "sent" ? now : x.sentAt, completedAt: status === "completed" ? now : x.completedAt, failedAt: status === "failed" ? now : x.failedAt }), timeline: evtMap[status] ? [pushEvent(evtMap[status] as TimelineType, `${a.title} -> ${status}`), ...state.timeline] : state.timeline }); };
  const runApprovedCommand = async (a: ApprovalItem) => {
    if (!selectedProject) return;
    const req = JSON.parse(a.payload) as CommandRequest;
    const result = await window.kcxApi.runCommand(req);
    const stamp = new Date().toISOString();
    const mergedLogs = `${selectedProject.buildLogs || ""}\n\n[${stamp}] $ ${req.command} ${req.args.join(" ")}\n${result.output}`.trim();
    const intel = parseBuildIntel(mergedLogs);
    const nextState: AppState = {
      ...state,
      approvals: state.approvals.map((x) => x.id === a.id ? { ...x, status: "approved", approvedAt: stamp } : x),
      projects: state.projects.map((p) => p.id === selectedProject.id ? { ...p, buildLogs: mergedLogs, buildIntel: intel, commandHistory: [{ id: id(), command: `${req.command} ${req.args.join(" ")}`, timestamp: stamp, success: result.success, outputPreview: result.output.slice(0, 240) }, ...p.commandHistory] } : p),
      timeline: [pushEvent("Command Executed", `${req.command} ${req.args.join(" ")}`), pushEvent(intel.buildFailed ? "Build Failed" : "Build Succeeded", intel.buildFailed ? "Build failed" : "Build succeeded"), ...state.timeline],
      aiDecisionTrace: [routeTask("build_parsing", "build_intelligence"), routeTask("workflow_routing", "command_execution"), ...state.aiDecisionTrace]
    };
    await persist(nextState);
    setBuildLogInput(mergedLogs);
    await analyzeBuildLogs(mergedLogs, nextState);
  };
  const scanProject = async () => {
    if (!selectedProject || isScanning) return;
    setIsScanning(true);
    console.log("[renderer] scanProject start", selectedProject.path);
    const snapshot = await window.kcxApi.scanProject(selectedProject.path);
    console.log("[renderer] scanProject result", snapshot);
    const now = Date.now();
    const nextTimeline = now - lastScanEventAt >= 2000 ? [pushEvent("Project Scanned", "Project context scanned"), ...state.timeline] : state.timeline;
    await persist({ ...state, projects: state.projects.map((p) => p.id === selectedProject.id ? { ...p, snapshot } : p), timeline: nextTimeline });
    if (now - lastScanEventAt >= 2000) setLastScanEventAt(now);
    setIsScanning(false);
  };
  const importBuildLog = async (ev: React.ChangeEvent<HTMLInputElement>) => { if (!selectedProject || !ev.target.files?.[0]) return; const text = await ev.target.files[0].text(); const merged = `${selectedProject.buildLogs || ""}\n\n[Imported ${new Date().toISOString()}]\n${text}`.trim(); const intel = parseBuildIntel(merged); await persist({ ...state, projects: state.projects.map((p) => p.id === selectedProject.id ? { ...p, buildLogs: merged, buildIntel: intel } : p), timeline: [pushEvent(intel.buildFailed ? "Build Failed" : "Build Succeeded", "Build log imported and parsed"), ...state.timeline] }); setBuildLogInput(text); await analyzeBuildLogs(text); ev.target.value = ""; };
  const splitCommandText = (value: string): string[] => (value.match(/"[^"]*"|\S+/g) || []).map((part) => part.replace(/^"|"$/g, ""));
  const createCommandRequestFromInput = (value: string, project: Project): CommandRequest | null => {
    const trimmed = value.trim();
    const cdChain = trimmed.match(/^cd\s+\/d\s+"([^"]+)"\s*&&\s*([^\s]+)(?:\s+(.+))?$/i);
    if (cdChain) {
      return { projectId: project.id, command: cdChain[2], args: splitCommandText(cdChain[3] || ""), cwd: cdChain[1] };
    }
    const openRoot = trimmed.match(/^start\s+""\s+"([^"]+)"$/i);
    if (openRoot) {
      return { projectId: project.id, command: "explorer.exe", args: [openRoot[1]], cwd: project.path || process.cwd() };
    }
    if (/^cd\s+\/d\s+"[^"]+"$/i.test(trimmed)) return null;
    const parts = splitCommandText(trimmed);
    if (!parts.length) return null;
    return { projectId: project.id, command: parts[0], args: parts.slice(1), cwd: project.path || process.cwd() };
  };
  const handleRunBuild = async () => {
    if (!selectedProject || isBuilding) return;
    const trimmed = (buildCommand || "").trim();
    if (!trimmed) {
      setCopyStatus({ id: "build-logs", message: "Enter a build command for this project first." });
      return;
    }
    const req = createCommandRequestFromInput(trimmed, selectedProject);
    if (!req) {
      setCopyStatus({ id: "build-logs", message: "Add a runnable command after the project-root preset." });
      return;
    }
    const approval: ApprovalItem = {
      id: id(),
      projectId: selectedProject.id,
      kind: "command",
      title: `Run build command: ${trimmed}`,
      payload: JSON.stringify(req),
      status: "pending",
      createdAt: new Date().toISOString(),
      source: "manual"
    };
    await persist({
      ...state,
      projects: withProjectBuildCommand(state.projects, selectedProject.id, trimmed, buildCommandPreset, trimmed),
      approvals: [approval, ...state.approvals],
      timeline: [pushEvent("Prompt Generated", "Build command queued for approval", trimmed), ...state.timeline]
    });
    setCopyStatus({ id: "build-logs", message: "Build command queued in Approval Queue." });
    setTab("Approval Queue");
  };
  const handleStopBuild = () => {
    setIsBuilding(false);
    setCopyStatus({ id: "build-logs", message: "Stop requested. Running command cancellation is not wired yet." });
  };
  const analyzeHeuristic = (raw: string): BuildAnalysisResult[] => {
    type Issue = BuildAnalysisResult & { sourceLines?: string[] };
    const issues: Issue[] = [];
    const lines = raw.split(/\r?\n/);
    const seen = new Set<string>();
    const fallbackCategories = new Set<string>();
    const severityScore = (s: "low" | "medium" | "high") => (s === "high" ? 3 : s === "medium" ? 2 : 1);
    const locScore = (i: Issue) => (i.file ? 1 : 0) + (typeof i.line === "number" ? 1 : 0) + (typeof i.column === "number" ? 1 : 0);
    const kotlinMessagePattern = /(Syntax error|Expecting an expression|Expecting member declaration|Unresolved reference(?::\s*[A-Za-z_][A-Za-z0-9_]*)?|Type mismatch|None of the following functions can be called[^.]*)/i;
    const roomKspPattern = /\b(ksp|RoomProcessor|androidx\.room|KspTask|SymbolProcessor|Entity|Dao)\b/i;
    const composePattern = /(@Composable|Composable invocations|Compose Compiler|remember\b|Modifier\b|State<[^>]+>|non-composable context)/i;
    const fileNameOf = (file: string) => (file.split(/[\\/]/).pop() || file).replace(/^file:\/\/\//i, "");
    const normalizeFile = (file: string) => file.replace(/^file:\/\/\//i, "").replace(/\\/g, "/");
    const normalizeMessage = (message: string) => message.replace(/\s+/g, " ").trim();
    const addIssue = (issue: Issue, fallbackCategory?: string) => {
      if (fallbackCategory) {
        if (fallbackCategories.has(fallbackCategory)) return;
        fallbackCategories.add(fallbackCategory);
      }
      const key = [
        issue.detectedType.toLowerCase(),
        (issue.file || issue.fileName || issue.likelyFiles[0] || "").toLowerCase(),
        issue.line ?? "",
        normalizeMessage(issue.message || issue.likelyCause || issue.suggestedFix).toLowerCase(),
      ].join("|");
      if (seen.has(key)) return;
      seen.add(key);
      issues.push(issue);
    };

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      let m: RegExpMatchArray | null;
      m = line.match(/(?:^|\s)(?:e:\s*)?((?:file:\/\/\/)?(?:[A-Za-z]:[\\/][^:\r\n]+?\.kt|[A-Za-z0-9_./\\ -]+?\.kt)):(\d+)(?::(\d+))?\s*(.*)$/i);
      if (m) {
        const file = normalizeFile(m[1]);
        const inlineMessage = normalizeMessage(m[4] || "");
        const nextMessage = normalizeMessage(lines.slice(index + 1, index + 4).find((candidate) => kotlinMessagePattern.test(candidate)) || "");
        const message = inlineMessage || nextMessage || "Kotlin compiler error";
        const symbol = message.match(/Unresolved reference:\s*([A-Za-z_][A-Za-z0-9_]*)/i)?.[1];
        addIssue({ detectedType: "Kotlin compile error", severity: "high", likelyCause: message, likelyFiles: [file], likelySymbols: symbol ? [symbol] : [], file, fileName: fileNameOf(file), line: Number(m[2]), column: m[3] ? Number(m[3]) : undefined, message, suggestedFix: "Fix the Kotlin compiler error at the reported file and line.", confidence: 0.95, sourceLines: [line] });
        continue;
      }
      m = line.match(/([A-Za-z0-9_./-]+\.(ts|tsx|js|jsx))\((\d+),\s*(\d+)\):\s*error\s+TS\d+:\s*Cannot find name ['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]/i);
      if (m) {
        addIssue({ detectedType: "missing symbol", severity: "high", likelyCause: "Referenced symbol is missing in scope/imports or was renamed.", likelyFiles: [m[1]], likelySymbols: [m[5]], file: m[1], fileName: fileNameOf(m[1]), line: Number(m[3]), column: Number(m[4]), message: `Cannot find name ${m[5]}`, suggestedFix: "Check imports, nearby renames, missing declarations, or scope visibility.", confidence: 0.87, sourceLines: [line] });
        continue;
      }
      m = line.match(/Cannot find name ['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]/i);
      if (m) {
        addIssue({ detectedType: "missing symbol", severity: "high", likelyCause: "Referenced symbol is missing in scope/imports or was renamed.", likelyFiles: [], likelySymbols: [m[1]], message: `Cannot find name ${m[1]}`, suggestedFix: "Check imports, nearby renames, missing declarations, or scope visibility.", confidence: 0.85, sourceLines: [line] }, "missing symbol");
        continue;
      }
      m = line.match(/Cannot find module ['"`]([^'"`]+)['"`]/i);
      if (m) {
        addIssue({ detectedType: "missing module", severity: "high", likelyCause: "Import path points to non-existing module or missing dependency.", likelyFiles: [], likelySymbols: [m[1]], message: `Cannot find module ${m[1]}`, suggestedFix: "Verify module exists and import path is correct.", confidence: 0.84, sourceLines: [line] }, "missing module");
        continue;
      }
      m = line.match(/Property ['"`]([A-Za-z_][A-Za-z0-9_]*)['"`] does not exist/i);
      if (m) {
        addIssue({ detectedType: "missing property", severity: "medium", likelyCause: "Property not defined on current type or typo in property name.", likelyFiles: [], likelySymbols: [m[1]], message: `Property ${m[1]} does not exist`, suggestedFix: "Verify type definition and property spelling.", confidence: 0.82, sourceLines: [line] }, "missing property");
        continue;
      }
      m = line.match(/([A-Za-z0-9_./-]*AndroidManifest\.xml)/i);
      if (m) {
        addIssue({ detectedType: "manifest/package issues", severity: "medium", likelyCause: "Malformed manifest/package metadata.", likelyFiles: [m[1]], likelySymbols: [], file: m[1], fileName: fileNameOf(m[1]), message: normalizeMessage(line), suggestedFix: "Validate manifest/package fields and required entries.", confidence: 0.78, sourceLines: [line] });
        continue;
      }
      if (roomKspPattern.test(line)) addIssue({ detectedType: "Room/KSP failures", severity: "high", likelyCause: "Annotation processor mismatch or invalid schema/model.", likelyFiles: [], likelySymbols: [], message: normalizeMessage(line), suggestedFix: "Verify Room entities/DAOs and KSP plugin/version alignment.", confidence: 0.82, sourceLines: [line] }, "Room/KSP failures");
      else if (composePattern.test(line)) addIssue({ detectedType: "Compose compiler issues", severity: "medium", likelyCause: "Compose compiler/runtime version mismatch or invalid composable usage.", likelyFiles: [], likelySymbols: [], message: normalizeMessage(line), suggestedFix: "Align Compose compiler/runtime versions and review composable signatures.", confidence: 0.77, sourceLines: [line] }, "Compose compiler issues");
      else if (/task .* failed|execution failed for task|gradle.*failed/i.test(line)) addIssue({ detectedType: "Gradle task failures", severity: "high", likelyCause: "Task configuration or dependency failure.", likelyFiles: [], likelySymbols: [], message: normalizeMessage(line), suggestedFix: "Inspect failing Gradle task stacktrace and resolve upstream config/deps.", confidence: 0.7, sourceLines: [line] }, "Gradle task failures");
      else if (/vite|electron|npm ERR!/i.test(line)) addIssue({ detectedType: "Electron/Vite/npm failures", severity: "medium", likelyCause: "Toolchain startup/build mismatch.", likelyFiles: [], likelySymbols: [], message: normalizeMessage(line), suggestedFix: "Verify node modules, scripts, and dev/prod config consistency.", confidence: 0.75, sourceLines: [line] }, "Electron/Vite/npm failures");
      else if (/error\s+TS\d{4}|typescript.*error/i.test(line)) addIssue({ detectedType: "TypeScript error", severity: "medium", likelyCause: "Type mismatch or invalid syntax in TS/TSX source.", likelyFiles: [], likelySymbols: [], message: normalizeMessage(line), suggestedFix: "Fix TS diagnostics and update types/interfaces.", confidence: 0.8, sourceLines: [line] }, "TypeScript error");
    }

    if (!issues.length) return [{ detectedType: "No known pattern", severity: "low", likelyCause: "Heuristics found no strong error signature.", likelyFiles: [], likelySymbols: [], suggestedFix: "Review full log tail and re-run with verbose output.", confidence: 0.4 }];
    const ranked = [...issues].sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      if (locScore(b) !== locScore(a)) return locScore(b) - locScore(a);
      return severityScore(b.severity) - severityScore(a.severity);
    });
    return ranked;
  };
  const summarizeAnalysis = (results: BuildAnalysisResult[]): string => {
    const top = results[0];
    const location = top.file ? ` in ${top.file}${top.line ? ` at line ${top.line}` : ""}${top.column ? `, column ${top.column}` : ""}` : "";
    const symbol = top.likelySymbols[0] ? ` around symbol ${top.likelySymbols[0]}` : "";
    const message = top.message ? `: ${top.message}` : "";
    return `Likely ${top.detectedType.toLowerCase()}${location}${symbol}${message}.`;
  };
  const deriveSystemStateFromAnalysis = (analysis: BuildAnalysisResult[]): SystemState => {
    if (analysis.some((item) => item.severity === "high")) return "error";
    if (analysis.some((item) => item.severity === "medium")) return "warning";
    return "idle";
  };
  const pushSystemTelemetry = (
    label: string,
    level: TelemetryLevel = "info"
  ) => {
    const event: SystemTelemetryEvent = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      label,
      level,
    };
    setSystemTelemetry((prev) => [event, ...prev].slice(0, 8));
  };
  const handleClearTelemetry = () => {
    if (!window.confirm("Clear all telemetry events? This cannot be undone.")) return;
    setSystemTelemetry([]);
  };
  const handleClearAllLogs = async () => {
    const completedEvent = pushEvent("System logs cleared", "System logs cleared successfully.");
    const nextState = clearSystemLogs(state, completedEvent);
    await persist(nextState);
    setBuildLogInput("");
    setPatchReviewInput("");
    setSystemTelemetry([]);
    setLastBuildResult(null);
    setTelemetryFilter("all");
    if (!isBuilding) setSystemState("idle");
    cortexRuntime.clearSystemLogs();
    const diagnosticsResult = window.kcxApi?.clearDiagnosticLogs
      ? await window.kcxApi.clearDiagnosticLogs().catch((error) => ({ ok: false, error: error instanceof Error ? error.message : String(error) }))
      : { ok: false, error: "Diagnostic log IPC is unavailable." };
    setCopyStatus({
      id: "clear-all-logs",
      message: diagnosticsResult.ok
        ? "System logs cleared successfully."
        : "System logs cleared successfully. Diagnostic runtime log could not be cleared."
    });
    setClearLogsModalOpen(false);
  };
  const handleFreshStart = async () => {
    const freshStartEvent = pushEvent("System logs cleared", "Fresh Start — session data cleared");
    const nextState = {
      ...state,
      approvals: [],
      timeline: [freshStartEvent],
      aiDecisionTrace: [],
      safetyWarnings: [],
      projects: state.projects.map((project) => ({
        ...project,
        buildLogs: "",
        buildStatus: project.buildStatus === "Running" ? "Waiting Approval" : project.buildStatus,
        buildIntel: parseBuildIntel(""),
        buildLogHistory: [],
        commandHistory: [],
        patchReviewHistory: [],
        lastBuildOutput: ""
      }))
    };
    await persist(nextState);
    setBuildLogInput("");
    setPatchReviewInput("");
    setSystemTelemetry([]);
    setLastBuildResult(null);
    setTelemetryFilter("all");
    setSystemState("idle");
    cortexRuntime.clearAllRuntimeLogs();
    cortexEventBus.emit("system-state-changed", "Fresh Start reset system state.", { systemState: "idle" });
    if (window.kcxApi?.clearDiagnosticLogs) {
      await window.kcxApi.clearDiagnosticLogs().catch(() => undefined);
    }
    setCopyStatus({ id: "fresh-start", message: "Fresh Start complete. Temporary session data cleared." });
    setFreshStartModalOpen(false);
  };
  const analyzeBuildLogs = async (rawOverride?: string, baseState?: AppState) => {
    const analysisState = baseState ?? state;
    const analysisProject = analysisState.projects.find((p) => p.id === projectId) ?? selectedProject;
    if (!analysisProject) return;
    const updateSystemState = (nextState: SystemState) => {
      setSystemState(nextState);
      cortexEventBus.emit("system-state-changed", nextState, { systemState: nextState });
    };
    setSystemState("processing");
    pushSystemTelemetry("Analyze Logs started", "processing");
    const raw = (rawOverride || buildLogInput || analysisProject.buildLogs || "").trim();
    if (!raw) {
      updateSystemState("idle");
      return;
    }
    try {
      const analysis = analyzeHeuristic(raw);
      const summary = summarizeAnalysis(analysis);
      const record: BuildLogRecord = { id: id(), projectId: analysisProject.id, timestamp: new Date().toISOString(), rawLogText: raw, analysis, summary };
      const mergedLogs = raw;
      const intel = parseBuildIntel(mergedLogs);
      await persist({
        ...analysisState,
        projects: analysisState.projects.map((p) => p.id === analysisProject.id ? { ...p, buildLogs: mergedLogs, buildIntel: intel, buildLogHistory: [record, ...(p.buildLogHistory || [])] } : p),
        timeline: [pushEvent("Build Analysis Refined", "Build analysis refined", summary), pushEvent("Build Analysis Completed", "Build log analysis completed", summary), ...analysisState.timeline]
      });
      const nextSystemState = deriveSystemStateFromAnalysis(analysis);
      pushSystemTelemetry("Build Analysis completed", "info");
      if (nextSystemState === "error") pushSystemTelemetry("High severity issue detected", "error");
      if (nextSystemState === "warning") pushSystemTelemetry("Medium severity issue detected", "warning");
      updateSystemState(nextSystemState);
      if (nextSystemState !== "idle") {
        window.setTimeout(() => updateSystemState("idle"), 1800);
      }
      cortexRuntime.onBuildAnalysisComplete({
        projectName: analysisProject.name,
        buildLogTail: raw.slice(-800),
        lastErrorType: analysis[0]?.detectedType ?? "",
        isFailed: intel.buildFailed
      });
    } catch {
      updateSystemState("error");
      pushSystemTelemetry("Error during analysis", "error");
      window.setTimeout(() => updateSystemState("idle"), 1800);
    }
  };
  const clearBuildLogs = async () => {
    if (!selectedProject) return;
    setBuildLogInput("");
    await persist({
      ...state,
      projects: state.projects.map((p) =>
        p.id === selectedProject.id ? { ...p, buildLogs: "", buildLogHistory: [] } : p
      )
    });
  };
  const analyzePatchReview = (): PatchReviewRecord | null => {
    if (!selectedProject) return null;
    const raw = patchReviewInput.trim();
    if (!raw) return null;
    const filesChanged = Array.from(new Set(raw.match(/[\w./-]+\.(kt|kts|ts|tsx|js|jsx|xml|json|gradle)/g) || []));
    const riskyPhrases = ["refactor", "rewrite", "large cleanup", "architecture change"].filter((p) => raw.toLowerCase().includes(p));
    const buildOutcome: "success" | "failure" | "unknown" = /build successful|passed/i.test(raw) ? "success" : /build failed|error/i.test(raw) ? "failure" : "unknown";
    const featureChanges = (raw.match(/added|removed|feature/gi) || []).slice(0, 5);
    const parserBuildChanges = (raw.match(/parser|build|gradle|ksp|typescript|compose/gi) || []).slice(0, 8);
    const likelySystemsAffected = Array.from(new Set([...filesChanged.map((f) => f.split("/")[0]), ...parserBuildChanges])).slice(0, 8);
    const riskLevel: "low" | "medium" | "high" = riskyPhrases.length > 1 ? "high" : riskyPhrases.length === 1 ? "medium" : "low";
    const recommendedNextStep =
      buildOutcome === "success"
        ? "Generate regression prompt and run broader validation checks."
        : /unresolved reference/i.test(raw)
          ? "Inspect imports/usages and regenerate fix + validation prompts."
          : /typescript/i.test(raw)
            ? "Inspect modified interfaces/types and re-run TS build."
            : /room|ksp/i.test(raw)
              ? "Clean/rebuild and inspect generated schema/impl artifacts."
              : "Run targeted validation prompt and compare against latest build analysis.";
    return {
      id: id(),
      projectId: selectedProject.id,
      timestamp: new Date().toISOString(),
      rawSummary: raw,
      filesChanged,
      buildOutcome,
      featureChanges,
      parserBuildChanges,
      riskLevel,
      riskyPhrases,
      likelySystemsAffected,
      recommendedNextStep
    };
  };
  const savePatchReview = async () => {
    if (!selectedProject) return;
    const rec = analyzePatchReview();
    if (!rec) return;
    await persist({
      ...state,
      projects: state.projects.map((p) => p.id === selectedProject.id ? { ...p, patchReviewHistory: [rec, ...(p.patchReviewHistory || [])] } : p),
      timeline: [pushEvent("Patch review analyzed", "Patch review analyzed", rec.recommendedNextStep), ...state.timeline]
    });
  };
  const getLatestBuildAnalysis = () => {
    const latest = (selectedProject?.buildLogHistory ?? [])[0];
    const issue = latest?.analysis?.[0];
    return { latest, issue };
  };
  const findDuplicatePendingPrompt = (projectIdValue: string, chainIdValue: string, promptType: "Fix" | "Validation" | "Regression", issueType: string, contextKey: string) =>
    state.approvals.find((a) =>
      a.kind === "prompt" &&
      a.status === "pending" &&
      a.projectId === projectIdValue &&
      (a.chainId || "") === chainIdValue &&
      (a.promptType || "Other") === promptType &&
      (a.issueType || "") === issueType &&
      (a.contextKey || "") === contextKey
    );
  const generateFixPromptFromAnalysis = async () => {
    if (!selectedProject) return;
    setSystemState("processing");
    const { latest, issue } = getLatestBuildAnalysis();
    if (!latest || !issue) {
      setCopyStatus({ id: "build-logs", message: "No build analysis available." });
      setSystemState("idle");
      return;
    }
    const chainId = latest.id;
    const chainType = issue.detectedType || "build-analysis";
    const issueType = issue.detectedType || "Issue";
    const contextKey = `${(issue.likelySymbols ?? []).join("|")}::${issue.file || ""}:${issue.line || ""}:${issue.column || ""}`;
    const dup = findDuplicatePendingPrompt(selectedProject.id, chainId, "Fix", issueType, contextKey);
    if (dup) {
      await persist({ ...state, timeline: [pushEvent("Duplicate prompt prevented", `Duplicate fix prompt prevented for ${issueType}`), ...state.timeline] });
      setSystemState("idle");
      setTab("Approval Queue");
      return;
    }
    const location = issue.file ? `${issue.file}${issue.line ? `:${issue.line}` : ""}${issue.column ? `:${issue.column}` : ""}` : "None detected";
    const detected = (issue.detectedType || "").toLowerCase();
    let typeInstructions = `- Apply a minimal surgical patch only.
- Do not rewrite architecture.
- Fix only the detected issue and directly related compile/runtime errors.
- Keep existing project structure intact.
- Run build after patch.
- Report exact changed files and why.`;

    if (detected.includes("unresolved reference")) {
      typeInstructions = `- Inspect imports, renamed symbols, deleted helper files, package paths, and nearby usages.
- Apply a minimal surgical patch only.
- Do not rewrite architecture.
- Run build after patch.`;
    } else if (detected.includes("typescript")) {
      typeInstructions = `- Inspect detected file/line/column and fix syntax/type issue only.
- Avoid broad refactor.
- Apply a minimal surgical patch only.
- Run build after patch.`;
    } else if (detected.includes("electron") || detected.includes("vite") || detected.includes("npm")) {
      typeInstructions = `- Inspect package.json scripts, dependencies, npm install state, and Electron/Vite config.
- Apply a minimal surgical patch only.
- Do not rewrite architecture.
- Run build after patch.`;
    } else if (detected.includes("room") || detected.includes("ksp")) {
      typeInstructions = `- Inspect Room entities/DAO/database annotations, KSP setup, AppDatabase_Impl generation issues, and schema mismatch.
- Apply a minimal surgical patch only.
- Do not rewrite architecture.
- Run build after patch.`;
    } else if (detected.includes("compose")) {
      typeInstructions = `- Inspect Kotlin/Compose compiler compatibility and Gradle version alignment only.
- Apply a minimal surgical patch only.
- Do not rewrite architecture.
- Run build after patch.`;
    } else if (detected.includes("manifest") || detected.includes("package")) {
      typeInstructions = `- Inspect AndroidManifest.xml for conflicting attributes, duplicate declarations, and package/application metadata.
- Apply a minimal surgical patch only.
- Do not rewrite architecture.
- Run build after patch.`;
    }

    const protectedHit = detectProtectedFileHit(selectedProject, issue);
    const safetyBlock = buildMemorySafetyBlock(selectedProject);
    const prompt = `Project: ${selectedProject.name}
Detected issue type: ${issue.detectedType || "None detected"}
Severity: ${issue.severity || "None detected"}
Detected files: ${(issue.likelyFiles ?? []).join(", ") || "None detected"}
Symbols: ${(issue.likelySymbols ?? []).join(", ") || "None detected"}
Location: ${location}
Suggested fix: ${issue.suggestedFix || "None detected"}

Original build log:
${latest.rawLogText || ""}

Instructions:
${typeInstructions}
${protectedHit.hasHit ? "\nProtected architecture area detected. Use extra caution and keep changes minimal in protected files." : ""}
${safetyBlock}`;

    const approval: ApprovalItem = {
      id: id(),
      projectId: selectedProject.id,
      kind: "prompt",
      title: `Fix Prompt (${issueType})`,
      payload: prompt,
      status: "pending",
      createdAt: new Date().toISOString(),
      source: "build-analysis",
      chainId,
      chainType,
      promptType: "Fix",
      issueType,
      contextKey
    };
    const events = [pushEvent("Fix prompt generated from build analysis", `Fix prompt generated for ${issue.detectedType || "issue"}`), ...state.timeline];
    if (protectedHit.hasHit) events.unshift(pushEvent("Protected architecture area detected", `Protected files touched: ${protectedHit.hits.join(", ")}`));
    await persist({
      ...state,
      approvals: [approval, ...state.approvals],
      timeline: events
    });
    pushSystemTelemetry("Fix Prompt generated", "info");
    setSystemState("idle");
    setTab("Approval Queue");
  };
  const generateValidationPromptFromAnalysis = async () => {
    if (!selectedProject) return;
    setSystemState("processing");
    const { latest, issue } = getLatestBuildAnalysis();
    if (!latest || !issue) {
      setCopyStatus({ id: "build-logs", message: "No build analysis available." });
      setSystemState("idle");
      return;
    }
    const chainId = latest.id;
    const chainType = issue.detectedType || "build-analysis";
    const issueType = issue.detectedType || "Issue";
    const contextKey = `${(issue.likelySymbols ?? []).join("|")}::${issue.file || ""}:${issue.line || ""}:${issue.column || ""}`;
    const dup = findDuplicatePendingPrompt(selectedProject.id, chainId, "Validation", issueType, contextKey);
    if (dup) {
      await persist({ ...state, timeline: [pushEvent("Duplicate prompt prevented", `Duplicate validation prompt prevented for ${issueType}`), ...state.timeline] });
      setSystemState("idle");
      setTab("Approval Queue");
      return;
    }
    const detected = (issue.detectedType || "").toLowerCase();
    let validationInstructions = `- Verify the fix worked end-to-end.
- Run compile/build and confirm success.
- Perform targeted regression checks around changed files.
- Confirm no unrelated systems broke.`;
    if (detected.includes("unresolved reference")) {
      validationInstructions = `- Verify imports resolve.
- Verify symbol usages compile.
- Run compile/build.
- Check nearby usages for regressions.`;
    } else if (detected.includes("typescript")) {
      validationInstructions = `- Verify no TS errors remain.
- Verify component renders.
- Verify reported line/column issue is resolved.`;
    } else if (detected.includes("room") || detected.includes("ksp")) {
      validationInstructions = `- Clean/rebuild.
- Verify generated classes exist.
- Verify schema/build stability.`;
    } else if (detected.includes("compose")) {
      validationInstructions = `- Verify Compose/Kotlin compatibility.
- Verify Gradle sync/build passes.`;
    } else if (detected.includes("manifest") || detected.includes("package")) {
      validationInstructions = `- Verify manifest merge succeeds.
- Verify no duplicate attributes/declarations remain.`;
    }
    const location = issue.file ? `${issue.file}${issue.line ? `:${issue.line}` : ""}${issue.column ? `:${issue.column}` : ""}` : "None detected";
    const protectedHit = detectProtectedFileHit(selectedProject, issue);
    const safetyBlock = buildMemorySafetyBlock(selectedProject);
    const prompt = `Project: ${selectedProject.name}
Validation target issue type: ${issue.detectedType || "None detected"}
Severity: ${issue.severity || "None detected"}
Files: ${(issue.likelyFiles ?? []).join(", ") || "None detected"}
Symbols: ${(issue.likelySymbols ?? []).join(", ") || "None detected"}
Location: ${location}

Validation checklist:
${validationInstructions}

Original build log:
${latest.rawLogText || ""}

Rules:
- Keep checks focused and concise.
- Do not perform broad refactors.
- Report pass/fail findings clearly.
${protectedHit.hasHit ? "- Protected architecture area detected. Use extra caution with protected files." : ""}
${safetyBlock}`;
    const approval: ApprovalItem = {
      id: id(),
      projectId: selectedProject.id,
      kind: "prompt",
      title: `Validation Prompt (${issueType})`,
      payload: prompt,
      status: "pending",
      createdAt: new Date().toISOString(),
      source: "build-analysis",
      chainId,
      chainType,
      promptType: "Validation",
      issueType,
      contextKey
    };
    const events = [pushEvent("Validation prompt generated", `Validation prompt generated for ${issue.detectedType || "issue"}`), ...state.timeline];
    if (protectedHit.hasHit) events.unshift(pushEvent("Protected architecture area detected", `Protected files touched: ${protectedHit.hits.join(", ")}`));
    await persist({
      ...state,
      approvals: [approval, ...state.approvals],
      timeline: events
    });
    pushSystemTelemetry("Validation Prompt generated", "info");
    setSystemState("idle");
    setTab("Approval Queue");
  };
  const generateRegressionPromptFromAnalysis = async () => {
    if (!selectedProject) return;
    setSystemState("processing");
    const { latest, issue } = getLatestBuildAnalysis();
    if (!latest || !issue) {
      setCopyStatus({ id: "build-logs", message: "No build analysis available." });
      setSystemState("idle");
      return;
    }
    const chainId = latest.id;
    const chainType = issue.detectedType || "build-analysis";
    const issueType = issue.detectedType || "Issue";
    const contextKey = `${(issue.likelySymbols ?? []).join("|")}::${issue.file || ""}:${issue.line || ""}:${issue.column || ""}`;
    const dup = findDuplicatePendingPrompt(selectedProject.id, chainId, "Regression", issueType, contextKey);
    if (dup) {
      await persist({ ...state, timeline: [pushEvent("Duplicate prompt prevented", `Duplicate regression prompt prevented for ${issueType}`), ...state.timeline] });
      setSystemState("idle");
      setTab("Approval Queue");
      return;
    }
    const detected = (issue.detectedType || "").toLowerCase();
    let regressionInstructions = `- Verify no unrelated systems regressed.
- Re-run compile/build and confirm stability.
- Check neighboring modules touched by the fix.`;
    if (detected.includes("unresolved reference")) {
      regressionInstructions = `- Verify nearby imports/usages.
- Verify renamed helper references.
- Search for duplicate unresolved usages.
- Verify compile/build passes.`;
    } else if (detected.includes("typescript")) {
      regressionInstructions = `- Verify no additional TS diagnostics introduced.
- Verify component rendering.
- Verify props/types/interfaces still align.`;
    } else if (detected.includes("room") || detected.includes("ksp")) {
      regressionInstructions = `- Verify DAOs/entities still compile.
- Verify generated impl files exist.
- Verify migrations/schema stability.`;
    } else if (detected.includes("compose")) {
      regressionInstructions = `- Verify Compose previews/build still work.
- Verify Gradle sync stability.
- Verify no Kotlin compatibility regressions.`;
    } else if (detected.includes("manifest") || detected.includes("package")) {
      regressionInstructions = `- Verify manifest merge.
- Verify launcher/activity declarations.
- Verify duplicate attributes not reintroduced.`;
    }
    const location = issue.file ? `${issue.file}${issue.line ? `:${issue.line}` : ""}${issue.column ? `:${issue.column}` : ""}` : "None detected";
    const protectedHit = detectProtectedFileHit(selectedProject, issue);
    const safetyBlock = buildMemorySafetyBlock(selectedProject);
    const prompt = `Project: ${selectedProject.name}
Regression target issue type: ${issue.detectedType || "None detected"}
Files: ${(issue.likelyFiles ?? []).join(", ") || "None detected"}
Symbols: ${(issue.likelySymbols ?? []).join(", ") || "None detected"}
Location: ${location}

Regression checklist:
${regressionInstructions}

Original build log:
${latest.rawLogText || ""}

Rules:
- Keep checks focused and concise.
- Do not perform broad refactors.
- Report pass/fail findings and any re-break risks.
${protectedHit.hasHit ? "- Protected architecture area detected. Use extra caution with protected files." : ""}
${safetyBlock}`;
    const approval: ApprovalItem = {
      id: id(),
      projectId: selectedProject.id,
      kind: "prompt",
      title: `Regression Prompt (${issueType})`,
      payload: prompt,
      status: "pending",
      createdAt: new Date().toISOString(),
      source: "build-analysis",
      chainId,
      chainType,
      promptType: "Regression",
      issueType,
      contextKey
    };
    const events = [pushEvent("Regression prompt generated", `Regression prompt generated for ${issue.detectedType || "issue"}`), ...state.timeline];
    if (protectedHit.hasHit) events.unshift(pushEvent("Protected architecture area detected", `Protected files touched: ${protectedHit.hits.join(", ")}`));
    await persist({
      ...state,
      approvals: [approval, ...state.approvals],
      timeline: events
    });
    pushSystemTelemetry("Regression Prompt generated", "info");
    setSystemState("idle");
    setTab("Approval Queue");
  };
  useEffect(() => {
    generateFixPromptRef.current = generateFixPromptFromAnalysis;
  });

  useEffect(() => {
    getLatestBuildAnalysisRef.current = getLatestBuildAnalysis;
  });

  useEffect(() => {
    const unsub = cortexEventBus.subscribe((event) => {
      if (event.type !== "cortex-execution-completed") return;
      if (!cortexAutoQueue) return;
      const result = getLatestBuildAnalysisRef.current?.();
      if (!result?.latest || !result?.issue || !selectedProject) return;
      generateFixPromptRef.current?.();
    });
    return unsub;
  }, [cortexAutoQueue, selectedProject]);
  useEffect(() => {
    return cortexEventBus.subscribe((event) => {
      if (event.type !== "spec-intake-completed") return;
      if (!selectedProject) return;
      const generatedPrompt = event.payload?.output as string | undefined;
      const spec = event.payload?.spec as string | undefined;
      if (!generatedPrompt?.trim()) return;
      const specTaskType = event.payload?.taskType as string | undefined;
      const specRiskLevel = event.payload?.riskLevel as "Safe" | "Medium" | "Risky" | undefined;
      const isOffline = Boolean(event.payload?.offline);
      const rawTrace = event.payload?.normTrace as { original: string; sanitized: string; replacements: string[]; classificationReason: string; rewriteReduced: boolean } | undefined;
      const approval: ApprovalItem = {
        id: id(),
        projectId: selectedProject.id,
        kind: "prompt",
        title: `${isOffline ? "Offline — rule-based prompt" : "Implementation Prompt"}: ${(spec ?? "").slice(0, 60)}${(spec?.length ?? 0) > 60 ? "…" : ""}`,
        payload: generatedPrompt,
        status: "pending",
        createdAt: new Date().toISOString(),
        source: "spec-intake",
        taskType: specTaskType,
        riskLevel: specRiskLevel,
        offline: isOffline,
        normTrace: rawTrace
      };
      void persist({ ...state, approvals: [approval, ...state.approvals] });
      setTab("Approval Queue");
    });
  }, [selectedProject, state]);

  const today = new Date().toISOString().slice(0, 10);
  const todayEvents = state.timeline.filter((e) => e.timestamp.slice(0, 10) === today);
  const promptsToday = todayEvents.filter((e) => e.type.startsWith("Prompt")).length;
  const buildsToday = todayEvents.filter((e) => e.type.startsWith("Build")).length;
  const successCount = todayEvents.filter((e) => e.type === "Build Succeeded" || e.type === "Prompt Completed").length;
  const failureCount = todayEvents.filter((e) => e.type === "Build Failed" || e.type === "Prompt Failed").length;
  const lastAnalysis = selectedProject?.buildLogHistory?.[0];
  const prevAnalysis = selectedProject?.buildLogHistory?.[1];
  const latestReview = selectedProject?.patchReviewHistory?.[0];
  const totalFailuresAnalyzed = (selectedProject?.buildLogHistory || []).filter((r) => r.analysis.some((a) => a.severity === "high")).length;
  const buildHistory = selectedProject?.buildLogHistory || [];
  const unresolvedCount = buildHistory.filter((r) => (r.analysis[0]?.detectedType || "").toLowerCase().includes("unresolved reference")).length;
  const tsCount = buildHistory.filter((r) => (r.analysis[0]?.detectedType || "").toLowerCase().includes("typescript")).length;
  const roomKspCount = buildHistory.filter((r) => (r.analysis[0]?.detectedType || "").toLowerCase().includes("room") || (r.analysis[0]?.detectedType || "").toLowerCase().includes("ksp")).length;
  const composeCount = buildHistory.filter((r) => (r.analysis[0]?.detectedType || "").toLowerCase().includes("compose")).length;
  const manifestCount = buildHistory.filter((r) => (r.analysis[0]?.detectedType || "").toLowerCase().includes("manifest") || (r.analysis[0]?.detectedType || "").toLowerCase().includes("package")).length;
  const lastSuccess = buildHistory.find((r) => !r.analysis.some((a) => a.severity === "high"));
  const lastFail = buildHistory.find((r) => r.analysis.some((a) => a.severity === "high"));
  const comparison = !lastAnalysis || !prevAnalysis ? "Insufficient history for comparison." : (prevAnalysis.analysis[0]?.detectedType === lastAnalysis.analysis[0]?.detectedType ? "still failing" : `original issue likely resolved; new issue introduced (${lastAnalysis.analysis[0]?.detectedType || "unknown"})`);
  const suggestedNextActions = [
    selectedProject?.buildIntel?.buildSuccessful ? "Generate regression prompt" : null,
    selectedProject?.buildIntel?.buildSuccessful ? "Run broader validation tests" : null,
    (lastAnalysis?.analysis[0]?.detectedType || "").toLowerCase().includes("unresolved reference") ? "Inspect imports/usages for unresolved symbols" : null,
    (lastAnalysis?.analysis[0]?.detectedType || "").toLowerCase().includes("typescript") ? "Inspect modified interfaces/types and line/column diagnostics" : null,
    (lastAnalysis?.analysis[0]?.detectedType || "").toLowerCase().includes("room") || (lastAnalysis?.analysis[0]?.detectedType || "").toLowerCase().includes("ksp") ? "Clean/rebuild and inspect generated schema/impl" : null
  ].filter(Boolean) as string[];
  const filtered = [...state.timeline].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).filter((e) => timelineFilter === "all" || (timelineFilter === "prompts" && e.type.startsWith("Prompt")) || (timelineFilter === "builds" && e.type.startsWith("Build")) || (timelineFilter === "commands" && e.type === "Command Executed") || (timelineFilter === "scans" && e.type === "Project Scanned") || (timelineFilter === "failures" && (e.type === "Build Failed" || e.type === "Prompt Failed")) || (timelineFilter === "completed" && (e.type === "Build Succeeded" || e.type === "Prompt Completed")));
  const latestIssue = (selectedProject?.buildLogHistory || [])[0]?.analysis?.[0];
  const protectedHitBadge = selectedProject && latestIssue ? detectProtectedFileHit(selectedProject, latestIssue) : { hasHit: false, hits: [] as string[] };
  const currentRiskLevel: "low" | "medium" | "high" = protectedHitBadge.hasHit ? "high" : state.safetyWarnings[0]?.severity || "low";
  const safeProviders = (Array.isArray(state.aiProviders) ? state.aiProviders : []).filter((p) => !isRemovedProvider(p)).map((p, i) => ({
    providerId: p?.providerId || (p as { id?: string })?.id || defaultProviders[i]?.providerId || `provider-${i}`,
    displayName: p?.displayName || (p as { name?: string })?.name || defaultProviders[i]?.displayName || "Codex Handoff",
    enabled: Boolean(p?.enabled),
    preferred: Boolean(p?.preferred),
    status: p?.status || "unavailable",
    apiKey: p?.apiKey || "",
    baseUrl: p?.baseUrl || "",
    modelName: p?.modelName || "",
    timeout: typeof p?.timeout === "number" ? p.timeout : 5000,
    localOnly: Boolean(p?.localOnly),
    supportsStreaming: Boolean(p?.supportsStreaming),
    capabilities: Array.isArray(p?.capabilities) ? p.capabilities : []
  }));
  const safeRouting = Array.isArray(state.aiRoutingRules) ? state.aiRoutingRules : [];

  const approvalsByChain = state.approvals.reduce<Record<string, ApprovalItem[]>>((acc, a) => {
    const key = a.chainId || `single-${a.id}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});
  const chainEntries = Object.entries(approvalsByChain).sort((a, b) => {
    const at = a[1][0]?.createdAt || "";
    const bt = b[1][0]?.createdAt || "";
    return bt.localeCompare(at);
  });
  const filteredTelemetry = systemTelemetry.filter((e) => telemetryFilter === "all" || e.level === telemetryFilter);
  const displayedTelemetry = telemetryFilter === "all" ? systemTelemetry : filteredTelemetry;
  const stripAnsi = (value: string) => value.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
  const isKDroneActive = systemState === "processing" || systemTelemetry.slice(0, 8).some((event) => /build|analyz|vite|tsc|compile/i.test(stripAnsi(event.label || "")));

  const activeSectionKey = sectionKey(tab);
  const handleNavigateToCompanionSection = (sectionId: string) => {
    const nextTab = (navItems as readonly string[]).includes(sectionId) ? (sectionId as (typeof navItems)[number]) : "Dashboard";
    setTab(nextTab);
    setShowValhalla(false);
  };
  const renderNavItem = (item: (typeof navItems)[number]) => <button key={item} className={`nav-item ${tab === item ? "active" : ""} module-${sectionKey(item)}`} onClick={() => setTab(item)}>{item}</button>;
  const renderSettings = () => (
    <section className="settings-page">
      <div className="card panel-secondary"><ThemeSwitcher /></div>
      <div className="card panel-secondary"><p className="text-label">Project root path</p><input placeholder="Project root path" value={state.settings.projectRootPath} onChange={(e) => persist({ ...state, settings: { ...state.settings, projectRootPath: e.target.value } })} /></div>
      <div className="card panel-secondary"><p className="text-label">Gradle wrapper path</p><input placeholder="e.g. D:\KCxProjects\MyApp\gradlew.bat" value={state.settings.gradleWrapperPath} onChange={(e) => persist({ ...state, settings: { ...state.settings, gradleWrapperPath: e.target.value } })} /></div>
      <div className="grid-2">
        <article>
          <h3>Production Settings</h3>
          <label><input type="checkbox" checked={state.releaseSettings?.diagnosticsEnabled ?? true} onChange={(e) => persist({ ...state, releaseSettings: { ...(state.releaseSettings || defaultState.releaseSettings!), diagnosticsEnabled: e.target.checked } })} /> Diagnostics logging</label>
          <label><input type="checkbox" checked={state.releaseSettings?.telemetryEnabled ?? false} onChange={(e) => persist({ ...state, releaseSettings: { ...(state.releaseSettings || defaultState.releaseSettings!), telemetryEnabled: e.target.checked } })} /> Telemetry</label>
          <label><input type="checkbox" checked={state.releaseSettings?.experimentalFeaturesEnabled ?? false} onChange={(e) => persist({ ...state, releaseSettings: { ...(state.releaseSettings || defaultState.releaseSettings!), experimentalFeaturesEnabled: e.target.checked } })} /> Experimental features</label>
          <label><input type="checkbox" checked={state.releaseSettings?.backupOnSave ?? true} onChange={(e) => persist({ ...state, releaseSettings: { ...(state.releaseSettings || defaultState.releaseSettings!), backupOnSave: e.target.checked } })} /> Backup on save</label>
        </article>
        <div className="card panel-secondary">
          <h3 className="title">Cortex Auto-Queue</h3>
          <label><input type="checkbox" checked={cortexAutoQueue} onChange={(e) => setCortexAutoQueue(e.target.checked)} />{" "}Auto-queue Fix prompt after Cortex summarizes a build failure</label>
          <p className="subtle">When enabled, Cortex will automatically add a Fix prompt to the Approval Queue after completing a local summarization. You still approve manually before anything is sent.</p>
        </div>
        <article>
          <h3>Backup Options</h3>
          <button onClick={() => copyText(JSON.stringify(state, null, 2), "settings-export")}>Export Settings</button>
          <p className="subtle">{copyStatus?.id === "settings-export" ? copyStatus.message : "Settings export copies the local state JSON."}</p>
          <select value={state.releaseSettings?.updateChannel || "manual"} onChange={(e) => persist({ ...state, releaseSettings: { ...(state.releaseSettings || defaultState.releaseSettings!), updateChannel: e.target.value as "manual" | "beta" | "stable" } })}><option value="manual">manual</option><option value="beta">beta</option><option value="stable">stable</option></select>
        </article>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <article className="clear-all-logs-card">
            <div>
              <h3>Clear All Logs</h3>
              <p className="subtle">Remove runtime logs, telemetry history, build logs, diagnostics, and temporary event history.</p>
            </div>
            <button type="button" className="btn-clear-all-logs" onClick={() => setClearLogsModalOpen(true)}>Clear All Logs</button>
            {copyStatus?.id === "clear-all-logs" && <p className="subtle">{copyStatus.message}</p>}
          </article>
          <article className="clear-all-logs-card" style={{ borderColor: "rgba(255, 56, 56, 0.75)", boxShadow: "0 0 26px rgba(220, 40, 40, 0.22)" }}>
            <div>
              <h3>Fresh Start</h3>
              <p className="subtle">Wipe all temporary session data including prompts, build logs, telemetry, timeline, and runtime state. Projects, memory, settings, and providers are kept intact.</p>
            </div>
            <button type="button" className="btn-clear-all-logs" style={{ color: "#ff4d4d", borderColor: "rgba(255, 56, 56, 0.85)", background: "rgba(220, 40, 40, 0.18)" }} onClick={() => setFreshStartModalOpen(true)}>Fresh Start</button>
            {copyStatus?.id === "fresh-start" && <p className="subtle">{copyStatus.message}</p>}
          </article>
        </div>
      </div>
      <div className="card panel-secondary"><h3 className="title">KCx Ecosystem Reference</h3><img className="kcx-reference-image" src={kcxEcosystemReference} alt="KCx ecosystem reference" /><p className="subtle kcx-reference-caption">K = Kinetic systems<br />C = Core intelligence<br />x = orchestration flow</p></div>
    </section>
  );
  const renderClearLogsModal = () => clearLogsModalOpen ? (
    <div className="system-modal-overlay" role="presentation" onClick={() => setClearLogsModalOpen(false)}>
      <section className="system-confirm-modal clear-logs-modal" role="dialog" aria-modal="true" aria-labelledby="clear-logs-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="clear-logs-title">Clear All System Logs?</h2>
        <p>This removes temporary logs, telemetry history, build outputs, diagnostics, runtime events, and Valhalla dev logs. Projects, memories, prompts, protected files, and workflows will NOT be deleted.</p>
        <div className="system-modal-actions">
          <button type="button" onClick={() => setClearLogsModalOpen(false)}>Cancel</button>
          <button type="button" className="btn-clear-all-logs" onClick={handleClearAllLogs}>Clear Logs</button>
        </div>
      </section>
    </div>
  ) : null;
  const renderFreshStartModal = () => freshStartModalOpen ? (
    <div className="system-modal-overlay" role="presentation" onClick={() => setFreshStartModalOpen(false)}>
      <section className="system-confirm-modal fresh-start-modal" role="dialog" aria-modal="true" aria-labelledby="fresh-start-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="fresh-start-title">Fresh Start?</h2>
        <p>This will permanently clear:</p>
        <ul>
          <li>All Approval Queue prompts</li>
          <li>Build logs and analysis</li>
          <li>Session Timeline</li>
          <li>Telemetry history</li>
          <li>Cortex execution results</li>
          <li>Valhalla dev logs</li>
          <li>Patch review history</li>
          <li>Runtime diagnostics</li>
        </ul>
        <p>Your projects, memory, protected files, settings, and AI providers will NOT be affected.</p>
        <div className="system-modal-actions">
          <button type="button" onClick={() => setFreshStartModalOpen(false)}>Cancel</button>
          <button type="button" className="btn-clear-all-logs" style={{ color: "#ff4d4d", borderColor: "rgba(255, 56, 56, 0.85)", background: "rgba(220, 40, 40, 0.18)" }} onClick={handleFreshStart}>Fresh Start</button>
        </div>
      </section>
    </div>
  ) : null;

  if (showValhalla) return <ValhallaPage onExit={() => setShowValhalla(false)} onNavigateToCompanionSection={handleNavigateToCompanionSection} />;

  return <><div className="app-background"><div className="light-ray"></div><div className="light-ray"></div><div className="light-ray"></div><div className="light-ray"></div></div><div className={`shell app-shell section-${activeSectionKey}`}><aside className="sidebar panel-primary edge-glow-left"><div className="nav-group"><button type="button" onClick={() => setShowValhalla(true)}>Enter Valhalla</button></div><div className="nav-separator" /><div className="nav-group">{coreWorkflowNavItems.map((n) => renderNavItem(n))}</div><div className="nav-separator" /><div className="nav-group">{aiOperationsNavItems.map((n) => renderNavItem(n))}</div><div className="nav-separator" /><div className="nav-group">{developmentNavItems.map((n) => renderNavItem(n))}</div><div className="nav-separator" /><div className="nav-group">{systemNavItems.map((n) => renderNavItem(n))}</div><div className="nav-separator" /><div className="nav-group">{productInfoNavItems.map((n) => renderNavItem(n))}</div>{isDevelopment && <><div className="nav-separator" /><div className="nav-group">{devDebugNavItems.map((n) => renderNavItem(n))}</div></>}</aside><main>
    <header className="content-header panel-primary edge-glow-top">
      <button type="button" className="app-title-trigger app-title-center" onClick={() => setIsEcosystemDockOpen(true)}>
        <span className="brand text-header-md">KCx Studio Companion</span>
      </button>
      <div className="header-controls">
        <button type="button" className="ecosystem-dock-trigger" onClick={() => setIsEcosystemDockOpen(true)} aria-label="Open Ecosystem Dock">
          <EcosystemCluster systemState={systemState} isKDroneActive={isKDroneActive} />
        </button>
        <select value={projectId} onChange={(e) => void handleProjectChange(e.target.value)}>
          <option value="">Select Project</option>
          {state.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
    </header>
    {isEcosystemDockOpen && <div className="ecosystem-dock-overlay" onClick={() => setIsEcosystemDockOpen(false)}><section className="ecosystem-dock panel-primary" onClick={(e) => e.stopPropagation()} aria-modal="true" role="dialog"><div className="ecosystem-dock-header"><div><p className="title">Ecosystem Dock</p><p className="subtle">Expanded KCx subsystem visuals</p></div><div className="actions"><button type="button" className="ecosystem-dock-close" onClick={() => setIsEcosystemDockOpen(false)}>Close</button></div></div><div className="ecosystem-dock-body"><EcosystemStatusPanel systemState={systemState} isKDroneActive={isKDroneActive} /></div></section></div>}
    {renderClearLogsModal()}
    {renderFreshStartModal()}
    {tab === "Dashboard" && (
      <section className="dashboard-architecture dashboard-page" style={{ "--dashboard-bg-image": `url(${kcxDashboardBg})` } as React.CSSProperties}>
        <DashboardBackground />
        <section className="card panel-secondary system-status-panel">
          <h3 className="title">System Status Panel</h3>
          <div className="grid-2">
            <div className="card">
              <p>Active Project</p>
              <p className="subtle">{selectedProject?.name || "None selected"}</p>
              <span className={`status ${currentRiskLevel}`}>Risk: {currentRiskLevel}</span>
            </div>
            <div className="card">
              <p>Queue Counts</p>
              <p className="subtle">Pending {pendingCount} | Sent {sentCount} | Completed {completedCount} | Failed {failedCount}</p>
            </div>
            <div className="card">
              <p>Last Build Result</p>
              <span className={`status ${selectedProject?.buildIntel?.buildFailed ? "high" : selectedProject?.buildIntel?.buildSuccessful ? "low" : "medium"}`}>
                {selectedProject?.buildIntel?.buildFailed ? "Failed" : selectedProject?.buildIntel?.buildSuccessful ? "Success" : "Unknown"}
              </span>
            </div>
            <div className="card">
              <p>AI Provider Status</p>
              <p className="subtle">{state.aiProviders.filter((p) => p.enabled).length} enabled / {state.aiProviders.length} total</p>
            </div>
          </div>
        </section>
      </section>
    )}    {tab === "Projects" && <section><input placeholder="Project name" value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} /><input placeholder="Project path" value={projectForm.path} onChange={(e) => setProjectForm({ ...projectForm, path: e.target.value })} /><select value={projectForm.projectType} onChange={(e) => setProjectForm({ ...projectForm, projectType: e.target.value as ProjectType })}>{projectTypes.map((t) => <option key={t}>{t}</option>)}</select><input placeholder="App goal" value={projectForm.appGoal} onChange={(e) => setProjectForm({ ...projectForm, appGoal: e.target.value })} /><select value={projectForm.currentPhase} onChange={(e) => setProjectForm({ ...projectForm, currentPhase: e.target.value })}>{phases.map((p) => <option key={p}>{p}</option>)}</select><button onClick={addProject}>Add Project</button><div className="grid-2">{state.projects.map((project) => <article key={project.id} className="project-card"><div className="project-info"><h3>{project.name}</h3><p className="subtle">{project.path}</p><span className="status info">{project.appGoal || "No goal set"}</span></div><button className="delete-project-btn" onClick={() => handleDeleteProject(project.id)} title="Delete project">✕</button></article>)}</div></section>}
    {tab === "Project Memory" && <section><h3 className="title">Project Memory</h3><div className="card"><p className="subtle">Memory Overview</p><p>Protected files: {splitList(selectedProject?.projectMemory?.protectedFiles || "").length}</p><p>Important files: {splitList(selectedProject?.projectMemory?.importantFiles || "").length}</p><div className="chip-row">{splitList(selectedProject?.projectMemory?.protectedFiles || "").slice(0, 8).map((f, i) => <span className="chip" key={`${f}-${i}`}>{f}</span>)}</div></div><p>Project Goal</p><textarea value={selectedProject?.projectMemory?.projectGoal || ""} onChange={(e) => upProject({ projectMemory: { ...(selectedProject?.projectMemory || { projectGoal: "", importantFiles: "", protectedFiles: "", protectedSymbols: "", doNotRewriteRules: "", workflowNotes: "" }), projectGoal: e.target.value } })} /><p>Important Files</p><textarea value={selectedProject?.projectMemory?.importantFiles || ""} onChange={(e) => upProject({ projectMemory: { ...(selectedProject?.projectMemory || { projectGoal: "", importantFiles: "", protectedFiles: "", protectedSymbols: "", doNotRewriteRules: "", workflowNotes: "" }), importantFiles: e.target.value } })} /><p>Protected Files</p><textarea value={selectedProject?.projectMemory?.protectedFiles || ""} onChange={(e) => upProject({ projectMemory: { ...(selectedProject?.projectMemory || { projectGoal: "", importantFiles: "", protectedFiles: "", protectedSymbols: "", doNotRewriteRules: "", workflowNotes: "" }), protectedFiles: e.target.value } })} /><p>Do Not Rewrite Rules</p><textarea value={selectedProject?.projectMemory?.doNotRewriteRules || ""} onChange={(e) => upProject({ projectMemory: { ...(selectedProject?.projectMemory || { projectGoal: "", importantFiles: "", protectedFiles: "", protectedSymbols: "", doNotRewriteRules: "", workflowNotes: "" }), doNotRewriteRules: e.target.value } })} /><p>Workflow Notes</p><textarea value={selectedProject?.projectMemory?.workflowNotes || ""} onChange={(e) => upProject({ projectMemory: { ...(selectedProject?.projectMemory || { projectGoal: "", importantFiles: "", protectedFiles: "", protectedSymbols: "", doNotRewriteRules: "", workflowNotes: "" }), workflowNotes: e.target.value } })} /></section>}
    {tab === "Prompt Generator" && <section><button onClick={generateNextPrompt}>Generate Next Prompt</button></section>}
    {tab === "Approval Queue" && <section className="approval-queue"><h3 className="title">Approval Queue</h3><p>Pending: {pendingCount} | Sent: {sentCount} | Completed: {completedCount} | Failed: {failedCount}</p><div className="actions"><button onClick={() => persist({ ...state, approvals: state.approvals.filter((a) => a.status !== "sent" && a.status !== "completed") })}>Clear Sent/Completed</button><button onClick={() => { if (window.confirm("Clear all prompt cards?")) { persist({ ...state, approvals: [] }); } }}>Clear All Prompts</button></div>{chainEntries.map(([chainId, items]) => { const chainPending = items.filter((x) => x.status === "pending").length; const chainApproved = items.filter((x) => x.status === "approved").length; const chainSent = items.filter((x) => x.status === "sent").length; const chainCompleted = items.filter((x) => x.status === "completed").length; const chainFailed = items.filter((x) => x.status === "failed").length; return <article key={chainId}><div className="row"><p>Chain: {items[0]?.chainType || "General"}</p><span className={`status ${chainFailed ? "high" : chainPending ? "medium" : "low"}`}>{chainFailed ? "Risk" : "Stable"}</span></div><p>pending: {chainPending} | approved: {chainApproved} | sent: {chainSent} | completed: {chainCompleted} | failed: {chainFailed}</p>{items.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((a) => <details key={a.id} className="card"><summary><strong>{a.title}</strong>{a.riskLevel && <span className={`chip approval-risk-badge approval-risk-${a.riskLevel.toLowerCase()}`}>{a.riskLevel}</span>}{a.taskType && <span className="chip approval-task-type">{a.taskType}</span>}{a.offline && <span className="chip approval-offline-badge">Offline</span>} | <span className={`status ${a.status === "failed" ? "high" : a.status === "completed" ? "low" : "medium"}`}>{a.status}</span></summary><div><p className="subtle">Created: {a.createdAt}</p>{a.kind === "prompt" && <pre>{a.payload.slice(0, 500)}{a.payload.length > 500 ? "..." : ""}</pre>}{a.normTrace && <details className="norm-trace-details"><summary className="norm-trace-summary">Normalization Trace</summary><div className="norm-trace-body"><div className="norm-trace-row"><span className="norm-trace-label">Original</span><span className="norm-trace-value">{a.normTrace.original}</span></div><div className="norm-trace-row"><span className="norm-trace-label">Sanitized</span><span className="norm-trace-value">{a.normTrace.sanitized}</span></div><div className="norm-trace-row"><span className="norm-trace-label">Classification</span><span className="norm-trace-value">{a.normTrace.classificationReason}</span></div><div className="norm-trace-row"><span className="norm-trace-label">Rewrite Reduced</span><span className={`norm-trace-value norm-trace-flag ${a.normTrace.rewriteReduced ? "norm-trace-flag-active" : ""}`}>{a.normTrace.rewriteReduced ? "Yes — scope reduced" : "No"}</span></div>{a.normTrace.replacements.length > 0 && <div className="norm-trace-row norm-trace-replacements"><span className="norm-trace-label">Replacements</span><span className="norm-trace-value">{a.normTrace.replacements.map((r, i) => <span key={i} className="chip norm-trace-chip">{r}</span>)}</span></div>}{a.normTrace.replacements.length === 0 && <div className="norm-trace-row"><span className="norm-trace-label">Replacements</span><span className="norm-trace-value norm-trace-none">none</span></div>}</div></details>}<div className="actions">{a.status === "pending" && a.kind === "command" && <button onClick={() => runApprovedCommand(a)}>Approve & Execute</button>}{a.status === "pending" && a.kind === "prompt" && <button onClick={() => updateApprovalStatus(a, "approved")}>Approve</button>}{a.status === "pending" && <button onClick={() => updateApprovalStatus(a, "rejected")}>Reject</button>}{a.kind === "prompt" && <button onClick={() => copyText(a.payload, a.id)}>Copy Prompt</button>}{a.kind === "prompt" && <button onClick={() => updateApprovalStatus(a, "sent")}>Mark Sent to Codex</button>}{a.kind === "prompt" && <button onClick={async () => { const ok = await copyText(a.payload, a.id); if (ok) await updateApprovalStatus(a, "sent"); }}>Copy Prompt + Mark Sent</button>}{a.kind === "prompt" && <button onClick={() => updateApprovalStatus(a, "completed")}>Mark Completed</button>}{a.kind === "prompt" && <button onClick={() => updateApprovalStatus(a, "failed")}>Mark Failed</button>}<button onClick={() => persist({ ...state, approvals: state.approvals.filter((x) => x.id !== a.id) })}>Delete prompt</button></div>{copyStatus?.id === a.id && <p>{copyStatus.message}</p>}</div></details>)}</article>; })}</section>}
    {tab === "Build Logs" && <section className="cockpit-grid logs-grid">
      <div className="mission-main">
        <div className="card">
          <h3 className="title">Build Log Ingest</h3>
          <div className="build-command-section">
            <div className="build-command-heading">
              <h3>Build Command</h3>
              <div className="build-workflow-hints">
                {buildWorkflowHints.android && <span className="chip build-workflow-chip android">Android</span>}
                {buildWorkflowHints.node && <span className="chip build-workflow-chip node">VS Code / Node</span>}
                {!buildWorkflowHints.android && !buildWorkflowHints.node && <span className="chip build-workflow-chip">Custom</span>}
              </div>
            </div>
            <div className="preset-panel-wrapper" ref={presetPanelWrapperRef}>
              <div className="command-preset-row">
                <span className="command-preset-label">Command Preset</span>
                <button
                  ref={triggerBtnRef}
                  type="button"
                  className={`preset-trigger-btn${presetPanelOpen ? " is-active" : ""}`}
                  disabled={!selectedProject}
                  onClick={() => {
                    if (!presetPanelOpen) {
                      setPresetActiveTab(getPresetActiveTab(buildCommandPreset));
                      updatePresetPanelPosition();
                    }
                    setPresetPanelOpen((v) => !v);
                  }}
                >Presets</button>
              </div>
              {presetPanelOpen && createPortal(
              <div ref={presetPanelRef} className="preset-panel is-open" style={{ position: "fixed", top: panelPos.top, left: panelPos.left, zIndex: 9999 }}>
                <div className="preset-tabs">
                  <button type="button" className={`preset-tab preset-tab-android ${presetActiveTab === "android" ? "is-active" : ""}`} onClick={() => setPresetActiveTab("android")}>Android</button>
                  <button type="button" className={`preset-tab preset-tab-node ${presetActiveTab === "node" ? "is-active" : ""}`} onClick={() => setPresetActiveTab("node")}>Node/NPM</button>
                  <button type="button" className={`preset-tab preset-tab-electron ${presetActiveTab === "electron" ? "is-active" : ""}`} onClick={() => setPresetActiveTab("electron")}>Electron</button>
                  <button type="button" className={`preset-tab preset-tab-root ${presetActiveTab === "root" ? "is-active" : ""}`} onClick={() => setPresetActiveTab("root")}>Project Root</button>
                  <button type="button" className={`preset-tab preset-tab-adb ${presetActiveTab === "adb" ? "is-active" : ""}`} onClick={() => setPresetActiveTab("adb")}>ADB</button>
                  <button type="button" className={`preset-tab preset-tab-git ${presetActiveTab === "git" ? "is-active" : ""}`} onClick={() => setPresetActiveTab("git")}>Git</button>
                  <button type="button" className={`preset-tab preset-tab-tools ${presetActiveTab === "tools" ? "is-active" : ""}`} onClick={() => setPresetActiveTab("tools")}>Tools</button>
                  <button type="button" className={`preset-tab preset-tab-reset ${presetActiveTab === "reset" ? "is-active" : ""}`} onClick={() => setPresetActiveTab("reset")}>Reset</button>
                </div>
                <div className="preset-tab-content">
                {commandPresetGroups.filter((group) => presetGroupIdsByTab[presetActiveTab].includes(group.id)).map((group) => (
                  <div className="preset-section" key={group.id}>
                    <p className="preset-section-header">{group.label}</p>
                    <div className="preset-tiles">
                      {group.tiles.map((tile) => (
                        <button key={tile.id} type="button" className={`preset-tile ${group.colorClass}${buildCommandPreset === tile.id ? " is-selected" : ""}`} onClick={() => { void applyBuildCommandPreset(tile.id); setPresetPanelOpen(false); }}>{tile.label}</button>
                      ))}
                    </div>
                  </div>
                ))}
                </div>
              </div>,
              document.body
              )}
            </div>
            <div className="command-input-group">
              <input type="text" className="build-command-input" value={buildCommand} onChange={(e) => void updateBuildCommand(e.target.value)} placeholder={getBuildCommandPlaceholder()} title={buildCommand} />
              <button className="btn-run-build" onClick={handleRunBuild} disabled={isBuilding}>{isBuilding ? "BUILDING..." : "RUN BUILD"}</button>
              {isBuilding && <button className="btn-stop-build" onClick={handleStopBuild}>STOP</button>}
            </div>
            {lastBuildResult && <div className={`build-result ${lastBuildResult.success ? "success" : "failed"}`}>{lastBuildResult.success ? "✓ Build succeeded" : "✗ Build failed"}{" - "}{lastBuildResult.duration}ms</div>}
          </div>
          <textarea placeholder="Paste build log here" value={buildLogInput ?? ""} onChange={(e) => setBuildLogInput(e.target.value)} />
          <div className="actions"><button onClick={() => analyzeBuildLogs()}>Analyze Logs</button><button onClick={clearBuildLogs}>Clear Logs</button><button onClick={generateFixPromptFromAnalysis}>Generate Fix Prompt</button><button onClick={generateValidationPromptFromAnalysis}>Generate Validation Prompt</button><button onClick={generateRegressionPromptFromAnalysis}>Generate Regression Prompt</button></div>
          <input type="file" accept=".txt,.log,.kt,.java,.gradle,.kts,.xml" onChange={async (ev) => { await importBuildLog(ev); if (selectedProject && ev.target.files?.[0]) { await persist({ ...state, timeline: [pushEvent("Build Log Imported", "Build log imported"), ...state.timeline] }); } }} />
          {copyStatus?.id === "build-logs" && <p>{copyStatus.message}</p>}
        </div>
        <article className="scroll-card">{((selectedProject?.buildLogHistory ?? []) as BuildLogRecord[]).slice(0, 5).length === 0 ? <p>No build analysis yet.</p> : ((selectedProject?.buildLogHistory ?? []) as BuildLogRecord[]).slice(0, 5).map((r) => <div key={r?.id || id()} className="card"><p>{r?.timestamp || "None detected"}</p><p>{r?.summary || "None detected"}</p>{(r?.analysis ?? []).length === 0 ? <p>No build analysis yet.</p> : (r?.analysis ?? []).map((a, i) => <div key={`${r?.id || "rec"}-${i}`}><p>{a?.detectedType || "None detected"}</p><p>Severity: {a?.severity || "None detected"}</p><p>Confidence: {typeof a?.confidence === "number" ? `${(a.confidence * 100).toFixed(0)}%` : "None detected"}</p><p>Detected files: {Array.isArray(a?.likelyFiles) && a.likelyFiles.length ? a.likelyFiles.join(", ") : "None detected"}</p></div>)}</div>)}</article>
      </div>
      <aside className="telemetry"><div className="card">{protectedHitBadge.hasHit ? <p>Protected architecture area detected.</p> : <p>No protected-file collisions detected.</p>}</div><div className="card"><button onClick={generateNextPrompt}>Generate Next Prompt</button>{!(buildLogInput ?? selectedProject?.buildLogs ?? "").trim() && <p className="subtle">No build logs pasted yet.</p>}</div></aside>
    </section>}
    {tab === "Patch Review" && <section><h3 className="title">Patch Review</h3><textarea placeholder="Paste Codex/GPT patch summary" value={patchReviewInput} onChange={(e) => setPatchReviewInput(e.target.value)} /><button onClick={savePatchReview}>Save Review</button><article>{latestReview ? <><div className={`status ${latestReview.riskLevel}`}>Risk: {latestReview.riskLevel}</div>{latestReview.riskLevel !== "low" && <div className="risk-banner">Architecture warning: review broad changes carefully before merge.</div>}<details open><summary>Changed Files</summary><p>{latestReview.filesChanged.join(", ") || "None"}</p></details><details><summary>Risky Wording</summary><p>{latestReview.riskyPhrases.join(", ") || "None detected"}</p></details><details><summary>Validation Recommendations</summary><p>{latestReview.recommendedNextStep}</p></details><p>Build outcome: {latestReview.buildOutcome}</p><p>Likely systems affected: {latestReview.likelySystemsAffected.join(", ") || "None"}</p></> : <div className="empty">No patch review analyzed yet.</div>}</article></section>}
    {isDevelopment && tab === "Development Tools" && <section><button onClick={async () => { if (!selectedProject) { setCopyStatus({ id: "dev-tools", message: "Build command runner not wired yet." }); return; } const newApproval: ApprovalItem = { id: id(), projectId: selectedProject.id, kind: "command", title: "Run npm build", payload: JSON.stringify({ command: "npm.cmd", args: ["run", "build"], cwd: selectedProject.path }), status: "pending", createdAt: new Date().toISOString() }; await persist({ ...state, approvals: [newApproval, ...state.approvals] }); setCopyStatus({ id: "dev-tools", message: "Build command queued in Approval Queue." }); }}>Run npm build</button>{copyStatus?.id === "dev-tools" && <p>{copyStatus.message}</p>}</section>}
    {tab === "Project Context" && <section><button onClick={scanProject} disabled={isScanning}>{isScanning ? "Scanning..." : "Scan Project"}</button><button onClick={generateNextPrompt}>Generate Next Prompt</button><article><p>Detected frameworks: {(selectedProject?.snapshot?.frameworks || []).join(", ") || "None"}</p><p>File count: {selectedProject?.snapshot?.totalFileCount ?? 0}</p><p>Project size: {selectedProject?.snapshot?.approxProjectSize || "n/a"}</p><p>Top folders: {(selectedProject?.snapshot?.majorSourceFolders || []).slice(0, 8).join(", ") || "None"}</p><p>Last scan time: {selectedProject?.snapshot?.lastScanTime || "Never"}</p></article></section>}
    {tab === "Settings" && renderSettings()}
    {tab === "About" && <section><h3 className="title">KCx Studio Companion</h3><div className="grid-2"><article><p>KCx Labs</p><p className="subtle">Local-first orchestration environment for build review, prompt chains, project memory, and safe workflow execution.</p><p>Version: {releaseInfo?.version || "0.9.0-beta.1"}</p><p>Channel: {releaseInfo?.channel || state.releaseSettings?.buildChannel || "private-beta"}</p></article><article><p>Runtime</p><p>Electron: {releaseInfo?.electron || "n/a"}</p><p>Chrome: {releaseInfo?.chrome || "n/a"}</p><p>Node: {releaseInfo?.node || "n/a"}</p><p>Packaged: {releaseInfo?.packaged ? "yes" : "no"}</p></article></div><footer className="subtle">Copyright (c) 2026 KCx Labs. Local data remains on this machine unless a user-configured provider is explicitly used.</footer></section>}
    {tab === "Release Notes" && <section><h3 className="title">Release Notes</h3><article><h3>0.9.0-beta.1</h3><p>Production packaging foundation, defensive storage recovery, diagnostics logging, product settings, release documentation, and paid-product architecture hooks.</p></article><article><h3>Update Architecture</h3><p className="subtle">Manual channel is active. Beta and stable update channels are modeled for future integration without forcing a cloud account.</p></article></section>}
    {tab === "First Launch" && <section><h3 className="title">First Launch</h3><div className="grid-2"><article><h3>Workspace</h3><p>Projects are local folders scanned for context, build systems, protected files, and workflow history.</p></article><article><h3>Providers</h3><p>Local orchestration remains primary. Cloud providers stay disabled until configured by the user.</p></article><article><h3>Safety</h3><p>Commands route through approval queues and prompt chains include rewrite-risk checks.</p></article><article><h3>Recovery</h3><p>State is loaded defensively with backup restore and clean fallback initialization.</p></article></div></section>}
    {tab === "Product Foundation" && <section className="paid-product-foundation"><h3 className="section-title">Paid Product Foundation</h3><div className="foundation-grid"><article className="foundation-card license-card"><h4>License Status</h4><div className="license-info"><div className="info-row"><span className="label">Mode:</span><span className="value">{state.license?.mode || "community"}</span></div><div className="info-row"><span className="label">Entitlements:</span><span className="value">{(state.license?.entitlements || []).join(", ") || "none"}</span></div></div></article><article className="foundation-card capabilities-card"><h4>Future Capabilities</h4><div className="feature-list"><div className="feature-item"><span className="feature-icon">ACC</span><div className="feature-details"><strong>Account Integration</strong><p>Optional cloud sync and team workspace features.</p></div></div><div className="feature-item"><span className="feature-icon">PLG</span><div className="feature-details"><strong>Plugin Marketplace</strong><p>Extend workflows with community modules.</p></div></div><div className="feature-item"><span className="feature-icon">UPD</span><div className="feature-details"><strong>Update Channels</strong><p>Roll forward through manual, beta, and stable tracks.</p></div></div></div></article></div><div className="foundation-footer"><p>Local orchestration, project memory, plugin/module slots, update channels, subscription state, and future account-link hooks are modeled without payment-provider integration.</p></div></section>}
    {tab === "Session Timeline" && <section><h3 className="title">Session Timeline</h3><p>Total events shown: {filtered.length}</p><div className="actions"><button onClick={() => persist({ ...state, timeline: [] })}>Clear Timeline</button><select value={timelineFilter} onChange={(e) => setTimelineFilter(e.target.value)}><option value="all">all</option><option value="prompts">prompts</option><option value="builds">builds</option><option value="commands">commands</option><option value="scans">scans</option><option value="failures">failures</option><option value="completed">completed work</option></select></div>{filtered.length === 0 ? <div className="empty">No timeline events yet.</div> : filtered.map((e) => <details key={e.id} className="card"><summary><span className={`status ${e.type.includes("Failed") ? "high" : e.type.includes("Succeeded") || e.type.includes("Completed") ? "low" : "medium"}`}>{e.type}</span> {e.summary}</summary><p className="subtle">{e.timestamp}</p><p>{e.details || "No extra details."}</p></details>)}</section>}
    {tab === "Telemetry" && <section><h3 className="title">System Telemetry</h3><div className="telemetry-controls"><div className="filter-buttons"><button className={telemetryFilter === "all" ? "active" : ""} onClick={() => setTelemetryFilter("all")}>All</button><button className={telemetryFilter === "warning" ? "active" : ""} onClick={() => setTelemetryFilter("warning")}>Warnings</button><button className={telemetryFilter === "error" ? "active" : ""} onClick={() => setTelemetryFilter("error")}>Errors</button></div><button className="btn-clear-telemetry" onClick={handleClearTelemetry}>Clear Telemetry</button></div><div className="status-legend"><h4 className="legend-title">Status Indicators</h4><div className="legend-grid"><div className="legend-item"><span className="status idle">IDLE</span><span className="legend-label">System stable</span></div><div className="legend-item"><span className="status processing">PROCESSING</span><span className="legend-label">Task in progress</span></div><div className="legend-item"><span className="status warning">WARNING</span><span className="legend-label">Attention required</span></div><div className="legend-item"><span className="status error">ERROR</span><span className="legend-label">Action needed</span></div></div></div><div className="scroll-card telemetry-feed">{systemTelemetry.length === 0 ? <p className="subtle">No telemetry events yet.</p> : displayedTelemetry.length === 0 ? <p className="subtle">No matching telemetry events yet.</p> : displayedTelemetry.slice(0, 8).map((e) => { const cleanLabel = stripAnsi(e.label || ""); return <p key={e.id} className="telemetry-row"><span className="subtle telemetry-time">{e.at ? new Date(e.at).toLocaleString() : "(no time)"}</span><span className="telemetry-label" title={cleanLabel}>{cleanLabel}</span>{e.level && <span className={`status telemetry-state telemetry-state-${e.level}`}>{e.level}</span>}</p>; })}</div></section>}
    {isDevelopment && tab === "Ecosystem Test" && <section><EcosystemTest /></section>}
    {tab === "AI Providers" && <section className="cockpit-grid providers-grid"><div className="mission-main"><h3 className="title">AI Providers</h3><div className="grid-2">{safeProviders.length === 0 ? <div className="empty">No providers configured.</div> : safeProviders.map((p) => { const name = (p.displayName || "").toLowerCase(); const isManual = name.includes("codex"); const isLocalBrain = name.includes("local kcx brain"); const isOllama = name.includes("ollama"); const isPlaceholder = p.status === "placeholder" || p.status === "disabled"; const isCloud = !isLocalBrain && !isOllama && !isManual; const showApiKey = isCloud && !isPlaceholder; const showBaseUrl = isCloud || isOllama; const showModel = isCloud || isOllama; const canTest = (isCloud || isOllama) && p.enabled && !isPlaceholder; const typeBadge = isManual ? "Manual Handoff" : (isLocalBrain || isOllama ? "Local" : "Cloud"); const note = isLocalBrain ? "Built-in local orchestration provider." : isManual ? "Used for copy/paste Codex prompt handoff." : isOllama ? "Local model endpoint provider." : isPlaceholder ? "Provider is placeholder/disabled until configured." : "Cloud provider for orchestration tasks."; return <article key={p.providerId}><div className="row"><p>{p.displayName || "Unknown Provider"}</p><span className={`status ${p.status || "unavailable"}`}>{p.status || "unavailable"}</span></div><div className="chip-row"><span className="chip">{typeBadge}</span>{p.preferred && <span className="chip">Preferred</span>}{p.supportsStreaming && <span className="chip">Streaming</span>}</div><p className="subtle">{note}</p><label><input type="checkbox" checked={Boolean(p.enabled)} onChange={(e) => updateProvider(p.providerId, { enabled: e.target.checked })} /> Enabled</label><label><input type="checkbox" checked={Boolean(p.preferred)} onChange={() => persist({ ...state, aiProviders: safeProviders.map((x) => ({ ...x, preferred: x.providerId === p.providerId })) })} /> Preferred</label>{showApiKey && <input placeholder="API Key" value={p.apiKey || ""} onChange={(e) => updateProvider(p.providerId, { apiKey: e.target.value })} />} {showBaseUrl && <input placeholder="Base URL" value={p.baseUrl || ""} onChange={(e) => updateProvider(p.providerId, { baseUrl: e.target.value })} />} {showModel && <input placeholder="Model Name" value={p.modelName || ""} onChange={(e) => updateProvider(p.providerId, { modelName: e.target.value })} />} {(isCloud || isOllama) && <input placeholder="Timeout" type="number" value={typeof p.timeout === "number" ? p.timeout : 5000} onChange={(e) => updateProvider(p.providerId, { timeout: Number(e.target.value) || 5000 })} />} {canTest ? <button onClick={() => testProvider(p)}>Test Connection</button> : <button disabled>{isLocalBrain ? "Local brain active" : isManual ? "Manual workflow provider" : "Test unavailable"}</button>}{copyStatus?.id === p.providerId && <p>{copyStatus.message}</p>}<div className="chip-row">{(Array.isArray(p.capabilities) ? p.capabilities : []).map((c) => <span className="chip" key={`${p.providerId}-${c}`}>{c}</span>)}</div></article>; })}</div><h3>Routing Matrix</h3><div className="grid-2">{safeRouting.map((r, i) => <article key={`${r.task}-${i}`}><div className="row"><span>{r.task}</span><span className="status medium">{r.provider}</span></div><p className="subtle">{r.reason}</p><select value={r.provider} onChange={(e) => persist({ ...state, aiRoutingRules: safeRouting.map((x, idx) => idx === i ? { ...x, provider: e.target.value as AiRoutingRule["provider"] } : x) })}>{safeProviders.map((p) => <option key={p.providerId} value={p.displayName}>{p.displayName}</option>)}</select></article>)}</div></div><aside className="telemetry"><div className="card"><p>Provider health summary</p><p className="subtle">Connected: {safeProviders.filter((p) => p.status === "connected" || p.status === "local_only").length}</p><p className="subtle">Unavailable: {safeProviders.filter((p) => p.status === "unreachable" || p.status === "unavailable").length}</p></div><div className="card"><p>AI Decision Trace</p><div className="scroll-card">{(state.aiDecisionTrace || []).slice(0, 8).map((d) => <p key={d.id}>{d.task} {"->"} {d.provider}</p>)}</div></div></aside></section>}
  </main></div></>;
}
