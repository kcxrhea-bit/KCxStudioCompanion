import { createBridge } from "./CortexBridge";
import { cortexEventBus } from "./CortexEventBus";
import { registerProvider, createCortexProvider } from "./CortexProvider";
import { getActivationBlockedReason } from "./CortexPermissions";
import { BuildAnalysisExecutionBridge } from "./bridges/BuildAnalysisExecutionBridge";
import { deriveBridgeReadinessFromSnapshot } from "./bridges/CortexBridgeReadiness";
import { CortexExecutionEngine } from "./execution/CortexExecutionEngine";
import { CortexExecutionHistory } from "./execution/CortexExecutionHistory";
import { cortexExecutionPermissions } from "./execution/CortexExecutionPermissions";
import { CortexManualExecutionQueue } from "./execution/CortexManualExecutionQueue";
import { cortexExecutionSandbox } from "./execution/CortexExecutionSandbox";
import { CortexActivationRequest, CortexActivationTarget, CortexProviderTelemetry, CortexRuntimeSnapshot, CortexRuntimeState, CortexTimelineEvent, CortexTimelineEventType, CortexTimelineSeverity, KCxModeAIBrainDiagnostics, ProviderSource } from "./types";
import { KCxModeAIProviderAdapter } from "./providers/KCxModeAIProviderAdapter";
import { OllamaProviderAdapter } from "./providers/OllamaProviderAdapter";
import { kcxModeAIBrainAdapter } from "./providers/KCxModeAIBrainAdapter";
import { normalize as smartBrainNormalize } from "./intelligence/SmartBrainNormalizer";
import { cortexMemory } from "./intelligence/CortexMemory";

class CortexRuntime {
  private readonly PERSIST_KEY = "cortex-runtime-config";
  private state: CortexRuntimeState = "contained";
  private providers = [
    createCortexProvider("studio-companion-analysis", "studio-companion-analysis", "StudioCompanionAnalysis", ["build_intel", "context_scan"], "dormant", 28, "analysis", "display-only / not connected", "Provider registered / adapter missing", "Manual operator activation", "Build analysis bridge", "contained"),
    createCortexProvider("kcxmodeai", "kcxmodeai", "KCxModeAI", ["mode_orchestration", "local_brain_fallback"], "monitoring", 72, "orchestration", "embedded — local fallback active", "Embedded brain contained — execution read-only", "Brain active as local Cortex fallback", "KCxModeAI embedded brain", "contained"),
    createCortexProvider("local-ollama-runtime", "local-ollama", "LocalOllamaRuntime", ["local_inference", "model_registry"], "dormant", 6, "local-runtime", "offline", "Local runtime unavailable", "Initialize local runtime", "Local runtime host", "contained"),
    createCortexProvider("valhalla-runtime-provider", "studio-companion-analysis", "ValhallaRuntime", ["runtime_orchestration"], "monitoring", 18, "orchestration", "display-only / monitoring", "Provider registered / adapter missing", "Register runtime provider", "Valhalla runtime bridge", "contained"),
    createCortexProvider("build-telemetry-provider", "studio-companion-analysis", "BuildTelemetryProvider", ["build_events", "pipeline_summary"], "dormant", 12, "telemetry", "unavailable", "Provider registered / adapter missing", "Manual operator activation", "Telemetry bridge", "contained")
  ];
  private bridges = [
    createBridge("valhalla-runtime", "ValhallaRuntimeBridge", "read-only", 22, "runtime", "Valhalla runtime kernel", "Runtime containment active", "Local runtime initialization"), // future arc: activate when Valhalla runtime wires its own execution boundary
    createBridge("studio-companion-analysis", "BuildAnalysisBridge", "read-only", 18, "analysis", "Build analysis subsystem", "Operator approval required", "Manual operator activation"), // future arc: activate when build-analysis bridge opens write boundary
    createBridge("project-memory", "ProjectMemoryBridge", "read-only", 12, "memory", "Project memory store", "Runtime containment active", "Manual operator activation"),
    createBridge("kcxmodeai", "KCxModeAIBridge", "restricted", 72, "ai-provider", "Embedded brain fallback layer", "Brain embedded — execution contained", "Brain active as Cortex local fallback"),
    createBridge("build-telemetry", "RuntimeTelemetryBridge", "monitored", 16, "telemetry", "Telemetry runtime channel", "Local runtime unavailable", "Local runtime initialization"),
    createBridge("messenger", "MessengerBridge", "read-only", 10, "messaging", "Messenger companion channel", "Operator approval required", "Manual operator activation"),
    // Ecosystem map — honest readiness, no fabricated runtime connections
    createBridge("studio-companion-self", "StudioCompanionBridge", "read-only", 85, "ecosystem", "KCx Studio Companion (this app)", "Self-referential — runtime active", "Local runtime active"),
    createBridge("cortex-intelligence", "CortexBridge", "read-only", 45, "ecosystem", "Cortex orchestration layer", "Display-only / not connected", "Cortex session active"),
    createBridge("smart-brain-normalizer", "SmartBrainBridge", "read-only", 45, "ecosystem", "SmartBrain normalizer module", "Display-only / not connected", "Normalizer session active"),
    createBridge("kcxmode-android", "KCxModeBridge", "disabled", 0, "ecosystem", "KCxMode / GodzillaMode Android launcher", "External Android project — no runtime connection", "Configure local project path"),
    createBridge("messenger-desktop", "MessengerDesktopBridge", "read-only", 5, "ecosystem", "KCx Messenger Desktop", "Desktop runtime not wired", "Manual operator activation"),
    createBridge("robot-buddy", "RobotBuddyBridge", "disabled", 0, "ecosystem", "KCx Robot Buddy — Android", "External Android project — no runtime connection", "Configure local project path"),
    createBridge("ringer-restore", "RingerRestoreBridge", "disabled", 0, "ecosystem", "KCx Ringer Restore — Android", "External Android project — no runtime connection", "Configure local project path"),
    createBridge("kcx-site", "KCxSiteBridge", "disabled", 0, "ecosystem", "KCx Labs Website / KCxSite", "External web project — no runtime connection", "Configure local project path"),
    createBridge("kcx-translator", "TranslatorBridge", "disabled", 0, "ecosystem", "KCx Translator", "External project — no runtime connection", "Configure local project path"),
    createBridge("dino-holo-friend", "DinoHoloFriendBridge", "disabled", 0, "ecosystem", "DinoHoloFriend — Android", "External Android project — no runtime connection", "Configure local project path"),
    createBridge("after-earth", "AfterEarthBridge", "disabled", 0, "ecosystem", "AfterEarth — Android", "External Android project — no runtime connection", "Configure local project path"),
    createBridge("easy-launcher", "EasyLauncherBridge", "disabled", 0, "ecosystem", "EasyLauncher — Android", "External Android project — no runtime connection", "Configure local project path"),
    createBridge("pc-streamer", "PCStreamerBridge", "disabled", 0, "ecosystem", "PCStreamer — utility", "External project — no runtime connection", "Configure local project path")
  ];
  private permissions: Record<string, "read-only" | "monitored" | "operator-approved" | "restricted" | "disabled"> = {
    runtime: "read-only",
    providers: "read-only",
    bridges: "read-only"
  };
  private alerts: string[] = ["Runtime bridge not connected"];
  private activationRequests: CortexActivationRequest[] = [];
  private timelineEvents: CortexTimelineEvent[] = [];
  private readonly ollamaProviderAdapter = new OllamaProviderAdapter();
  private readonly kcxModeAIProviderAdapter = new KCxModeAIProviderAdapter();
  private readonly providerAdapters = [this.ollamaProviderAdapter, this.kcxModeAIProviderAdapter];
  private readonly manualExecutionQueue = new CortexManualExecutionQueue(cortexExecutionPermissions, cortexExecutionSandbox);
  private readonly executionHistory = new CortexExecutionHistory();
  private readonly executionEngine = new CortexExecutionEngine(this.manualExecutionQueue, this.providerAdapters, cortexExecutionPermissions, cortexExecutionSandbox, this.executionHistory);
  private readonly buildAnalysisBridge = new BuildAnalysisExecutionBridge();
  private cachedContext: {
    projectName?: string;
    projectPath?: string;
    buildLogTail?: string;
    lastErrorType?: string;
    ollamaStatus?: string;
    filesFound?: string[];
    frameworks?: string[];
    majorSourceFolders?: string[];
    detectedTypes?: string[];
  } = {};
  private liveLogBuffer: string[] = [];
  private readonly LIVE_LOG_MAX_CHARS = 800;
  private initialized = false;
  private kcxBrainDiagnostics: KCxModeAIBrainDiagnostics = {
    embeddedBrainAvailable: true,
    lastFallbackUsed: false,
  };

  private readonly PROVIDER_SOURCES: ProviderSource[] = ["ollama", "kcxmodeai-brain", "rule-based", "blocked", "unknown"];
  private providerTelemetry: CortexProviderTelemetry = {
    lastResponseSource: "unknown",
    lastProviderAttempted: "unknown",
    lastProviderSucceeded: null,
    lastProviderFailed: null,
    lastProviderError: null,
    lastProviderUsedAt: null,
    providerAttemptCounts: { ollama: 0, "kcxmodeai-brain": 0, "rule-based": 0, blocked: 0, unknown: 0 },
    providerSuccessCounts: { ollama: 0, "kcxmodeai-brain": 0, "rule-based": 0, blocked: 0, unknown: 0 },
    providerFailureCounts: { ollama: 0, "kcxmodeai-brain": 0, "rule-based": 0, blocked: 0, unknown: 0 },
  };

  private recordProviderAttempt(source: ProviderSource) {
    this.providerTelemetry = {
      ...this.providerTelemetry,
      lastProviderAttempted: source,
      providerAttemptCounts: {
        ...this.providerTelemetry.providerAttemptCounts,
        [source]: this.providerTelemetry.providerAttemptCounts[source] + 1,
      },
    };
  }

  private recordProviderSuccess(source: ProviderSource) {
    this.providerTelemetry = {
      ...this.providerTelemetry,
      lastResponseSource: source,
      lastProviderSucceeded: source,
      lastProviderUsedAt: Date.now(),
      providerSuccessCounts: {
        ...this.providerTelemetry.providerSuccessCounts,
        [source]: this.providerTelemetry.providerSuccessCounts[source] + 1,
      },
    };
  }

  private recordProviderFailure(source: ProviderSource, error: string) {
    const truncated = error.slice(0, 300);
    this.providerTelemetry = {
      ...this.providerTelemetry,
      lastProviderFailed: source,
      lastProviderError: truncated,
      providerFailureCounts: {
        ...this.providerTelemetry.providerFailureCounts,
        [source]: this.providerTelemetry.providerFailureCounts[source] + 1,
      },
    };
  }

  getProviderTelemetry(): CortexProviderTelemetry {
    return { ...this.providerTelemetry, providerAttemptCounts: { ...this.providerTelemetry.providerAttemptCounts }, providerSuccessCounts: { ...this.providerTelemetry.providerSuccessCounts }, providerFailureCounts: { ...this.providerTelemetry.providerFailureCounts } };
  }

  private loadPersistedConfig(): { ollamaEnabled: boolean } {
    try {
      const raw = localStorage.getItem(this.PERSIST_KEY);
      return raw ? JSON.parse(raw) : { ollamaEnabled: false };
    } catch { return { ollamaEnabled: false }; }
  }

  private savePersistedConfig(config: { ollamaEnabled: boolean }) {
    try { localStorage.setItem(this.PERSIST_KEY, JSON.stringify(config)); }
    catch {}
  }

  getOllamaRuntimeStatus() {
    const persisted = this.loadPersistedConfig();
    const readiness = this.ollamaProviderAdapter.describeReadiness();
    return {
      enabled: persisted.ollamaEnabled || readiness.enabled,
      configured: readiness.configured,
      endpointValid: readiness.endpointValid
    };
  }

  initialize() {
    if (this.initialized) return;
    this.initialized = true;
    cortexEventBus.subscribe((event) => {
      if (event.type === "project-context-updated") {
        const projectName = event.payload?.projectName as string | undefined;
        this.cachedContext = {
          projectName,
          projectPath: event.payload?.projectPath as string | undefined,
          buildLogTail: event.payload?.buildLogTail as string | undefined,
          lastErrorType: event.payload?.lastErrorType as string | undefined,
          ollamaStatus: event.payload?.ollamaStatus as string | undefined,
          filesFound: event.payload?.filesFound as string[] | undefined,
          frameworks: event.payload?.frameworks as string[] | undefined,
          majorSourceFolders: event.payload?.majorSourceFolders as string[] | undefined,
          detectedTypes: event.payload?.detectedTypes as string[] | undefined
        };
        cortexMemory.setProjectKey(projectName ?? "default");
      }
    });
    const saved = this.loadPersistedConfig();
    if (saved.ollamaEnabled) {
      this.enableLocalOllamaManualSummaries().catch(() => undefined);
    }
    cortexEventBus.emit("runtime-state-changed", "Cortex runtime initialized", { state: this.state });
    this.providers = registerProvider(
      this.providers,
      createCortexProvider("future-cloud-provider", "future-cloud-provider", "FutureCloudProvider", ["remote_routing"], "dormant", 4, "ai-provider", "offline", "Provider bridge disconnected", "Enable provider bridge", "Provider registration", "contained")
    );
    this.addTimelineEvent("runtime", "info", "Cortex runtime initialized", "Contained runtime shell initialized.", "runtime");
    this.addTimelineEvent("containment", "locked", "Runtime containment active", "All execution pathways remain contained.", "runtime");
    this.addTimelineEvent("provider", "monitoring", "Provider registry initialized", "Dormant providers loaded in read-only mode.", "provider");
    this.addTimelineEvent("bridge", "monitoring", "Bridge registry initialized", "Bridge systems registered as dormant.", "bridge");
    this.addTimelineEvent("activation", "locked", "Activation pathways locked", "Operator approval workflow simulation only.", "system");
    this.addTimelineEvent("diagnostics", "info", "Diagnostics layer initialized", "Read-only diagnostics state is available.", "system");
    this.addTimelineEvent("system", "locked", "Local execution scaffold initialized", "Manual-only adapter boundaries are prepared but execution remains disabled.", "system");
  }

  getSnapshot(): CortexRuntimeSnapshot {
    const memoryHints = cortexMemory.getHints();
    const bridgeCtx = {
      embeddedBrain: this.kcxBrainDiagnostics,
      telemetry: this.providerTelemetry,
      buildContextAvailable: Boolean(this.cachedContext.buildLogTail?.trim()),
      projectMemoryEntries: memoryHints.topFiles.length,
      ollamaEnabled: this.ollamaProviderAdapter.describeReadiness().enabled,
    };
    const derivedBridges = this.bridges.map((bridge) => ({
      ...bridge,
      ...deriveBridgeReadinessFromSnapshot(bridge, bridgeCtx),
    }));
    const availableProviders = this.providers.filter((provider) => provider.available).length;
    const connectedBridges = derivedBridges.filter((bridge) => bridge.state === "connected").length;
    const containedSystems = this.providers.filter((provider) => provider.containmentState === "contained").length + derivedBridges.length;
    const readonlySystems = this.providers.filter((provider) => provider.readonly).length + derivedBridges.filter((bridge) => bridge.readonly).length;
    const lockedSystems = derivedBridges.filter((bridge) => bridge.state !== "connected").length + this.providers.filter((provider) => provider.state === "dormant").length;
    const monitoringSystems = this.providers.filter((provider) => provider.state === "monitoring").length + derivedBridges.filter((bridge) => bridge.state === "monitoring").length;
    return {
      state: this.state,
      contained: this.state === "contained" || this.state === "dormant",
      providers: this.providers,
      bridges: derivedBridges,
      permissions: this.permissions,
      alerts: this.alerts,
      activationRequests: this.activationRequests,
      timelineEvents: this.timelineEvents,
      operationalSummary: {
        runtimePosture: "Contained Monitoring Mode",
        commandReadiness: Math.round((this.providers.reduce((sum, provider) => sum + provider.readiness, 0) + derivedBridges.reduce((sum, bridge) => sum + bridge.readiness, 0)) / (this.providers.length + derivedBridges.length)),
        activeExecution: false,
        containedSystems,
        readonlySystems,
        lockedSystems,
        monitoringSystems,
        activationRequests: this.activationRequests.length,
        operationalCapabilities: [
          "Runtime monitoring",
          "Provider diagnostics",
          "Bridge diagnostics",
          "Activation request simulation",
          "Event timeline analysis",
          "Read-only runtime inspection",
          "Operational readiness tracking"
        ],
        blockedCapabilities: [
          "Provider execution",
          "AI inference runtime",
          "Autonomous orchestration",
          "Bridge execution",
          "Memory routing",
          "External runtime control",
          "Live provider activation"
        ]
      },
      diagnostics: {
        runtimeHealth: "stable",
        containment: "active",
        bridgeReadiness: connectedBridges === 0 ? 0 : Math.round((connectedBridges / derivedBridges.length) * 100),
        providerAvailability: this.providers.length === 0 ? 0 : Math.round((availableProviders / this.providers.length) * 100),
        permissionIntegrity: "stable",
        alerts: [],
        warnings: this.ollamaProviderAdapter.describeReadiness().enabled
          ? ["Build loop active — Cortex monitoring for failures", "Bridge activation requires operator approval"]
          : ["Local model runtime not connected", "Bridge activation requires operator approval"],
        lastRuntimeCheck: new Date().toISOString()
      },
      embeddedBrain: this.getKcxModeAIBrainDiagnostics(),
      telemetry: this.getProviderTelemetry(),
      localExecution: {
        initialized: true,
        activeExecution: this.ollamaProviderAdapter.describeReadiness().enabled,
        copy: "Local execution is prepared but not active. Cortex cannot run providers until manual approval, adapter enablement, and sandbox checks pass.",
        adapters: this.providerAdapters.map((adapter) => adapter.describeReadiness()),
        manualQueue: this.manualExecutionQueue.getSnapshot(),
        permissions: cortexExecutionPermissions.describePolicy(),
        sandbox: cortexExecutionSandbox.describeRules(),
        buildAnalysisBridge: this.buildAnalysisBridge.getStatus(),
        results: this.executionHistory.getResults()
      }
    };
  }

  requestActivation(targetId: string, targetType: CortexActivationTarget, reason: string) {
    const request: CortexActivationRequest = {
      id: crypto.randomUUID(),
      targetId,
      targetType,
      state: "denied",
      requestedAt: new Date().toISOString(),
      reason,
      blockedReason: getActivationBlockedReason(targetType),
      operatorApprovalRequired: true,
      containmentLock: true
    };
    this.activationRequests = [request, ...this.activationRequests].slice(0, 20);
    this.addTimelineEvent("activation", "denied", "Activation denied", `${targetType} ${targetId} denied: ${request.blockedReason}.`, targetType, targetId);
    cortexEventBus.emit("permission-updated", `Activation denied: ${targetType} ${targetId}`, { targetId, targetType });
  }

  denyActivation(requestId: string) {
    this.activationRequests = this.activationRequests.map((request) =>
      request.id === requestId ? { ...request, state: "denied" as const } : request
    );
  }

  clearActivationRequest(requestId: string) {
    this.activationRequests = this.activationRequests.filter((request) => request.id !== requestId);
    this.addTimelineEvent("system", "info", "Activation request dismissed", `Request ${requestId} removed from local queue.`, "system");
  }

  addTimelineEvent(type: CortexTimelineEventType, severity: CortexTimelineSeverity, title: string, description: string, sourceType?: CortexTimelineEvent["sourceType"], sourceId?: string) {
    const event: CortexTimelineEvent = {
      id: crypto.randomUUID(),
      type,
      severity,
      title,
      description,
      timestamp: new Date().toISOString(),
      sourceId,
      sourceType,
      readonly: true,
      contained: true
    };
    this.timelineEvents = [event, ...this.timelineEvents].slice(0, 100);
  }

  clearTimeline() {
    this.timelineEvents = [];
  }

  receiveLiveLogLine(line: string) {
    this.liveLogBuffer.push(line);
    const joined = this.liveLogBuffer.join("\n");
    if (joined.length > this.LIVE_LOG_MAX_CHARS) {
      const trimmed = joined.slice(-this.LIVE_LOG_MAX_CHARS);
      this.liveLogBuffer = trimmed.split("\n");
    }
  }

  getLiveLogTail(): string {
    return this.liveLogBuffer.join("\n");
  }

  clearLiveLog() {
    this.liveLogBuffer = [];
  }

  clearSystemLogs() {
    this.timelineEvents = [];
    this.liveLogBuffer = [];
    this.executionHistory.clear();
    this.cachedContext = {
      ...this.cachedContext,
      buildLogTail: "",
      lastErrorType: ""
    };
    cortexEventBus.emit("system-logs-cleared", "System logs cleared successfully.", {});
  }

  clearAllRuntimeLogs() {
    this.activationRequests = [];
    this.timelineEvents = [];
    this.liveLogBuffer = [];
    this.executionHistory.clear();
    this.manualExecutionQueue.clearAll();
    this.cachedContext = {};
    cortexEventBus.emit("system-logs-cleared", "Fresh Start runtime logs cleared.", {});
  }

  createTestManualExecutionRequest() {
    const request = this.manualExecutionQueue.createManualRequest({
      providerId: "ollama-provider-adapter",
      prompt: "Summarize the current contained runtime readiness without executing providers.",
      purpose: "Local scaffold validation"
    });
    this.addTimelineEvent("activation", "locked", "Manual execution request created", "A local mock request was created and blocked by scaffold policy.", "system", request.id);
    this.addTimelineEvent("permission", "denied", "Permission check failed", request.blockedReason, "system", request.id);
    this.addTimelineEvent("containment", "locked", "Sandbox blocked execution", "Sandbox validation prevented provider execution.", "system", request.id);
    return request;
  }

  createSafeSummarizeExecutionRequest(context?: {
    projectName?: string;
    buildLogTail?: string;
    lastErrorType?: string;
    ollamaStatus?: string;
  }) {
    const resolvedContext = {
      ...this.cachedContext,
      ...context,
      buildLogTail: context?.buildLogTail
        || this.cachedContext.buildLogTail
        || this.getLiveLogTail()
        || "No build log available."
    };
    const capturedBuildLog = [
      `Project: ${resolvedContext.projectName ?? "No project selected"}`,
      `Last error type: ${resolvedContext.lastErrorType ?? "None detected"}`,
      `Ollama status: ${resolvedContext.ollamaStatus ?? "unknown"}`,
      "",
      "Build log tail:",
      resolvedContext.buildLogTail?.trim() || "No build log available."
    ].join("\n");
    const request = this.manualExecutionQueue.createManualRequest({
      providerId: "ollama-provider-adapter",
      prompt: [
        "Read-only local summarization only.",
        "Summarize the runtime status below in three sentences.",
        "Do not suggest any modifications or actions.",
        "",
        capturedBuildLog
      ].join("\n"),
      purpose: "Summarize runtime readiness status"
    });
    this.addTimelineEvent("activation", request.status === "blocked" ? "locked" : "monitoring", "Manual execution request created", "A safe local summarize request was created for operator review.", "system", request.id);
    if (request.status === "blocked") this.addTimelineEvent("containment", "locked", "Sandbox blocked execution", request.blockedReason, "system", request.id);
    return request;
  }

  async enableLocalOllamaManualSummaries() {
    try {
      if (window.kcxApi?.startOllama) {
        const result = await window.kcxApi.startOllama();
        this.addTimelineEvent(
          "provider",
          "monitoring",
          "Ollama runtime start requested",
          result.message,
          "provider",
          this.ollamaProviderAdapter.id
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch {
      this.addTimelineEvent(
        "provider",
        "warning",
        "Ollama start failed",
        "Could not start Ollama process.",
        "provider"
      );
    }
    this.ollamaProviderAdapter.enableManualLocalSummaries();
    this.providers = this.providers.map((p) =>
      p.id === "local-ollama-runtime"
        ? { ...p, state: "active" as const, runtimeAvailability: "online", available: true }
        : p
    );
    this.addTimelineEvent(
      "provider",
      "monitoring",
      "Local Ollama adapter enabled",
      "Manual localhost summarization adapter enabled.",
      "provider",
      this.ollamaProviderAdapter.id
    );
    this.savePersistedConfig({ ollamaEnabled: true });
    cortexEventBus.emit("cortex-status-changed", "ollama-ready", {
      ollamaEnabled: true,
      model: this.ollamaProviderAdapter.getModelName() ?? "phi3:latest"
    });
    this.connectKCxModeAIBridge();
  }

  disableLocalOllamaManualSummaries() {
    this.ollamaProviderAdapter.disableManualLocalSummaries();
    this.providers = this.providers.map((p) =>
      p.id === "local-ollama-runtime"
        ? { ...p, state: "dormant" as const, runtimeAvailability: "offline", available: false }
        : p
    );
    this.savePersistedConfig({ ollamaEnabled: false });
    this.addTimelineEvent("provider", "monitoring", "Local Ollama adapter disabled", "Manual localhost summarization adapter disabled.", "provider", this.ollamaProviderAdapter.id);
    cortexEventBus.emit("cortex-status-changed", "ollama-disabled", {
      ollamaEnabled: false
    });
  }

  private buildLoopRunning = false;

  onBuildAnalysisComplete(context: {
    projectName: string;
    buildLogTail: string;
    lastErrorType: string;
    isFailed: boolean;
  }) {
    this.cachedContext = {
      ...this.cachedContext,
      projectName: context.projectName,
      buildLogTail: context.buildLogTail,
      lastErrorType: context.lastErrorType
    };
    if (!context.isFailed) return;

    cortexEventBus.emit("build-failure-detected", `Build failure detected in ${context.projectName}`, {
      projectName: context.projectName,
      lastErrorType: context.lastErrorType
    });
    this.addTimelineEvent("diagnostics", "warning", "Build failure detected", `${context.lastErrorType || "Unknown error"} in ${context.projectName}.`, "system");

    if (!this.ollamaProviderAdapter.describeReadiness().enabled) return;
    if (this.buildLoopRunning) return;

    this.buildLoopRunning = true;
    const request = this.createSafeSummarizeExecutionRequest();
    if (request.status !== "pending-approval") {
      this.buildLoopRunning = false;
      return;
    }
    const approved = this.approveLatestManualExecutionRequest();
    if (approved?.status !== "approved") {
      this.buildLoopRunning = false;
      return;
    }
    this.executeLatestManualExecutionRequest().finally(() => {
      this.buildLoopRunning = false;
    });
  }

  connectKCxModeAIBridge() {
    this.kcxModeAIProviderAdapter.connect();
    this.bridges = this.bridges.map((bridge) =>
      bridge.id === "kcxmodeai"
        ? { ...bridge, state: "connected" as const, lastActivityAt: new Date().toISOString() }
        : bridge
    );
    this.addTimelineEvent("bridge", "monitoring", "KCxModeAI Runtime Bridge connected", "Codex handoff channel active — prompt delivery via copy/paste.", "bridge", "kcxmodeai");
    cortexEventBus.emit("bridge-state-changed", "KCxModeAI bridge connected", { bridgeId: "kcxmodeai" });
  }

  private tryKcxModeAIBrainFallback(prompt: string, spec: string, normalized: { taskType: string; riskLevel: string; diagnostics: { originalInput: string; sanitizedInput: string; replacementsApplied: string[]; classificationReason: string; rewriteReduced: boolean } }, projectName: string): boolean {
    this.recordProviderAttempt("kcxmodeai-brain");
    try {
      const brainResult = kcxModeAIBrainAdapter.generate(prompt);
      const output = [
        brainResult.title,
        brainResult.responseText,
        ...(brainResult.bullets?.length ? ["", ...brainResult.bullets.map((b) => `• ${b}`)] : []),
        ...(brainResult.suggestedActions?.length ? ["", "Suggested actions:", ...brainResult.suggestedActions.map((a) => `- ${a}`)] : [])
      ].join("\n").trim();

      cortexEventBus.emit("spec-intake-completed", `Spec intake completed (KCxModeAI Brain) for: ${projectName}`, {
        spec,
        output,
        projectName,
        taskType: normalized.taskType,
        riskLevel: normalized.riskLevel,
        source: "kcxmodeai-brain" as ProviderSource,
        fallbackUsed: true,
        label: "KCxModeAI Brain — local fallback",
        normTrace: {
          original: normalized.diagnostics.originalInput,
          sanitized: normalized.diagnostics.sanitizedInput,
          replacements: normalized.diagnostics.replacementsApplied,
          classificationReason: normalized.diagnostics.classificationReason,
          rewriteReduced: normalized.diagnostics.rewriteReduced,
        }
      });
      this.kcxBrainDiagnostics = {
        embeddedBrainAvailable: true,
        lastFallbackUsed: true,
        lastResponseSource: "kcxmodeai-brain",
        lastUsedAt: Date.now(),
        lastError: undefined,
      };
      this.recordProviderSuccess("kcxmodeai-brain");
      this.addTimelineEvent("activation", "info", "KCxModeAI Brain fallback used", "Ollama unavailable — KCxModeAI Brain local fallback produced output.", "provider");
      return true;
    } catch (err) {
      const message = (err instanceof Error ? err.message : "KCxModeAI Brain adapter failed.").slice(0, 300);
      this.kcxBrainDiagnostics = {
        ...this.kcxBrainDiagnostics,
        lastFallbackUsed: false,
        lastError: message,
      };
      this.recordProviderFailure("kcxmodeai-brain", message);
      this.addTimelineEvent("provider", "warning", "KCxModeAI Brain fallback failed", "KCxModeAI Brain adapter threw during fallback.", "provider");
      return false;
    }
  }

  getKcxModeAIBrainDiagnostics(): KCxModeAIBrainDiagnostics {
    return { ...this.kcxBrainDiagnostics };
  }

  getBuildLoopStatus() {
    const ollamaReadiness = this.ollamaProviderAdapter.describeReadiness();
    const kcxBridge = this.bridges.find((bridge) => bridge.id === "kcxmodeai");
    const queueSnapshot = this.manualExecutionQueue.getSnapshot();
    const lastResult = this.executionHistory.getResults()[0] ?? null;
    return {
      ollamaEnabled: ollamaReadiness.enabled,
      ollamaModel: this.ollamaProviderAdapter.getModelName(),
      kcxBridgeConnected: kcxBridge?.state === "connected",
      loopRunning: this.buildLoopRunning,
      pendingRequests: queueSnapshot.pendingCount,
      lastSummarizeResult: lastResult
        ? { status: lastResult.status, durationMs: lastResult.durationMs, error: lastResult.error }
        : null
    };
  }

  private specIntakeRunning = false;

  private async fetchSrcTree(projectPath: string): Promise<string> {
    try {
      const api = (window as any).kcxApi;
      if (typeof api?.getSrcTree === "function") {
        const tree = await api.getSrcTree(projectPath);
        if (typeof tree === "string" && tree.trim()) return tree;
      }
    } catch { /* non-fatal */ }
    return "";
  }

  async createSpecIntakeRequest(spec: string): Promise<void> {
    if (!spec.trim() || this.specIntakeRunning) return;
    this.specIntakeRunning = true;

    try {
      const ctx = this.cachedContext;
      const memoryHints = cortexMemory.getHints();
      const normalized = smartBrainNormalize(spec, ctx, memoryHints);
      cortexMemory.record({
        ts: Date.now(),
        taskType: normalized.taskType,
        riskLevel: normalized.riskLevel,
        files: normalized.filesToInspect,
        projectName: normalized.projectName,
        rewriteRisk: normalized.rewriteRisk,
      });
      console.debug(cortexMemory.getDiagnostics());

      // Offline fallback: Ollama unavailable — try KCxModeAI Brain, then rule-based
      if (!this.ollamaProviderAdapter.describeReadiness().enabled) {
        const projectName = ctx.projectName ?? "Unknown project";
        const brainUsed = this.tryKcxModeAIBrainFallback(normalized.structuredPrompt, spec, normalized, projectName);
        if (!brainUsed) {
          this.recordProviderAttempt("rule-based");
          this.recordProviderSuccess("rule-based");
          cortexEventBus.emit("spec-intake-completed", `Spec intake completed (offline) for: ${projectName}`, {
            spec,
            output: normalized.structuredPrompt,
            projectName,
            taskType: normalized.taskType,
            riskLevel: normalized.riskLevel,
            offline: true,
            normTrace: {
              original: normalized.diagnostics.originalInput,
              sanitized: normalized.diagnostics.sanitizedInput,
              replacements: normalized.diagnostics.replacementsApplied,
              classificationReason: normalized.diagnostics.classificationReason,
              rewriteReduced: normalized.diagnostics.rewriteReduced,
            }
          });
          this.addTimelineEvent("activation", "info", "Offline — rule-based prompt", "SmartBrain normalized spec without Ollama.", "system");
        }
        return;
      }

      const frameworkList = (ctx.frameworks ?? []).join(", ") || "unknown";
      const folderList = (ctx.majorSourceFolders ?? []).slice(0, 6).join(", ") || "unknown";
      const typeList = (ctx.detectedTypes ?? []).join(", ") || "unknown";
      const projectName = ctx.projectName ?? "Unknown project";
      const discoveredFiles = (ctx.filesFound ?? []).slice(0, 12);

      const srcTree = ctx.projectPath ? await this.fetchSrcTree(ctx.projectPath) : "";
      const srcTreeSection = srcTree
        ? ["", "Full src/ file tree (depth ≤ 4 — these are the REAL files, use exact paths):", "```", srcTree, "```"]
        : ["", "Known repo files discovered in this workspace:",
           discoveredFiles.length > 0 ? discoveredFiles.map((file) => `- ${file}`).join("\n") : "- No discovered files available yet."];

      const prompt = [
      "Read-only local summarization only.",
      "You are generating a Claude Code/Codex-style implementation prompt for the KCx Studio Companion repo.",
      "",
      "Grounding Rules:",
      "- Use ONLY file paths from the src/ tree provided below. Do not invent file paths, directories, components, or config changes.",
      "- Always reference actual file paths from the provided src tree. Never guess or fabricate a file name.",
      '- If the exact file is ambiguous, list the two most likely candidates from the tree and explain which one fits better.',
      '- If you cannot find a suitable file in the tree, say "inspect the repo and locate the existing component first."',
      "- Never suggest edits to dist/, README.md, package.json, vite.config.ts, tsconfig.json, or git commit/push unless the user explicitly requested them.",
      "- Match the project's existing patterns: if components use inline styles, use inline styles; if they use CSS classes, use CSS classes. Check the tree before deciding.",
      "- Keep changes surgical — one file at a time where possible.",
      "- Produce minimal patch instructions, one focused change at a time, with exact existing file references.",
      "- Include a verification step using npm.cmd run build and npm test.",
      "",
      "Do Not Include:",
      "- git commit, git push, or branch management commands",
      "- README/docs changes unless asked",
      "- package installs unless asked",
      "- invented file names, directories, or components not present in the src tree",
      "- CI/CD workflow steps",
      "- vague source-control review steps",
      "",
      `Project: ${projectName}`,
      `Frameworks: ${frameworkList}`,
      `Source types: ${typeList}`,
      `Top folders: ${folderList}`,
      ...srcTreeSection,
      "",
      `Feature request: ${normalized.structuredPrompt}`,
      "",
      "Generate a concise implementation prompt that:",
      "1. identifies the exact existing files to inspect before editing (by path from the tree above)",
      "2. specifies the surgical code change without inventing paths or components",
      "3. includes a verification command: npm.cmd run build && npm test",
      "4. stops and asks if the required file is not found in the tree"
      ].join("\n");

      const request = this.manualExecutionQueue.createManualRequest({
        providerId: "ollama-provider-adapter",
        prompt,
        purpose: "Summarize feature specification into structured implementation guidance",
        // Only the operator's own words are subject to summarize-safe token
        // scanning. The rest of `prompt` is trusted application-generated
        // context (fixed template, src tree, filenames, project summary) and
        // must not be scanned — real paths such as `background.css` are not
        // dangerous intent.
        userContent: spec
      });

      this.addTimelineEvent("activation", request.status === "blocked" ? "locked" : "monitoring",
        "Spec intake request created", `Spec: ${spec.slice(0, 80)}${spec.length > 80 ? "…" : ""}`, "system", request.id);

      if (request.status !== "pending-approval") {
        this.recordProviderAttempt("blocked");
        this.recordProviderFailure("blocked", request.blockedReason ?? "Sandbox blocked request.");
        this.addTimelineEvent("containment", "locked", "Spec intake blocked", request.blockedReason, "system", request.id);
        return;
      }

      const approved = this.approveLatestManualExecutionRequest();
      if (approved?.status !== "approved") {
        const reason = approved?.blockedReason?.trim() || "Approval denied.";
        this.recordProviderAttempt("blocked");
        this.recordProviderFailure("blocked", reason);
        // Timeline entry is preserved for auditability…
        this.addTimelineEvent("permission", "denied", "Spec intake approval failed", reason, "system", approved?.id);
        // …but approval failure must not end the run silently. Route to the
        // embedded KCxModeAI Brain fallback so the operator still receives an
        // implementation prompt in the Approval Queue.
        this.emitSpecIntakeStatus("warning", `Spec intake approval failed — falling back to KCxModeAI Brain. ${reason}`);
        this.runSpecIntakeFallback(normalized, spec, projectName, "Approval failed — KCxModeAI Brain unavailable.");
        return;
      }

      this.recordProviderAttempt("ollama");
      const result = await this.executeLatestManualExecutionRequest();

      if (result?.status === "completed" && result.output?.trim()) {
        this.recordProviderSuccess("ollama");
        cortexEventBus.emit("spec-intake-completed", `Spec intake completed for: ${projectName}`, {
          spec,
          output: result.output.trim(),
          projectName,
          taskType: normalized.taskType,
          riskLevel: normalized.riskLevel,
          normTrace: {
            original: normalized.diagnostics.originalInput,
            sanitized: normalized.diagnostics.sanitizedInput,
            replacements: normalized.diagnostics.replacementsApplied,
            classificationReason: normalized.diagnostics.classificationReason,
            rewriteReduced: normalized.diagnostics.rewriteReduced,
          }
        });
        this.addTimelineEvent("activation", "info", "Spec intake completed", "Implementation prompt queued in Approval Queue.", "system", result.requestId);
      } else {
        const reason = result?.error ?? "Ollama did not return output.";
        this.recordProviderFailure("ollama", reason);
        this.addTimelineEvent("provider", "warning", "Spec intake — Ollama failed, trying KCxModeAI Brain",
          reason, "provider", result?.providerId);
        this.runSpecIntakeFallback(normalized, spec, projectName, "KCxModeAI Brain and Ollama both unavailable.");
      }
    } finally {
      this.specIntakeRunning = false;
    }
  }

  /**
   * Shared terminal fallback chain for Spec Intake: embedded KCxModeAI Brain
   * first, then the rule-based normalized prompt. Both paths emit
   * `spec-intake-completed`, so output always reaches the Approval Queue.
   */
  private runSpecIntakeFallback(
    normalized: ReturnType<typeof smartBrainNormalize>,
    spec: string,
    projectName: string,
    ruleBasedDetail: string
  ): void {
    const brainUsed = this.tryKcxModeAIBrainFallback(normalized.structuredPrompt, spec, normalized, projectName);
    if (brainUsed) return;

    this.recordProviderAttempt("rule-based");
    this.recordProviderSuccess("rule-based");
    cortexEventBus.emit("spec-intake-completed", `Spec intake completed (offline) for: ${projectName}`, {
      spec,
      output: normalized.structuredPrompt,
      projectName,
      taskType: normalized.taskType,
      riskLevel: normalized.riskLevel,
      offline: true,
      normTrace: {
        original: normalized.diagnostics.originalInput,
        sanitized: normalized.diagnostics.sanitizedInput,
        replacements: normalized.diagnostics.replacementsApplied,
        classificationReason: normalized.diagnostics.classificationReason,
        rewriteReduced: normalized.diagnostics.rewriteReduced,
      }
    });
    this.addTimelineEvent("activation", "info", "Offline — rule-based prompt (final fallback)", ruleBasedDetail, "system");
    this.emitSpecIntakeStatus("warning", `KCxModeAI Brain fallback unavailable — rule-based prompt used instead. ${ruleBasedDetail}`);
  }

  /**
   * Surfaces a user-facing Spec Intake status so approval or fallback failures
   * are visible in the UI rather than only in the event timeline.
   */
  private emitSpecIntakeStatus(level: "info" | "warning" | "error", message: string): void {
    cortexEventBus.emit("spec-intake-status", message, { level, message });
  }

  approveLatestManualExecutionRequest() {
    const latestRequest = this.manualExecutionQueue.getLatestRequest();
    if (!latestRequest) return null;
    console.warn("[CortexRuntime] approveLatestManualExecutionRequest", {
      requestId: latestRequest.id,
      providerId: latestRequest.providerId,
      purpose: latestRequest.purpose,
      status: latestRequest.status,
      blockedReason: latestRequest.blockedReason
    });
    const adapter = this.providerAdapters.find((entry) => entry.id === latestRequest.providerId);
    const request = this.manualExecutionQueue.approveManualRequest(latestRequest.id, adapter?.describeReadiness());
    if (request?.status === "approved") {
      this.addTimelineEvent("activation", "monitoring", "Manual request approved", "Operator approved one local read-only summarize request.", "system", request.id);
    } else if (request) {
      this.addTimelineEvent("permission", "denied", "Permission check failed", request.blockedReason, "system", request.id);
    }
    return request;
  }

  async executeLatestManualExecutionRequest() {
    const snapshot = this.manualExecutionQueue.getSnapshot();
    const approvedRequest = snapshot.requests.find(
      (r) => r.status === "approved"
    );
    if (!approvedRequest) {
      this.addTimelineEvent("activation", "warning",
        "No approved request found",
        "Execute called but no approved request exists.",
        "system"
      );
      return null;
    }
    this.addTimelineEvent("activation", "monitoring",
      "Manual execution started",
      "Operator started a manual local read-only summarize request.",
      "system", approvedRequest.id
    );
    const result = await this.executionEngine.executeManualRequest(
      approvedRequest.id
    );
    if (result.status === "completed") {
      this.addTimelineEvent("activation", "info",
        "Manual execution completed",
        "Local read-only summarize request completed.",
        "system", result.requestId
      );
      cortexEventBus.emit("cortex-execution-completed", result.output ?? "", {
        output: result.output ?? "",
        providerId: result.providerId ?? "",
        requestId: result.requestId ?? ""
      });
    } else if (result.status === "failed") {
      this.addTimelineEvent("provider", "warning",
        "Local provider execution failed",
        result.error ?? "Local provider execution failed.",
        "provider", result.providerId
      );
    } else {
      this.addTimelineEvent("containment", "locked",
        "Sandbox blocked execution",
        result.error ?? "Execution blocked by sandbox or permissions.",
        "system", result.requestId
      );
    }
    return result;
  }

  denyLatestManualExecutionRequest() {
    const latestRequest = this.manualExecutionQueue.getSnapshot().requests[0];
    if (!latestRequest) return null;
    const request = this.manualExecutionQueue.denyManualRequest(latestRequest.id);
    if (request) {
      this.addTimelineEvent("activation", "denied", "Manual execution request denied", "Local mock execution request was denied by operator action.", "system", request.id);
    }
    return request;
  }

  clearManualExecutionQueue() {
    this.manualExecutionQueue.clearAll();
    this.addTimelineEvent("system", "info", "Manual execution queue cleared", "Local mock manual execution requests were cleared.", "system");
  }

  clearExecutionResults() {
    this.executionHistory.clear();
    this.addTimelineEvent("system", "info", "Execution result cleared", "Local session-only execution results were cleared.", "system");
  }

  getTimelineEvents() {
    return this.timelineEvents;
  }

  getEcosystemStatus() {
    return {
      providerCount: this.providers.length,
      bridgeCount: this.bridges.length,
      state: this.state,
      contained: this.state !== "active"
    };
  }
}

export const cortexRuntime = new CortexRuntime();
