import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ValhallaHeader } from "./components/ValhallaHeader";
import { ValhallaSidebar, ValhallaSidebarSection } from "./components/ValhallaSidebar";
import { ForgeCanvas, ForgeRegionMeta, ForgeSystemMeta, systems, regions, ValhallaFocusMode } from "./components/ForgeCanvas";
import { SystemInspector } from "./components/SystemInspector";
import { cortexRuntime } from "../cortex/CortexRuntime";
import { cortexEventBus } from "../cortex/CortexEventBus";
import "./styles/valhalla.css";

type ValhallaPageProps = {
  onExit?: () => void;
  onNavigateToCompanionSection?: (sectionId: string) => void;
};

type InspectorActionOutcome = {
  title: string;
  message: string;
  companionSectionId?: string | null;
};
type RouteOutcome = { companionSectionId?: string; message?: string };
type CortexSectionProps = {
  title: string;
  defaultOpen?: boolean;
  open?: boolean;
  badge?: string | number;
  onToggle?: (open: boolean) => void;
  children: React.ReactNode;
};

function CortexSection({ title, defaultOpen = false, open, badge, onToggle, children }: CortexSectionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = open ?? internalOpen;
  return (
    <section className="cortex-section">
      <header className="cortex-section-header">
        <button
          type="button"
          className="cortex-section-toggle"
          onClick={() => {
            const next = !isOpen;
            if (open === undefined) setInternalOpen(next);
            onToggle?.(next);
          }}
          aria-expanded={isOpen}
        >
          <span>{title}</span>
          <span className="cortex-section-toggle-meta">
            {badge !== undefined && <span className="cortex-chip">{badge}</span>}
            <span className="cortex-chip">{isOpen ? "collapse" : "expand"}</span>
          </span>
        </button>
      </header>
      {isOpen && <div className="cortex-section-body">{children}</div>}
    </section>
  );
}
const getSystemsForRegion = (regionId: string) => {
  const region = regions.find((entry) => entry.id === regionId)?.name;
  return region ? systems.filter((system) => system.region === region) : [];
};
const getParentRegionForSystem = (systemId: string) => {
  const system = systems.find((entry) => entry.id === systemId);
  return system ? regions.find((region) => region.name === system.region) ?? null : null;
};
const getCompanionRouteForSelection = (selection: ForgeSystemMeta | ForgeRegionMeta | null, action: string): RouteOutcome => {
  if (!selection) return {};
  const name = selection.name;
  const bridgeMessage = "external app bridge not connected yet.";
  const runtimeRouteNames = new Set(["KCx Studio Companion runtime", "Runtime Nexus"]);

  if (runtimeRouteNames.has(name)) return { companionSectionId: "Telemetry" };
  if (name === "KCx Studio Companion") return { companionSectionId: "Dashboard" };
  if (name === "Valhalla Systems") return { companionSectionId: "Project Context" };
  if (name === "Memory Vault") return { companionSectionId: "Project Memory" };
  if (name === "AI Systems" || name === "Local AI" || name === "Cloud AI") return { companionSectionId: "AI Providers" };
  if (name === "Device Grid") return { companionSectionId: "Settings" };
  if (name === "GodzillaMode AI") return { companionSectionId: "AI Providers" };
  if (name === "KCx Mode" || name === "KCx Messenger" || name === "Robot Buddy") return { message: bridgeMessage };
  if (name === "KCx Cortex" || name === "Cortex Core") return { message: "Cortex is planned / not implemented." };

  if (action === "Open Runtime Layer") {
    if ("region" in selection && selection.region === "Runtime Nexus") return { companionSectionId: "Telemetry" };
    if ("region" in selection && selection.region === "AI Systems") return { companionSectionId: "AI Providers" };
    if ("id" in selection && selection.id === "runtime") return { companionSectionId: "Telemetry" };
    if ("id" in selection && selection.id === "ai") return { companionSectionId: "AI Providers" };
  }
  return {};
};

export function ValhallaPage({ onExit, onNavigateToCompanionSection }: ValhallaPageProps) {
  type CortexNavSectionId = "overview" | "runtime" | "diagnostics" | "providers" | "bridges" | "activation" | "execution" | "timeline" | "security" | "future";
  type CortexPanelId = "operationalSummary" | "runtimeViewer" | "cortexDiagnostics" | "registeredProviders" | "registeredBridges" | "bridgeReadiness" | "providerReadiness" | "activationGate" | "localExecution" | "executionResults" | "eventTimeline" | "permissionLayer" | "nextActivationSteps" | "specIntake";
  type CortexCommandAction = "clear-timeline" | "create-manual-request" | "create-safe-summarize-request" | "clear-manual-queue" | "clear-execution-results" | "approve-pending-request" | "open-execution-results";
  type CortexCommand = { label: string; target: CortexNavSectionId | null; action?: CortexCommandAction };
  const [selectedSystem, setSelectedSystem] = useState<ForgeSystemMeta | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<ForgeRegionMeta | null>(null);
  const [operationalOverlay, setOperationalOverlay] = useState(false);
  const [focusMode, setFocusMode] = useState<ValhallaFocusMode>("infrastructure");
  const [activeSection, setActiveSection] = useState<ValhallaSidebarSection | null>("forge");
  const [devLogs, setDevLogs] = useState<Array<{ id: string; timestamp: string; message: string }>>([]);
  const [actionResult, setActionResult] = useState<{ title: string; message: string } | null>(null);
  const [activeChamberId, setActiveChamberId] = useState<string | null>(null);
  const [isChamberOpen, setIsChamberOpen] = useState(false);
  const [cortexChamberOpen, setCortexChamberOpen] = useState(false);
  const [chamberResult, setChamberResult] = useState<string | null>(null);
  const [ollamaLive, setOllamaLive] = useState(false);
  const [forgeSystemState, setForgeSystemState] = useState<"idle" | "processing" | "warning" | "error">("idle");
  const [cortexSnapshot, setCortexSnapshot] = useState(() => cortexRuntime.getSnapshot());
  const [specInput, setSpecInput] = useState("");
  const [specLoading, setSpecLoading] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<"all" | "runtime" | "provider" | "bridge" | "activation" | "diagnostics" | "security">("all");
  const [activeNavSection, setActiveNavSection] = useState<CortexNavSectionId>("overview");
  const [focusedSection, setFocusedSection] = useState<CortexNavSectionId>("overview");
  const [diagnosticSubview, setDiagnosticSubview] = useState<"overview" | "runtime" | "providers" | "bridges" | "permissions">("overview");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<CortexPanelId, boolean>>({
    operationalSummary: false,
    runtimeViewer: false,
    cortexDiagnostics: false,
    registeredProviders: false,
    registeredBridges: false,
    bridgeReadiness: false,
    providerReadiness: false,
    activationGate: false,
    localExecution: false,
    executionResults: false,
    eventTimeline: false,
    permissionLayer: false,
    nextActivationSteps: false,
    specIntake: true
  });
  const runtimeViewerLogRef = useRef(false);
  const providersViewedLogRef = useRef(false);
  const bridgesViewedLogRef = useRef(false);
  const diagnosticsViewedLogRef = useRef(false);
  const bridgeMatrixViewedLogRef = useRef(false);
  const providerMatrixViewedLogRef = useRef(false);
  const activationGateViewedLogRef = useRef(false);
  const timelineViewedLogRef = useRef(false);
  const localExecutionViewedLogRef = useRef(false);
  const operationalSummaryViewedLogRef = useRef(false);
  const navigationRailViewedLogRef = useRef(false);
  const workspaceLayoutViewedLogRef = useRef(false);
  const navAnchorRefs = useRef<Record<CortexNavSectionId, HTMLDivElement | null>>({
    overview: null,
    runtime: null,
    diagnostics: null,
    providers: null,
    bridges: null,
    activation: null,
    execution: null,
    timeline: null,
    security: null,
    future: null
  });
  const navItems: Array<{ id: CortexNavSectionId; label: string }> = useMemo(() => ([
    { id: "overview", label: "Overview" },
    { id: "runtime", label: "Runtime" },
    { id: "diagnostics", label: "Diagnostics" },
    { id: "providers", label: "Providers" },
    { id: "bridges", label: "Bridges" },
    { id: "activation", label: "Activation Gate" },
    { id: "execution", label: "Local Execution" },
    { id: "timeline", label: "Timeline" },
    { id: "security", label: "Security" },
    { id: "future", label: "Future Pathways" }
  ]), []);
  const sectionLabels: Record<CortexNavSectionId, string> = useMemo(() => ({
    overview: "Overview",
    runtime: "Runtime",
    diagnostics: "Diagnostics",
    providers: "Providers",
    bridges: "Bridges",
    activation: "Activation Gate",
    execution: "Local Execution",
    timeline: "Timeline",
    security: "Security",
    future: "Future Pathways"
  }), []);
  const sectionNotes: Record<CortexNavSectionId, string> = useMemo(() => ({
    overview: "High-level posture and chamber orientation.",
    runtime: "Operational summary and read-only runtime state.",
    diagnostics: "Runtime health, containment, permissions, and readiness signals.",
    providers: "Provider registration and dormant provider readiness.",
    bridges: "Bridge registration, readiness, and activation constraints.",
    activation: "Mock operator approval flow with blocked activation requests.",
    execution: "Manual-only local execution scaffold with fail-closed sandbox boundaries.",
    timeline: "Local read-only event history for the contained shell.",
    security: "Permission posture and containment lock state.",
    future: "Roadmap-style bridge and activation responsibilities."
  }), []);
  const cortexPanelLabels: Record<CortexPanelId, string> = useMemo(() => ({
    operationalSummary: "Operational Summary",
    runtimeViewer: "Runtime Viewer",
    cortexDiagnostics: "Cortex Diagnostics",
    registeredProviders: "Registered Providers",
    registeredBridges: "Registered Bridges",
    bridgeReadiness: "Bridge Readiness Matrix",
    providerReadiness: "Provider Readiness Matrix",
    activationGate: "Activation Gate",
    localExecution: "Local Execution Readiness",
    executionResults: "Execution Results",
    eventTimeline: "Cortex Event Timeline",
    permissionLayer: "Permission Layer",
    nextActivationSteps: "Next Activation Steps"
  }), []);
  const navExpansionTargets: Record<CortexNavSectionId, CortexPanelId[]> = useMemo(() => ({
    overview: [],
    runtime: ["operationalSummary"],
    diagnostics: ["cortexDiagnostics"],
    providers: ["registeredProviders"],
    bridges: ["registeredBridges"],
    activation: ["activationGate"],
    execution: ["localExecution"],
    timeline: ["eventTimeline"],
    security: ["permissionLayer"],
    future: ["nextActivationSteps"]
  }), []);
  const cortexStatus = useMemo(() => ({
    state: cortexSnapshot.state,
    activation: cortexSnapshot.localExecution.activeExecution
      ? "Active"
      : "Dormant",
    intelligence: cortexSnapshot.diagnostics.providerAvailability > 0
      ? "Active"
      : "Offline",
    routing: cortexSnapshot.operationalSummary.runtimePosture,
    permissions: "Read-only shell",
    risk: cortexSnapshot.contained ? "Contained" : "Elevated",
    nextStage: cortexSnapshot.diagnostics.warnings[0]
      ?? "Runtime bridge not connected"
  }), [cortexSnapshot]);
  const isAwake = useMemo(() => true, []);
  const bridgesByCategory = useMemo(() => {
    const grouped = new Map<string, typeof cortexSnapshot.bridges>();
    cortexSnapshot.bridges.forEach((bridge) => {
      const key = bridge.bridgeCategory ?? "runtime";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)?.push(bridge);
    });
    return grouped;
  }, [cortexSnapshot.bridges]);
  const providersByCategory = useMemo(() => {
    const grouped = new Map<string, typeof cortexSnapshot.providers>();
    cortexSnapshot.providers.forEach((provider) => {
      const key = provider.providerCategory ?? "analysis";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)?.push(provider);
    });
    return grouped;
  }, [cortexSnapshot.providers]);
  const appendDevLog = useCallback((message: string) => {
    const entry = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), message };
    setDevLogs((prev) => [entry, ...prev].slice(0, 50));
  }, []);
  const specRequestRef = useRef(0);
  useEffect(() => {
    return () => {
      specRequestRef.current += 1;
    };
  }, []);
  const requestActivation = useCallback((targetId: string, targetType: "provider" | "bridge", reason: string) => {
    cortexRuntime.requestActivation(targetId, targetType, reason);
    setCortexSnapshot(cortexRuntime.getSnapshot());
    appendDevLog(`Activation requested: ${targetType} ${targetId}`);
    appendDevLog(`Activation denied: ${targetType} ${targetId}`);
  }, [appendDevLog]);
  const dismissActivationRequest = useCallback((requestId: string) => {
    cortexRuntime.clearActivationRequest(requestId);
    setCortexSnapshot(cortexRuntime.getSnapshot());
    appendDevLog("Activation request dismissed");
  }, [appendDevLog]);
  const createTestManualRequest = useCallback(() => {
    cortexRuntime.createTestManualExecutionRequest();
    setCortexSnapshot(cortexRuntime.getSnapshot());
    appendDevLog("Manual request created");
    appendDevLog("Sandbox check blocked request");
  }, [appendDevLog]);
  const createSafeSummarizeRequest = useCallback(() => {
    cortexRuntime.createSafeSummarizeExecutionRequest();
    setCortexSnapshot(cortexRuntime.getSnapshot());
    appendDevLog("Manual request created");
  }, [appendDevLog]);
  const enableLocalOllama = useCallback(async () => {
    await cortexRuntime.enableLocalOllamaManualSummaries();
    setCortexSnapshot(cortexRuntime.getSnapshot());
    appendDevLog("Local Ollama manual summaries enabled");
  }, [appendDevLog]);
  const runSpecIntake = useCallback(async () => {
    if (!specInput.trim() || specLoading) return;
    const requestId = specRequestRef.current + 1;
    specRequestRef.current = requestId;
    setSpecLoading(true);
    appendDevLog("Spec intake: sending to Ollama…");
    try {
      await cortexRuntime.createSpecIntakeRequest(specInput.trim());
      if (specRequestRef.current === requestId) {
        setCortexSnapshot(cortexRuntime.getSnapshot());
        appendDevLog("Spec intake: done — check Approval Queue");
      }
    } catch (error) {
      if (specRequestRef.current === requestId) {
        appendDevLog(`Spec intake: failed — ${error instanceof Error ? error.message : "unknown error"}`);
      }
      throw error;
    } finally {
      if (specRequestRef.current === requestId) {
        setSpecLoading(false);
        setCortexSnapshot(cortexRuntime.getSnapshot());
      }
    }
  }, [specInput, specLoading, appendDevLog]);
  const approveManualRequest = useCallback(() => {
    const request = cortexRuntime.approveLatestManualExecutionRequest();
    setCortexSnapshot(cortexRuntime.getSnapshot());
    appendDevLog(request?.status === "approved" ? "Execution approved" : "Sandbox rejection");
  }, [appendDevLog]);
  const executeManualRequest = useCallback(async () => {
    appendDevLog("Execution started");
    const result = await cortexRuntime.executeLatestManualExecutionRequest();
    setCortexSnapshot(cortexRuntime.getSnapshot());
    if (result?.status === "completed") appendDevLog("Execution completed");
    else if (result?.status === "failed") appendDevLog("Local provider execution failed");
    else appendDevLog("Sandbox rejection");
  }, [appendDevLog]);
  const denyTestManualRequest = useCallback(() => {
    const request = cortexRuntime.denyLatestManualExecutionRequest();
    setCortexSnapshot(cortexRuntime.getSnapshot());
    appendDevLog(request ? "Execution denied" : "Manual request denied: no request available");
  }, [appendDevLog]);
  const clearManualQueue = useCallback(() => {
    cortexRuntime.clearManualExecutionQueue();
    setCortexSnapshot(cortexRuntime.getSnapshot());
    appendDevLog("Manual queue cleared");
  }, [appendDevLog]);
  const clearExecutionResults = useCallback(() => {
    cortexRuntime.clearExecutionResults();
    setCortexSnapshot(cortexRuntime.getSnapshot());
    appendDevLog("Execution results cleared");
  }, [appendDevLog]);
  const copyExecutionResult = useCallback((output?: string) => {
    if (!output) return;
    void navigator.clipboard?.writeText(output);
  }, []);
  const filteredTimelineEvents = useMemo(() => cortexSnapshot.timelineEvents.filter((event) => {
    if (timelineFilter === "all") return true;
    if (timelineFilter === "security") return event.type === "containment" || event.type === "permission";
    return event.type === timelineFilter;
  }), [cortexSnapshot.timelineEvents, timelineFilter]);
  const dockSection = focusedSection || activeNavSection;
  const dockRelatedLinks = useMemo(() => {
    if (dockSection === "providers") return ["diagnostics", "activation", "timeline"] as CortexNavSectionId[];
    if (dockSection === "bridges") return ["diagnostics", "security", "activation"] as CortexNavSectionId[];
    if (dockSection === "activation") return ["providers", "bridges", "execution"] as CortexNavSectionId[];
    if (dockSection === "execution") return ["activation", "security", "timeline"] as CortexNavSectionId[];
    if (dockSection === "diagnostics") return ["runtime", "providers", "bridges"] as CortexNavSectionId[];
    return ["overview", "runtime", "security"] as CortexNavSectionId[];
  }, [dockSection]);
  const commandPaletteCommands: CortexCommand[] = useMemo(() => ([
    { label: "Go to Overview", target: "overview" as CortexNavSectionId },
    { label: "Go to Diagnostics", target: "diagnostics" as CortexNavSectionId },
    { label: "Go to Providers", target: "providers" as CortexNavSectionId },
    { label: "Go to Bridges", target: "bridges" as CortexNavSectionId },
    { label: "Go to Activation Gate", target: "activation" as CortexNavSectionId },
    { label: "Go to Local Execution Readiness", target: "execution" as CortexNavSectionId },
    { label: "Go to Timeline", target: "timeline" as CortexNavSectionId },
    { label: "View Permission Layer", target: "security" as CortexNavSectionId },
    { label: "Create Test Manual Request", target: "execution" as CortexNavSectionId, action: "create-manual-request" },
    { label: "Create Safe Summarize Request", target: "execution" as CortexNavSectionId, action: "create-safe-summarize-request" },
    { label: "Open Execution Results", target: "execution" as CortexNavSectionId, action: "open-execution-results" },
    { label: "Clear Execution Results", target: "execution" as CortexNavSectionId, action: "clear-execution-results" },
    { label: "Approve Pending Request", target: "execution" as CortexNavSectionId, action: "approve-pending-request" },
    { label: "Clear Manual Queue", target: "execution" as CortexNavSectionId, action: "clear-manual-queue" },
    { label: "Clear Timeline", target: null, action: "clear-timeline" }
  ]), []);
  const visibleCommandPaletteCommands = useMemo(() => {
    const query = commandQuery.trim().toLowerCase();
    if (!query) return commandPaletteCommands;
    return commandPaletteCommands.filter((command) => command.label.toLowerCase().includes(query));
  }, [commandPaletteCommands, commandQuery]);
  const clearDevLogs = useCallback(() => setDevLogs([]), []);
  const setCortexPanelOpen = useCallback((id: CortexPanelId, open: boolean) => {
    setExpandedSections((current) => ({ ...current, [id]: open }));
  }, []);
  const expandPanelsForNav = useCallback((id: CortexNavSectionId) => {
    const targets = navExpansionTargets[id] ?? [];
    if (targets.length === 0) return;
    setExpandedSections((current) => {
      const next = { ...current };
      targets.forEach((target) => {
        next[target] = true;
      });
      return next;
    });
    appendDevLog(`Navigation expanded section: ${targets.map((target) => cortexPanelLabels[target]).join(", ")}`);
  }, [appendDevLog, cortexPanelLabels, navExpansionTargets]);
  const toggleContextDock = useCallback(() => {
    setDockCollapsed((current) => {
      const next = !current;
      appendDevLog(next ? "Context dock hidden" : "Context dock shown");
      return next;
    });
  }, [appendDevLog]);
  const focusCortexSection = useCallback((id: CortexNavSectionId, source: string) => {
    navAnchorRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveNavSection(id);
    setFocusedSection(id);
    expandPanelsForNav(id);
    appendDevLog(`Section focus changed: ${id}`);
    appendDevLog(`Dock context changed: ${id}`);
    if (source) appendDevLog(source);
  }, [appendDevLog, expandPanelsForNav]);
  const navigateToCortexSection = useCallback((id: CortexNavSectionId) => {
    focusCortexSection(id, `Navigation section selected: ${id}`);
  }, [focusCortexSection]);
  const getAnchorClass = useCallback((id: CortexNavSectionId) =>
    `cortex-section-anchor cortex-layout-zone ${focusedSection === id ? "cortex-section-focused cortex-focus-pulse" : ""}`,
  [focusedSection]);
  const runCommandPaletteCommand = useCallback((command: CortexCommand) => {
    appendDevLog(`Command selected: ${command.label}`);
    if (command.target) {
      focusCortexSection(command.target, "");
    }
    if (command.action === "create-manual-request") {
      createTestManualRequest();
    } else if (command.action === "create-safe-summarize-request") {
      createSafeSummarizeRequest();
    } else if (command.action === "approve-pending-request") {
      approveManualRequest();
    } else if (command.action === "open-execution-results") {
      setCortexPanelOpen("executionResults", true);
      appendDevLog("Navigation expanded section: Execution Results");
    } else if (command.action === "clear-execution-results") {
      clearExecutionResults();
    } else if (command.action === "clear-manual-queue") {
      clearManualQueue();
    } else if (command.action === "clear-timeline") {
      cortexRuntime.clearTimeline();
      cortexRuntime.addTimelineEvent("system", "info", "Timeline cleared", "Local in-memory timeline was cleared.", "system");
      setCortexSnapshot(cortexRuntime.getSnapshot());
      appendDevLog("Timeline cleared");
    }
    setCommandPaletteOpen(false);
    setCommandQuery("");
  }, [appendDevLog, approveManualRequest, clearExecutionResults, clearManualQueue, createSafeSummarizeRequest, createTestManualRequest, focusCortexSection, setCortexPanelOpen]);
  useEffect(() => {
    cortexRuntime.initialize();
    setCortexSnapshot(cortexRuntime.getSnapshot());
    appendDevLog("Cortex runtime initialized");
    const unsubscribe = cortexEventBus.subscribe((event) => {
      setCortexSnapshot(cortexRuntime.getSnapshot());
      if (event.type === "system-logs-cleared") {
        clearDevLogs();
        setForgeSystemState("idle");
        runtimeViewerLogRef.current = false;
        providersViewedLogRef.current = false;
        bridgesViewedLogRef.current = false;
        diagnosticsViewedLogRef.current = false;
        bridgeMatrixViewedLogRef.current = false;
        providerMatrixViewedLogRef.current = false;
        activationGateViewedLogRef.current = false;
        timelineViewedLogRef.current = false;
        localExecutionViewedLogRef.current = false;
        operationalSummaryViewedLogRef.current = false;
        navigationRailViewedLogRef.current = false;
        workspaceLayoutViewedLogRef.current = false;
        return;
      }
      if (event.type === "provider-registered") appendDevLog("Provider registered");
      if (event.type === "bridge-state-changed" && event.message.includes("activated")) appendDevLog("Bridge activated");
      if (event.type === "permission-updated" && event.message.includes("denied")) appendDevLog("Permission denied");
      if (event.type === "cortex-status-changed") {
        setOllamaLive(Boolean(event.payload?.ollamaEnabled));
        appendDevLog(event.payload?.ollamaEnabled ? "Cortex: Ollama live" : "Cortex: Ollama offline");
      }
      if (event.type === "system-state-changed") {
        const nextSystemState = event.payload?.systemState;
        if (nextSystemState === "idle" || nextSystemState === "processing" || nextSystemState === "warning" || nextSystemState === "error") {
          setForgeSystemState(nextSystemState);
        }
      }
    });
    return unsubscribe;
  }, [appendDevLog, clearDevLogs]);
  const mapRegionToSection = useCallback((region: ForgeRegionMeta | null): ValhallaSidebarSection | null => {
    if (!region) return null;
    switch (region.id) {
      case "creation":
        return "forge";
      case "runtime":
        return "runtime";
      case "memory":
        return "memory";
      case "ai":
        return "ai";
      case "device":
        return "devices";
      default:
        return null;
    }
  }, []);
  const mapSystemToSection = useCallback((system: ForgeSystemMeta | null): ValhallaSidebarSection | null => {
    if (!system) return null;
    if (system.id === "companion" || system.id === "valhalla") return "systems";
    if (system.region === "Runtime Nexus") return "runtime";
    if (system.region === "AI Systems") return "ai";
    if (system.region === "Device Grid") return "devices";
    return "forge";
  }, []);
  const logSystemSelection = useCallback((system: ForgeSystemMeta | null) => {
    setSelectedSystem(system);
    if (system) setSelectedRegion(null);
    const isCortex = system?.id === "cortex";
    setCortexChamberOpen(Boolean(isCortex));
    setActiveSection(mapSystemToSection(system));
    if (isCortex) appendDevLog("Cortex chamber opened");
    appendDevLog(system ? `Node selected: ${system.name} (${system.region})` : "Node focus cleared");
  }, [appendDevLog, mapSystemToSection]);
  const logRegionSelection = useCallback((region: ForgeRegionMeta | null) => {
    setSelectedRegion(region);
    if (region) setSelectedSystem(null);
    setActiveSection(mapRegionToSection(region));
    appendDevLog(region ? `Region selected: ${region.name}` : "Region focus cleared");
  }, [appendDevLog, mapRegionToSection]);
  const logFocusMode = useCallback((mode: ValhallaFocusMode) => {
    setFocusMode(mode);
    appendDevLog(`Focus mode set: ${mode}`);
  }, [appendDevLog]);
  const logOperationalOverlay = useCallback((enabled: boolean) => {
    setOperationalOverlay(enabled);
    appendDevLog(`Operational view ${enabled ? "enabled" : "disabled"}`);
  }, [appendDevLog]);
  const buildInspectorActionResult = useCallback((action: string, system: ForgeSystemMeta | null, region: ForgeRegionMeta | null): InspectorActionOutcome => {
    const selectedLabel = system?.name ?? region?.name ?? "No focus selected";

    switch (action) {
      case "Open System":
        {
          const route = getCompanionRouteForSelection(system ?? region, action);
          if (route.companionSectionId) return { title: action, message: `Route prepared. Switching to ${route.companionSectionId}.`, companionSectionId: route.companionSectionId };
          if (route.message) return { title: action, message: route.message };
        }
        return { title: action, message: "Select a system or region before opening a route." };
      case "Inspect Structure":
        if (system) {
          return { title: action, message: `${system.name} architecture: ${system.classification}. ${system.notes}` };
        }
        if (region) {
          return { title: action, message: `${region.name} role: ${region.role}. ${region.summary}` };
        }
        return { title: action, message: "Select a focus point to inspect structure." };
      case "View Connections":
        if (system) {
          return { title: action, message: `${system.name} relationships: linked to ${system.region}. Connection map prepared locally.` };
        }
        if (region) {
          return { title: action, message: `${region.name} relationships: regional pathways remain coherent. Connection summary prepared locally.` };
        }
        return { title: action, message: "Select a focus point to review connections." };
      case "Open Runtime Layer":
        {
          const route = getCompanionRouteForSelection(system ?? region, action);
          if (route.companionSectionId) return { title: action, message: `Runtime route prepared. Switching to ${route.companionSectionId}.`, companionSectionId: route.companionSectionId };
          if (route.message) return { title: action, message: route.message };
        }
        if (system || region) return { title: action, message: "Runtime layer readiness prepared locally." };
        return { title: action, message: "Select a system or region to inspect runtime readiness." };
      case "Enter Region":
        if (region) return { title: action, message: `${region.name} chamber opened.` };
        if (system) {
          const parentRegion = getParentRegionForSystem(system.id);
          return { title: action, message: `${parentRegion?.name ?? system.region} chamber opened.` };
        }
        return { title: action, message: "Select a region or system before entering a chamber." };
      case "Access Node":
        if (system) return { title: action, message: `${system.name} chamber opened.` };
        if (region) return { title: action, message: "Selected first matching system in region." };
        return { title: action, message: "Select a node to access it." };
      case "Synchronize":
        if (system) {
          return { title: action, message: `${system.name} synchronization prep complete. Local-only simulation only; no data moved.` };
        }
        if (region) {
          return { title: action, message: `${region.name} synchronization prep complete. Local-only simulation only; no data moved.` };
        }
        return { title: action, message: "Select a focus point to prepare a sync simulation." };
      case "View Activity":
        if (system?.region === "Runtime Nexus" || system?.name === "Device Grid" || region?.id === "runtime" || region?.id === "device") {
          return { title: action, message: "Activity stream routed to Telemetry.", companionSectionId: "Telemetry" };
        }
        if (system || region) return { title: action, message: "Recent activity summary prepared in local dev logs." };
        return { title: action, message: "No local activity available until a system or region is selected." };
      default:
        return { title: action, message: `${selectedLabel} route prepared locally.` };
    }
  }, []);
  const handleInspectorAction = useCallback((action: string) => {
    if (action === "Enter Region") {
      const regionForChamber = selectedRegion ?? (selectedSystem ? getParentRegionForSystem(selectedSystem.id) : null);
      if (regionForChamber) {
        setSelectedRegion(regionForChamber);
        setSelectedSystem(null);
        setActiveChamberId(regionForChamber.id);
        setChamberResult(null);
        setIsChamberOpen(true);
      }
    }
    if (action === "Access Node") {
      if (selectedSystem) {
        setActiveChamberId(selectedSystem.id);
        setChamberResult(null);
        setIsChamberOpen(true);
      } else if (selectedRegion) {
        const firstSystem = getSystemsForRegion(selectedRegion.id)[0] ?? null;
        if (firstSystem) {
          setSelectedSystem(firstSystem);
          setSelectedRegion(null);
          setActiveChamberId(firstSystem.id);
          setChamberResult(null);
          setIsChamberOpen(true);
        }
      }
    }
    const result = buildInspectorActionResult(action, selectedSystem, selectedRegion);
    setActionResult({ title: result.title, message: result.message });
    appendDevLog(`Inspector action: ${action} on ${selectedSystem?.name ?? selectedRegion?.name ?? "none"}`);
    if (result.companionSectionId) {
      appendDevLog(`Navigating to Companion section: ${result.companionSectionId}`);
      onNavigateToCompanionSection?.(result.companionSectionId);
    }
  }, [appendDevLog, buildInspectorActionResult, onNavigateToCompanionSection, selectedRegion, selectedSystem]);
  const openChamber = useCallback(() => {
    if (!selectedSystem) {
      appendDevLog("Attempted system entry without a selected node");
      return;
    }
    setActiveChamberId(selectedSystem.id);
    setChamberResult(null);
    setIsChamberOpen(true);
    const isCortex = selectedSystem.id === "cortex";
    setCortexChamberOpen(isCortex);
    if (isCortex) {
      runtimeViewerLogRef.current = false;
      providersViewedLogRef.current = false;
      bridgesViewedLogRef.current = false;
      appendDevLog("Cortex chamber opened");
    }
    appendDevLog(`Attempted system entry: ${selectedSystem.name}`);
    appendDevLog(`Chamber opened: ${selectedSystem.name}`);
  }, [appendDevLog, selectedSystem]);
  const closeChamber = useCallback(() => {
    const chamberSystem = selectedSystem?.id === activeChamberId ? selectedSystem : null;
    appendDevLog(`Chamber closed${chamberSystem ? `: ${chamberSystem.name}` : ""}`);
    setIsChamberOpen(false);
    runtimeViewerLogRef.current = false;
    providersViewedLogRef.current = false;
    bridgesViewedLogRef.current = false;
  }, [activeChamberId, appendDevLog, selectedSystem]);
  const activeChamberSelection = useMemo(() => {
    if (!activeChamberId) return null;
    return systems.find((entry) => entry.id === activeChamberId) ?? regions.find((entry) => entry.id === activeChamberId) ?? null;
  }, [activeChamberId]);
  const selectSidebarSection = useCallback((section: ValhallaSidebarSection) => {
    setActiveSection(section);
    appendDevLog(`Sidebar focus: ${section.toUpperCase()}`);
    switch (section) {
      case "forge":
        setFocusMode("forge");
        setSelectedSystem(null);
        setSelectedRegion(regions.find((region) => region.id === "creation") ?? null);
        return;
      case "systems": {
        const nextSystem = selectedSystem && (selectedSystem.id === "companion" || selectedSystem.id === "valhalla")
          ? selectedSystem
          : systems.find((system) => system.id === "companion") ?? systems.find((system) => system.id === "valhalla") ?? null;
        setFocusMode("systems");
        setSelectedRegion(regions.find((region) => region.id === "creation") ?? null);
        setSelectedSystem(nextSystem);
        return;
      }
      case "runtime":
        setFocusMode("runtime");
        setSelectedSystem(null);
        setSelectedRegion(regions.find((region) => region.id === "runtime") ?? null);
        return;
      case "memory":
        setFocusMode("memory");
        setSelectedSystem(null);
        setSelectedRegion(regions.find((region) => region.id === "memory") ?? null);
        return;
      case "ai":
        setFocusMode("ai");
        setSelectedSystem(null);
        setSelectedRegion(regions.find((region) => region.id === "ai") ?? null);
        return;
      case "devices":
        setFocusMode("devices");
        setSelectedSystem(null);
        setSelectedRegion(regions.find((region) => region.id === "device") ?? null);
        return;
    }
  }, [appendDevLog, selectedSystem]);
  useEffect(() => {
    if (cortexChamberOpen && !runtimeViewerLogRef.current) {
      appendDevLog("Cortex runtime viewer opened");
      runtimeViewerLogRef.current = true;
    }
  }, [appendDevLog, cortexChamberOpen]);
  useEffect(() => {
    if (!cortexChamberOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen(true);
        appendDevLog("Command palette opened");
      }
      if (event.key === "Escape") setCommandPaletteOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [appendDevLog, cortexChamberOpen]);
  useEffect(() => {
    if (!cortexChamberOpen) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      const id = visible?.target.getAttribute("data-cortex-nav-id") as CortexNavSectionId | null;
      if (id) setActiveNavSection(id);
    }, { root: null, threshold: [0.25, 0.5, 0.75] });
    Object.values(navAnchorRefs.current).forEach((node) => {
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, [cortexChamberOpen]);
  useEffect(() => {
    cortexRuntime.initialize();
    const unsubscribe = cortexEventBus.subscribe(() => {
      setCortexSnapshot(cortexRuntime.getSnapshot());
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className={isAwake ? "valhalla-root valhalla-awake" : "valhalla-root"}>
      <ValhallaHeader onExit={onExit} />
      <div className="valhalla-body">
        <ValhallaSidebar activeSection={activeSection} onSelectSection={selectSidebarSection} />
        <ForgeCanvas
          selectedSystemId={selectedSystem?.id ?? null}
          selectedRegionId={selectedRegion?.id ?? null}
          operationalOverlay={operationalOverlay}
          focusMode={focusMode}
          systemState={forgeSystemState}
          cortexSnapshot={cortexSnapshot}
          onSelectSystem={logSystemSelection}
          onSelectRegion={logRegionSelection}
          onViewportMove={(kind) => appendDevLog(kind)}
        />
        <SystemInspector
          selectedSystem={selectedSystem}
          selectedRegion={selectedRegion}
          operationalOverlay={operationalOverlay}
          setOperationalOverlay={logOperationalOverlay}
          focusMode={focusMode}
          setFocusMode={logFocusMode}
          devLogs={devLogs}
          onClearLogs={clearDevLogs}
          onEnterChamber={openChamber}
          actionResult={actionResult}
          onActionClick={handleInspectorAction}
        />
      </div>
      {isChamberOpen && activeChamberSelection && (
        <section className="valhalla-chamber-overlay valhalla-chamber-overlay-scroll" role="dialog" aria-label={`${activeChamberSelection.name} chamber`}>
          <div className={`valhalla-chamber-shell ${"id" in activeChamberSelection && activeChamberSelection.id === "cortex" ? "valhalla-chamber-shell-cortex" : ""}`}>
            <header className="valhalla-chamber-header">
              <p>Forge Bay Access</p>
              <button type="button" onClick={closeChamber}>Back To Valhalla</button>
            </header>
            <div className="valhalla-chamber-body">
              <h2>{activeChamberSelection.name}</h2>
              <p><strong>Role:</strong> {"classification" in activeChamberSelection ? activeChamberSelection.classification : activeChamberSelection.role}</p>
              <p><strong>Purpose:</strong> {"notes" in activeChamberSelection ? activeChamberSelection.notes : activeChamberSelection.summary}</p>
              <p><strong>Readiness:</strong> {
                "id" in activeChamberSelection && activeChamberSelection.id === "cortex"
                  ? cortexSnapshot.localExecution.activeExecution
                    ? "active / Build loop operational | Inference ready"
                    : "active / Ollama offline — build loop paused | Awaiting model"
                  : "id" in activeChamberSelection && activeChamberSelection.id === "godzilla-ai"
                  ? "Local brain integrated"
                  : "state" in activeChamberSelection && (activeChamberSelection.state === "dormant" || activeChamberSelection.state === "locked")
                    && !getCompanionRouteForSelection(activeChamberSelection, "Chamber").companionSectionId
                  ? "External app dormant — bridge not configured yet"
                  : "state" in activeChamberSelection
                  ? `${activeChamberSelection.state} / ${activeChamberSelection.metrics}`
                  : `${activeChamberSelection.sync} sync`
              }</p>
              <div className="valhalla-chamber-actions">
                {(() => {
                  const isCortexNode = "id" in activeChamberSelection && activeChamberSelection.id === "cortex";
                  const isGodzillaNode = "id" in activeChamberSelection && activeChamberSelection.id === "godzilla-ai";
                  const route = (!isCortexNode && !isGodzillaNode)
                    ? getCompanionRouteForSelection(activeChamberSelection, "Chamber")
                    : { companionSectionId: undefined, message: undefined };
                  const hasRoute = isCortexNode || isGodzillaNode || Boolean(route.companionSectionId);
                  const isDormantExternal = !hasRoute && !isCortexNode && !isGodzillaNode;
                  return (
                    <>
                      <p>{chamberResult ?? (isDormantExternal
                        ? "This project is registered in the KCx ecosystem map but is not connected to Studio Companion runtime yet."
                        : "Companion-linked entry is available where routing exists.")
                      }</p>
                      <button
                        type="button"
                        disabled={isDormantExternal}
                        onClick={() => {
                          if (isCortexNode) {
                            const msg = cortexSnapshot.localExecution.activeExecution
                              ? "Cortex runtime active. Build loop operational. Local inference via Ollama."
                              : "Cortex runtime active. Ollama offline — enable Ollama in AI Providers to start the build loop.";
                            setChamberResult(msg);
                            appendDevLog(`Chamber route: KCx Cortex (${cortexSnapshot.localExecution.activeExecution ? "active" : "offline"})`);
                            return;
                          }
                          if (route.companionSectionId) {
                            appendDevLog(`Chamber route: ${activeChamberSelection.name} -> ${route.companionSectionId}`);
                            onNavigateToCompanionSection?.(route.companionSectionId);
                            setIsChamberOpen(false);
                            return;
                          }
                          const message = route.message ?? "No linked Companion route is available for this chamber.";
                          setChamberResult(message);
                          appendDevLog(`Chamber route unavailable: ${activeChamberSelection.name}`);
                        }}
                      >
                        {isDormantExternal ? "Bridge Not Configured" : "Open In Companion"}
                      </button>
                    </>
                  );
                })()}
              </div>
              {"id" in activeChamberSelection && activeChamberSelection.id === "cortex" && (
                <div className="valhalla-cortex-chamber">
                  <p className="cortex-chamber-status">CONTAINMENT ACTIVE</p>
                  <p className="cortex-chamber-detail">
                    Local intelligence core detected. Activation requires
                    system readiness confirmation.
                  </p>
                  <p className="cortex-chamber-detail">
                    {cortexSnapshot.localExecution.activeExecution
                      ? `ML runtime: Loaded. Local model: ${cortexRuntime.getBuildLoopStatus().ollamaModel}.`
                      : "ML runtime: Not loaded. Local model: Absent."}
                  </p>
                  <button
                    type="button"
                    className="cortex-activate-btn"
                    onClick={() => appendDevLog("Cortex activation attempted - runtime not ready")}
                  >
                    Attempt Activation
                  </button>
                </div>
              )}
              {"id" in activeChamberSelection && activeChamberSelection.id === "godzilla-ai" && (
                <div className="valhalla-cortex-chamber">
                  <p className="cortex-chamber-status">EMBEDDED BRAIN ACTIVE</p>
                  <p className="cortex-chamber-detail">
                    KCxModeAI is an internal Cortex provider — no bridge required.
                    The brain is embedded directly inside Studio Companion and activates
                    as a local fallback when Ollama is unavailable.
                  </p>
                  <p className="cortex-chamber-detail">
                    {cortexSnapshot.localExecution.activeExecution
                      ? "Cortex active — KCxModeAI brain standing by as secondary fallback."
                      : "Ollama offline — KCxModeAI brain is the active local fallback."}
                  </p>
                  <button
                    type="button"
                    className="cortex-activate-btn"
                    onClick={() => {
                      onNavigateToCompanionSection?.("AI Providers");
                      setIsChamberOpen(false);
                      appendDevLog("KCxModeAI: navigated to AI Providers");
                    }}
                  >
                    View in AI Providers
                  </button>
                </div>
              )}
              {cortexChamberOpen && "id" in activeChamberSelection && activeChamberSelection.id === "cortex" && (
                <section className="cortex-chamber">
                  <header className={`cortex-chamber-header cortex-chamber-sticky-header state-${forgeSystemState}`}>
                    <h3>KCx Cortex</h3>
                    <p>Contained intelligence operator for the KCx ecosystem.</p>
                    <span className="cortex-contained-badge">Read-Only Containment</span>
                  </header>
                  <div className="cortex-chamber-scroll">
                    <div className={`cortex-workspace ${dockCollapsed ? "cortex-workspace-dock-collapsed" : ""}`} onMouseEnter={() => {
                      if (!workspaceLayoutViewedLogRef.current) {
                        appendDevLog("Workspace layout viewed");
                        workspaceLayoutViewedLogRef.current = true;
                      }
                    }}>
                    <aside className="cortex-workspace-nav">
                    <div className="cortex-nav-rail" onMouseEnter={() => {
                      if (!navigationRailViewedLogRef.current) {
                        appendDevLog("Navigation rail viewed");
                        navigationRailViewedLogRef.current = true;
                      }
                    }}>
                      <div className="cortex-nav-header">Navigation</div>
                      <div className="cortex-nav-status-strip">
                        <span className="cortex-nav-status-pill">Runtime Stable</span>
                        <span className="cortex-nav-status-pill">Containment Active</span>
                        <span className="cortex-nav-status-pill">Read-only Runtime</span>
                        <span className="cortex-nav-status-pill">Activation Locked</span>
                      </div>
                      <div className="cortex-nav-list">
                        {navItems.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className={`cortex-nav-item ${activeNavSection === item.id ? "cortex-nav-item-active" : ""}`}
                            onClick={() => navigateToCortexSection(item.id)}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                      <div className="cortex-nav-list cortex-nav-actions">
                        {[
                          ["Inspect Runtime", "runtime"],
                          ["Inspect Providers", "providers"],
                          ["Inspect Bridges", "bridges"],
                          ["Review Activation Gate", "activation"],
                          ["Inspect Local Execution", "execution"],
                          ["View Timeline", "timeline"]
                        ].map(([label, target]) => (
                          <button key={label} type="button" className="cortex-nav-item" onClick={() => focusCortexSection(target as CortexNavSectionId, `Runtime interaction selected: ${label}`)}>
                            {label}
                          </button>
                        ))}
                      </div>
                      <button type="button" className="cortex-command-trigger" onClick={() => {
                        setCommandPaletteOpen(true);
                        appendDevLog("Command palette opened");
                      }}>Command Palette</button>
                      <button type="button" className="cortex-dock-toggle" onClick={toggleContextDock}>
                        {dockCollapsed ? "Show Context" : "Hide Context"}
                      </button>
                    </div>
                    </aside>
                    <main className="cortex-workspace-main">
                    <div ref={(node) => { navAnchorRefs.current.overview = node; }} data-cortex-nav-id="overview" className={getAnchorClass("overview")}>
                    <div className="cortex-status-grid">
                      {Object.entries(cortexStatus).map(([key, value]) => (
                        <article key={key} className="cortex-status-card">
                          <p>{key}</p>
                          <strong>{value}</strong>
                        </article>
                      ))}
                      <article className="cortex-status-card">
                        <span className="cortex-label">Ollama</span>
                        <span className={`cortex-status-pill ${ollamaLive ? "status-active" : "status-dormant"}`}>
                          {ollamaLive ? "Live" : "Dormant"}
                        </span>
                      </article>
                      <article className="cortex-status-card">
                        <p>runtime state</p>
                        <strong>{cortexSnapshot.state}</strong>
                      </article>
                      <article className="cortex-status-card">
                        <p>providers</p>
                        <strong>{cortexSnapshot.providers.length}</strong>
                      </article>
                      <article className="cortex-status-card">
                        <p>bridges</p>
                        <strong>{cortexSnapshot.bridges.length}</strong>
                      </article>
                      <article className="cortex-status-card">
                        <p>contained</p>
                        <strong>{cortexSnapshot.contained ? "yes" : "no"}</strong>
                      </article>
                      <article className="cortex-status-card">
                        <span className="cortex-label">Forge State</span>
                        <span className={`cortex-status-pill forge-state-${forgeSystemState}`}>
                          {forgeSystemState.toUpperCase()}
                        </span>
                      </article>
                    </div>
                    <p>
                      Cortex is the future orchestration brain for KCx Studio Companion, Valhalla, KCxMode, Messenger,
                      Robot Buddy, and supporting systems. This chamber is currently frontend-only and read-only.
                      Runtime bridges, model routing, memory, and automation are intentionally locked until later phases.
                    </p>
                    </div>
                    <div ref={(node) => { navAnchorRefs.current.runtime = node; }} data-cortex-nav-id="runtime" className={getAnchorClass("runtime")}>
                    <CortexSection title="Operational Summary" open={expandedSections.operationalSummary} onToggle={(open) => {
                      setCortexPanelOpen("operationalSummary", open);
                      appendDevLog(`Operational summary ${open ? "expanded" : "collapsed"}`);
                    }}>
                      <div className="cortex-operational-summary" onMouseEnter={() => {
                        if (!operationalSummaryViewedLogRef.current) {
                          appendDevLog("Operational summary viewed");
                          operationalSummaryViewedLogRef.current = true;
                        }
                      }}>
                        <p className="cortex-runtime-muted">High-level operational overview for the contained Cortex orchestration shell.</p>
                        <div className="cortex-operational-strip">
                          <span className="cortex-operational-chip">{cortexSnapshot.operationalSummary.runtimePosture}</span>
                          <span className="cortex-operational-chip">Read-only Runtime</span>
                          <span className="cortex-operational-chip">Activation Locked</span>
                          <span className="cortex-operational-chip">Operator Approval Required</span>
                          <span className="cortex-operational-chip">No Active Execution</span>
                        </div>
                        <div className="cortex-command-readiness">
                          <p className="cortex-runtime-posture">Command Readiness {cortexSnapshot.operationalSummary.commandReadiness}%</p>
                          <div className="cortex-command-bar"><div className="cortex-command-fill" style={{ width: `${cortexSnapshot.operationalSummary.commandReadiness}%` }} /></div>
                        </div>
                        <div className="cortex-system-counts">
                          <span className="cortex-status-pill">Contained Systems {cortexSnapshot.operationalSummary.containedSystems}</span>
                          <span className="cortex-status-pill">Read-only Systems {cortexSnapshot.operationalSummary.readonlySystems}</span>
                          <span className="cortex-status-pill">Locked Systems {cortexSnapshot.operationalSummary.lockedSystems}</span>
                          <span className="cortex-status-pill">Monitoring Systems {cortexSnapshot.operationalSummary.monitoringSystems}</span>
                          <span className="cortex-status-pill">Pending Activation Requests {cortexSnapshot.operationalSummary.activationRequests}</span>
                        </div>
                        <div className="cortex-capability-list">
                          <p className="cortex-runtime-muted">Operationally Available</p>
                          {cortexSnapshot.operationalSummary.operationalCapabilities.map((capability) => <p key={capability} className="cortex-capability-row">{capability}</p>)}
                        </div>
                        <div className="cortex-capability-list">
                          <p className="cortex-runtime-muted">Contained / Locked Capabilities</p>
                          {cortexSnapshot.operationalSummary.blockedCapabilities.map((capability) => <p key={capability} className="cortex-capability-row cortex-capability-blocked">{capability}</p>)}
                        </div>
                        <div className="cortex-capability-list">
                          <p className="cortex-runtime-muted">Future Runtime Pathways</p>
                          {[
                            "Local provider activation",
                            "Runtime bridge execution",
                            "Build-analysis orchestration",
                            "Cross-system memory routing",
                            "Multi-provider coordination",
                            "Safe local AI execution"
                          ].map((pathway) => <p key={pathway} className="cortex-capability-row">{pathway}</p>)}
                        </div>
                      </div>
                    </CortexSection>
                    <CortexSection title="Runtime Viewer" open={expandedSections.runtimeViewer} onToggle={(open) => {
                      setCortexPanelOpen("runtimeViewer", open);
                      appendDevLog(`Cortex section ${open ? "expanded" : "collapsed"}: Runtime Viewer`);
                    }}>
                      <p className="cortex-runtime-muted">
                        Read-only view of registered Cortex runtime systems. No bridges are active and no AI execution is enabled.
                      </p>
                      <div className="cortex-runtime-summary-grid">
                        <article className="cortex-runtime-card"><p>Runtime State</p><strong>{cortexSnapshot.state}</strong></article>
                        <article className="cortex-runtime-card"><p>Containment</p><strong>{cortexSnapshot.contained ? "Contained" : "Released"}</strong></article>
                        <article className="cortex-runtime-card"><p>Provider Count</p><strong>{cortexSnapshot.providers.length}</strong></article>
                        <article className="cortex-runtime-card"><p>Bridge Count</p><strong>{cortexSnapshot.bridges.length}</strong></article>
                        <article className="cortex-runtime-card"><p>Active Bridges</p><strong>{cortexSnapshot.bridges.filter((bridge) => bridge.state === "connected").length}</strong></article>
                        <article className="cortex-runtime-card"><p>Alerts</p><strong>{cortexSnapshot.alerts.length}</strong></article>
                      </div>
                    </CortexSection>
                    </div>
                    <div ref={(node) => { navAnchorRefs.current.diagnostics = node; }} data-cortex-nav-id="diagnostics" className={getAnchorClass("diagnostics")}>
                    <CortexSection title="Cortex Diagnostics" open={expandedSections.cortexDiagnostics} onToggle={(open) => {
                      setCortexPanelOpen("cortexDiagnostics", open);
                      appendDevLog(`Cortex section ${open ? "expanded" : "collapsed"}: Cortex Diagnostics`);
                    }}>
                      <div className="cortex-diagnostics" onMouseEnter={() => {
                        if (!diagnosticsViewedLogRef.current) {
                          appendDevLog("Cortex diagnostics viewed");
                          diagnosticsViewedLogRef.current = true;
                        }
                      }}>
                        <p className="cortex-runtime-muted">
                          Read-only runtime diagnostics and containment readiness overview. No active intelligence execution is currently enabled.
                        </p>
                        <div className="cortex-diagnostic-tabs">
                          {["overview", "runtime", "providers", "bridges", "permissions"].map((view) => (
                            <button
                              key={view}
                              type="button"
                              className={`cortex-diagnostic-tab ${diagnosticSubview === view ? "cortex-diagnostic-tab-active" : ""}`}
                              onClick={() => {
                                setDiagnosticSubview(view as typeof diagnosticSubview);
                                appendDevLog(`Diagnostic subview selected: ${view}`);
                              }}
                            >
                              {view}
                            </button>
                          ))}
                          <button type="button" className="cortex-diagnostic-action" onClick={() => focusCortexSection("providers", "Runtime interaction selected: View Provider Matrix")}>View Provider Matrix</button>
                          <button type="button" className="cortex-diagnostic-action" onClick={() => focusCortexSection("bridges", "Runtime interaction selected: View Bridge Matrix")}>View Bridge Matrix</button>
                        </div>
                        {diagnosticSubview !== "overview" && (
                          <div className="cortex-diagnostic-subview">
                            {diagnosticSubview === "runtime" && <p className="cortex-runtime-muted">Runtime health is {cortexSnapshot.diagnostics.runtimeHealth}; containment remains {cortexSnapshot.diagnostics.containment}.</p>}
                            {diagnosticSubview === "providers" && <p className="cortex-runtime-muted">Provider availability is {cortexSnapshot.diagnostics.providerAvailability}%. Provider execution remains unavailable.</p>}
                            {diagnosticSubview === "bridges" && <p className="cortex-runtime-muted">Bridge readiness is {cortexSnapshot.diagnostics.bridgeReadiness}%. Bridge activation remains locked.</p>}
                            {diagnosticSubview === "permissions" && <p className="cortex-runtime-muted">Permission integrity is {cortexSnapshot.diagnostics.permissionIntegrity}; operator approval is still required for activation workflows.</p>}
                          </div>
                        )}
                        <div className="cortex-diagnostics-strip">
                          <span className="cortex-status-pill">Runtime Stable</span>
                          <span className="cortex-status-pill">Containment Active</span>
                          <span className="cortex-status-pill">Bridges Locked</span>
                          <span className="cortex-status-pill">Read-only Mode</span>
                        </div>
                        <div className="cortex-diagnostics-grid">
                          <article className="cortex-diagnostics-card"><p>Runtime Health</p><strong>{cortexSnapshot.diagnostics.runtimeHealth}</strong></article>
                          <article className="cortex-diagnostics-card"><p>Containment</p><strong>{cortexSnapshot.diagnostics.containment}</strong></article>
                          <article className="cortex-diagnostics-card"><p>Provider Availability</p><strong>{cortexSnapshot.diagnostics.providerAvailability}%</strong></article>
                          <article className="cortex-diagnostics-card"><p>Bridge Readiness</p><strong>{cortexSnapshot.diagnostics.bridgeReadiness}%</strong></article>
                          <article className="cortex-diagnostics-card"><p>Permission Integrity</p><strong>{cortexSnapshot.diagnostics.permissionIntegrity}</strong></article>
                          <article className="cortex-diagnostics-card"><p>Last Runtime Check</p><strong>{new Date(cortexSnapshot.diagnostics.lastRuntimeCheck).toLocaleString()}</strong></article>
                        </div>
                        <div className="cortex-diagnostics-grid">
                          <article className="cortex-diagnostics-card">
                            <p>Providers</p>
                            <div className="cortex-readiness-bar"><div className="cortex-readiness-fill" style={{ width: `${cortexSnapshot.diagnostics.providerAvailability}%` }} /></div>
                          </article>
                          <article className="cortex-diagnostics-card">
                            <p>Bridges</p>
                            <div className="cortex-readiness-bar"><div className="cortex-readiness-fill" style={{ width: `${cortexSnapshot.diagnostics.bridgeReadiness}%` }} /></div>
                          </article>
                          <article className="cortex-diagnostics-card">
                            <p>Runtime</p>
                            <div className="cortex-readiness-bar"><div className="cortex-readiness-fill" style={{ width: "100%" }} /></div>
                          </article>
                          <article className="cortex-diagnostics-card">
                            <p>Permissions</p>
                            <div className="cortex-readiness-bar"><div className="cortex-readiness-fill" style={{ width: "100%" }} /></div>
                          </article>
                        </div>
                        <div>
                          <p className="cortex-runtime-muted">Alerts</p>
                          {cortexSnapshot.diagnostics.alerts.length === 0 ? (
                            <p className="cortex-runtime-muted">No active alerts.</p>
                          ) : cortexSnapshot.diagnostics.alerts.map((alert) => <p key={alert} className="cortex-alert-row">{alert}</p>)}
                        </div>
                        <div>
                          <p className="cortex-runtime-muted">Warnings</p>
                          {cortexSnapshot.diagnostics.warnings.length === 0 ? (
                            <p className="cortex-runtime-muted">No active warnings.</p>
                          ) : cortexSnapshot.diagnostics.warnings.map((warning) => <p key={warning} className="cortex-warning-row">{warning}</p>)}
                        </div>
                        <div className="cortex-diagnostics-grid">
                          <article className="cortex-diagnostics-card">
                            <p>KCxModeAI Brain</p>
                            <strong>{cortexSnapshot.embeddedBrain.embeddedBrainAvailable ? "Local Brain Integrated" : "Unavailable"}</strong>
                          </article>
                          <article className="cortex-diagnostics-card">
                            <p>Last Response Source</p>
                            <strong>{cortexSnapshot.embeddedBrain.lastResponseSource ?? "none"}</strong>
                          </article>
                          <article className="cortex-diagnostics-card">
                            <p>Fallback Used</p>
                            <strong>{cortexSnapshot.embeddedBrain.lastFallbackUsed ? "Last Used As Fallback" : "Not yet used"}</strong>
                          </article>
                          <article className="cortex-diagnostics-card">
                            <p>Last Used</p>
                            <strong>{cortexSnapshot.embeddedBrain.lastUsedAt ? new Date(cortexSnapshot.embeddedBrain.lastUsedAt).toLocaleString() : "—"}</strong>
                          </article>
                          {cortexSnapshot.embeddedBrain.lastError && (
                            <article className="cortex-diagnostics-card">
                              <p>Brain Error</p>
                              <strong className="cortex-provider-blocked">{cortexSnapshot.embeddedBrain.lastError.slice(0, 80)}</strong>
                            </article>
                          )}
                        </div>
                      </div>
                    </CortexSection>
                    </div>
                    <div ref={(node) => { navAnchorRefs.current.providers = node; }} data-cortex-nav-id="providers" className={getAnchorClass("providers")}>
                    <CortexSection title="Registered Providers" open={expandedSections.registeredProviders} badge={cortexSnapshot.providers.length} onToggle={(open) => {
                      setCortexPanelOpen("registeredProviders", open);
                      appendDevLog(`Cortex section ${open ? "expanded" : "collapsed"}: Registered Providers`);
                    }}>
                      <div className="cortex-runtime-list" onMouseEnter={() => {
                        if (!providersViewedLogRef.current) {
                          appendDevLog("Cortex providers viewed");
                          providersViewedLogRef.current = true;
                        }
                      }}>
                        {cortexSnapshot.providers.length === 0 ? (
                          <p className="cortex-runtime-muted">No providers registered.</p>
                        ) : cortexSnapshot.providers.map((provider) => (
                          <div key={provider.id} className="cortex-runtime-row cortex-registry-row">
                            <div className="cortex-registry-identity">
                              <strong>{provider.label}</strong>
                              <span>{provider.id}</span>
                            </div>
                            <div className="cortex-registry-meta">
                              <span>{provider.state} / {provider.runtimeAvailability ?? (provider.available ? "available" : "unavailable")}</span>
                              <span>{provider.capabilities.length} capabilities</span>
                            </div>
                            <div className="cortex-registry-chips">
                              <span className="cortex-runtime-chip">{provider.state}</span>
                              <span className="cortex-runtime-chip">{provider.readonly ? "read-only" : "writable"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CortexSection>
                    </div>
                    <div ref={(node) => { navAnchorRefs.current.bridges = node; }} data-cortex-nav-id="bridges" className={getAnchorClass("bridges")}>
                    <CortexSection title="Registered Bridges" open={expandedSections.registeredBridges} badge={cortexSnapshot.bridges.length} onToggle={(open) => {
                      setCortexPanelOpen("registeredBridges", open);
                      appendDevLog(`Cortex section ${open ? "expanded" : "collapsed"}: Registered Bridges`);
                    }}>
                      <div className="cortex-runtime-list" onMouseEnter={() => {
                        if (!bridgesViewedLogRef.current) {
                          appendDevLog("Cortex bridges viewed");
                          bridgesViewedLogRef.current = true;
                        }
                      }}>
                        {cortexSnapshot.bridges.length === 0 ? (
                          <p className="cortex-runtime-muted">No bridges registered.</p>
                        ) : cortexSnapshot.bridges.map((bridge) => (
                          <div key={bridge.id} className="cortex-runtime-row cortex-registry-row">
                            <div className="cortex-registry-identity">
                              <strong>{bridge.label}</strong>
                              <span>{bridge.id}</span>
                            </div>
                            <div className="cortex-registry-meta">
                              <span>{bridge.state === "disconnected" ? "offline" : bridge.state} / {bridge.permission}</span>
                              <span>{bridge.lastActivityAt ? `last activity ${new Date(bridge.lastActivityAt).toLocaleString()}` : "idle"}</span>
                            </div>
                            <div className="cortex-registry-chips">
                              <span className="cortex-runtime-chip">{bridge.state === "disconnected" ? "offline" : bridge.state}</span>
                              <span className="cortex-runtime-chip">{bridge.readonly ? "read-only" : "writable"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CortexSection>
                    <CortexSection title="Bridge Readiness Matrix" open={expandedSections.bridgeReadiness} onToggle={(open) => {
                      setCortexPanelOpen("bridgeReadiness", open);
                      appendDevLog(`Bridge matrix ${open ? "expanded" : "collapsed"}`);
                    }}>
                      <div className="cortex-bridge-matrix" onMouseEnter={() => {
                        if (!bridgeMatrixViewedLogRef.current) {
                          appendDevLog("Bridge readiness matrix viewed");
                          bridgeMatrixViewedLogRef.current = true;
                        }
                      }}>
                        <p className="cortex-runtime-muted">Operational readiness overview for dormant Cortex bridge systems. Activation remains locked and read-only.</p>
                        <div className="cortex-diagnostics-strip">
                          <span className="cortex-status-pill">Total Bridges {cortexSnapshot.bridges.length}</span>
                          <span className="cortex-status-pill">Active Bridges {cortexSnapshot.bridges.filter((bridge) => bridge.state === "connected").length}</span>
                          <span className="cortex-status-pill">Locked Bridges {cortexSnapshot.bridges.filter((bridge) => bridge.state !== "connected").length}</span>
                          <span className="cortex-status-pill">Read-only Bridges {cortexSnapshot.bridges.filter((bridge) => bridge.readonly).length}</span>
                        </div>
                        {Array.from(bridgesByCategory.entries()).map(([category, bridges]) => (
                          <div key={category} className="cortex-bridge-category-group">
                            <p className="cortex-bridge-category">{category}</p>
                            <div className="cortex-bridge-grid">
                              {bridges.map((bridge) => (
                                <article key={bridge.id} className="cortex-bridge-card">
                                  <div className="cortex-bridge-status">
                                    <strong>{bridge.label}</strong>
                                    <span className="cortex-runtime-chip">{bridge.state}</span>
                                  </div>
                                  <div className="cortex-bridge-readiness">
                                    <span>{bridge.readiness}% ready</span>
                                    <div className="cortex-bridge-progress"><div className="cortex-bridge-progress-fill" style={{ width: `${bridge.readiness}%` }} /></div>
                                  </div>
                                  <p className="cortex-bridge-meta">Permission: {bridge.permission}</p>
                                  <p className="cortex-bridge-meta">Mode: {bridge.readonly ? "read-only" : "writable"}</p>
                                  <p className="cortex-bridge-meta">Dependency: {bridge.runtimeDependency ?? "n/a"}</p>
                                  <p className="cortex-bridge-blocked">Blocked: {bridge.activationBlockedReason ?? "none"}</p>
                                  <p className="cortex-bridge-path">Path: {bridge.activationPath ?? "manual operator activation"}</p>
                                </article>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CortexSection>
                    <CortexSection title="Provider Readiness Matrix" open={expandedSections.providerReadiness} onToggle={(open) => {
                      setCortexPanelOpen("providerReadiness", open);
                      appendDevLog(`Provider matrix ${open ? "expanded" : "collapsed"}`);
                    }}>
                      <div className="cortex-provider-matrix" onMouseEnter={() => {
                        if (!providerMatrixViewedLogRef.current) {
                          appendDevLog("Provider readiness matrix viewed");
                          providerMatrixViewedLogRef.current = true;
                        }
                      }}>
                        <p className="cortex-runtime-muted">Operational readiness overview for dormant Cortex provider systems. Provider execution remains locked and read-only.</p>
                        <div className="cortex-diagnostics-strip">
                          <span className="cortex-status-pill">Total Providers {cortexSnapshot.providers.length}</span>
                          <span className="cortex-status-pill">Available Providers {cortexSnapshot.providers.filter((provider) => provider.available).length}</span>
                          <span className="cortex-status-pill">Dormant Providers {cortexSnapshot.providers.filter((provider) => provider.state === "dormant").length}</span>
                          <span className="cortex-status-pill">Read-only Providers {cortexSnapshot.providers.filter((provider) => provider.readonly).length}</span>
                        </div>
                        {Array.from(providersByCategory.entries()).map(([category, providers]) => (
                          <div key={category} className="cortex-provider-category-group">
                            <p className="cortex-provider-category">{category}</p>
                            <div className="cortex-provider-grid">
                              {providers.map((provider) => {
                                const adapterMissing = (provider.activationBlockedReason ?? "").includes("adapter missing");
                                const isEmbedded = provider.id === "kcxmodeai";
                                const statusLabel = isEmbedded
                                  ? "Local brain integrated"
                                  : adapterMissing
                                  ? "Provider registered / adapter missing"
                                  : provider.runtimeAvailability ?? provider.state;
                                return (
                                <article key={provider.id} className="cortex-provider-card">
                                  <div className="cortex-provider-status">
                                    <strong>{provider.label}</strong>
                                    <span className="cortex-runtime-chip">{provider.state}</span>
                                  </div>
                                  <p className="cortex-provider-meta cortex-provider-status-label">{statusLabel}</p>
                                  <div className="cortex-provider-readiness">
                                    <span>{provider.readiness}% ready</span>
                                    <div className="cortex-provider-progress"><div className="cortex-provider-progress-fill" style={{ width: `${provider.readiness}%` }} /></div>
                                  </div>
                                  <p className="cortex-provider-capabilities">Capabilities: {provider.capabilities.length}</p>
                                  <p className="cortex-provider-meta">Containment: {provider.containmentState ?? "contained"}</p>
                                  <p className="cortex-provider-meta">Dependency: {provider.dependencyRequirement ?? "n/a"}</p>
                                  <p className="cortex-provider-meta">Mode: {provider.readonly ? "read-only" : "writable"}</p>
                                  <p className="cortex-provider-blocked">Blocked: {provider.activationBlockedReason ?? "none"}</p>
                                  <p className="cortex-provider-path">Path: {provider.activationPath ?? "manual operator activation"}</p>
                                </article>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CortexSection>
                    </div>
                    <div ref={(node) => { navAnchorRefs.current.activation = node; }} data-cortex-nav-id="activation" className={getAnchorClass("activation")}>
                    <CortexSection title="Activation Gate" open={expandedSections.activationGate} onToggle={(open) => {
                      setCortexPanelOpen("activationGate", open);
                      appendDevLog(`Activation Gate ${open ? "expanded" : "collapsed"}`);
                    }}>
                      <div className="cortex-activation-gate" onMouseEnter={() => {
                        if (!activationGateViewedLogRef.current) {
                          appendDevLog("Activation Gate viewed");
                          activationGateViewedLogRef.current = true;
                        }
                      }}>
                        <p className="cortex-runtime-muted">Manual operator approval layer for future Cortex runtime activation. All activation pathways remain contained and read-only.</p>
                        <div className="cortex-activation-grid">
                          {cortexSnapshot.providers.map((provider) => (
                            <article key={`provider-${provider.id}`} className="cortex-activation-card">
                              <div className="cortex-activation-status">
                                <strong>{provider.label}</strong>
                                <span className="cortex-operator-review">provider</span>
                              </div>
                              <p className="cortex-provider-meta">{provider.readiness}% / {provider.state}</p>
                              <p className="cortex-provider-meta">{provider.activationBlockedReason ?? "Runtime containment active"}</p>
                              <p className="cortex-provider-meta">Containment: {provider.containmentState ?? "contained"}</p>
                              <button type="button" className="cortex-activation-btn" onClick={() => requestActivation(provider.id, "provider", "Provider activation requested")}>Request Activation</button>
                            </article>
                          ))}
                          {cortexSnapshot.bridges.map((bridge) => (
                            <article key={`bridge-${bridge.id}`} className="cortex-activation-card">
                              <div className="cortex-activation-status">
                                <strong>{bridge.label}</strong>
                                <span className="cortex-containment-lock">bridge</span>
                              </div>
                              <p className="cortex-bridge-meta">{bridge.readiness}% / {bridge.state}</p>
                              <p className="cortex-bridge-meta">{bridge.activationBlockedReason ?? "Runtime containment active"}</p>
                              <p className="cortex-bridge-meta">Containment: active</p>
                              <button type="button" className="cortex-activation-btn" onClick={() => requestActivation(bridge.id, "bridge", "Bridge activation requested")}>Request Activation</button>
                            </article>
                          ))}
                        </div>
                        <p className="cortex-runtime-muted">Runtime activation remains disabled. Cortex execution pathways are intentionally contained. Operator approval workflows are simulated only. No providers or bridges can currently execute.</p>
                        <div>
                          <p className="cortex-runtime-muted">Pending Activation Requests</p>
                          <div className="cortex-activation-grid">
                            {cortexSnapshot.activationRequests.length === 0 ? (
                              <p className="cortex-runtime-muted">No pending activation requests.</p>
                            ) : cortexSnapshot.activationRequests.map((request) => (
                              <article key={request.id} className="cortex-activation-request">
                                <div className="cortex-activation-status">
                                  <strong>{request.targetType} / {request.targetId}</strong>
                                  <span className="cortex-activation-denied">{request.state}</span>
                                </div>
                                <p className="cortex-provider-meta">{new Date(request.requestedAt).toLocaleString()}</p>
                                <p className="cortex-provider-meta">{request.blockedReason}</p>
                                <p className="cortex-provider-meta">Containment Lock: {request.containmentLock ? "yes" : "no"}</p>
                                <p className="cortex-provider-meta">Operator Approval: {request.operatorApprovalRequired ? "required" : "not required"}</p>
                                <button type="button" className="cortex-activation-btn" onClick={() => dismissActivationRequest(request.id)}>Dismiss</button>
                              </article>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CortexSection>
                    </div>
                    <div ref={(node) => { navAnchorRefs.current.execution = node; }} data-cortex-nav-id="execution" className={getAnchorClass("execution")}>
                    <CortexSection title="Spec Intake" open={expandedSections.specIntake} onToggle={(open) => {
                      setCortexPanelOpen("specIntake", open);
                      appendDevLog(`Spec Intake ${open ? "expanded" : "collapsed"}`);
                    }}>
                      <div className="cortex-spec-intake-panel">
                        <p className="cortex-runtime-muted">Describe a feature in plain language. Cortex reads your project structure and synthesises a Claude Code implementation prompt. The prompt lands in the Approval Queue for review before handoff.</p>
                        {!cortexSnapshot.localExecution.activeExecution && (
                          <div className="cortex-ollama-setup">
                            <p className="cortex-runtime-muted">Ollama is offline — KCxModeAI Brain local fallback will be used. Enable Ollama in AI Providers for full model-guided output.</p>
                            <p className="cortex-runtime-muted cortex-ollama-setup-title">Setup required — Ollama local model</p>
                            <ol className="cortex-ollama-steps">
                              <li>
                                <span>Install Ollama from </span>
                                <span className="cortex-ollama-url">ollama.com</span>
                              </li>
                              <li>
                                <span>Pull the model:</span>
                                <div className="cortex-ollama-cmd-row">
                                  <code className="cortex-ollama-cmd">ollama pull phi3:latest</code>
                                  <button
                                    type="button"
                                    className="cortex-ollama-copy-btn"
                                    onClick={() => {
                                      void navigator.clipboard?.writeText("ollama pull phi3:latest");
                                      appendDevLog("Copied: ollama pull phi3:latest");
                                    }}
                                  >Copy</button>
                                </div>
                              </li>
                              <li>
                                <span>Start Ollama, then use the Enable Local Ollama button in Local Execution Readiness below.</span>
                              </li>
                            </ol>
                          </div>
                        )}
                        <textarea
                          className="cortex-spec-input"
                          placeholder="e.g. I want a dark mode toggle on the settings tab"
                          value={specInput}
                          onChange={(e) => setSpecInput(e.target.value)}
                          disabled={specLoading}
                          rows={4}
                        />
                        <div className="cortex-spec-actions">
                          <button
                            type="button"
                            className="cortex-activation-btn"
                            onClick={() => void runSpecIntake()}
                            disabled={!specInput.trim() || specLoading}
                          >
                            {specLoading ? "Generating…" : "Generate Implementation Prompt"}
                          </button>
                          {specLoading && <span className="cortex-local-only-chip">{cortexSnapshot.localExecution.activeExecution ? "Ollama synthesising…" : "KCxModeAI Brain processing…"}</span>}
                        </div>
                      </div>
                    </CortexSection>
                    <CortexSection title="Local Execution Readiness" open={expandedSections.localExecution} onToggle={(open) => {
                      setCortexPanelOpen("localExecution", open);
                      appendDevLog(`Local Execution Readiness ${open ? "expanded" : "collapsed"}`);
                    }}>
                      <div className="cortex-execution-readiness" onMouseEnter={() => {
                        if (!localExecutionViewedLogRef.current) {
                          appendDevLog("Local execution readiness viewed");
                          localExecutionViewedLogRef.current = true;
                        }
                      }}>
                        <p className="cortex-runtime-muted">{cortexSnapshot.localExecution.copy}</p>
                        <div className="cortex-diagnostics-strip">
                          <span className="cortex-status-pill">Active Execution {cortexSnapshot.localExecution.activeExecution ? "yes" : "no"}</span>
                          <span className="cortex-local-only-chip">Local-only scaffold</span>
                          <span className="cortex-local-only-chip">Manual summarize only</span>
                          <span className="cortex-sandbox-warning">Sandbox fail-closed</span>
                        </div>
                        <div className="cortex-execution-grid">
                          {cortexSnapshot.localExecution.adapters.map((adapter) => (
                            <article key={adapter.id} className="cortex-execution-card">
                              <div className="cortex-execution-status">
                                <strong>{adapter.label}</strong>
                                <span className="cortex-local-only-chip">{adapter.availability}</span>
                              </div>
                              <p className="cortex-provider-meta">Type: {adapter.providerType}</p>
                              <p className="cortex-provider-meta">Configured: {adapter.configured ? "yes" : "no"} / Enabled: {adapter.enabled ? "yes" : "no"}</p>
                              {adapter.endpointValid !== undefined && <p className="cortex-provider-meta">Endpoint: {adapter.endpointValid ? "localhost valid" : "invalid"}</p>}
                              <p className="cortex-provider-meta">Mode: {adapter.readonly ? "read-only" : "writable"} / Manual approval {adapter.requiresManualApproval ? "required" : "not required"}</p>
                              <p className="cortex-provider-blocked">Blocked: {adapter.blockedReason}</p>
                              <p className="cortex-provider-capabilities">Capabilities: {adapter.capabilities.join(", ")}</p>
                            </article>
                          ))}
                          <article className="cortex-execution-card">
                            <div className="cortex-execution-status">
                              <strong>Permission Enforcement</strong>
                              <span className="cortex-permission-denied">fail closed</span>
                            </div>
                            <p className="cortex-provider-meta">Network: {cortexSnapshot.localExecution.permissions.network}</p>
                            <p className="cortex-provider-meta">Shell: {cortexSnapshot.localExecution.permissions.shellCommands}</p>
                            <p className="cortex-provider-meta">File writes: {cortexSnapshot.localExecution.permissions.fileWrites}</p>
                            <p className="cortex-provider-meta">Provider execution: {cortexSnapshot.localExecution.permissions.providerExecution}</p>
                            <p className="cortex-provider-meta">Cloud execution: {cortexSnapshot.localExecution.permissions.cloudExecution}</p>
                          </article>
                          <article className="cortex-execution-card">
                            <div className="cortex-execution-status">
                              <strong>Sandbox Rules</strong>
                              <span className="cortex-sandbox-warning">contained</span>
                            </div>
                            <p className="cortex-provider-meta">Local only: {cortexSnapshot.localExecution.sandbox.localOnly ? "yes" : "no"}</p>
                            <p className="cortex-provider-meta">Cloud endpoints: {cortexSnapshot.localExecution.sandbox.cloudEndpointsAllowed ? "allowed" : "denied"}</p>
                            <p className="cortex-provider-meta">Background execution: {cortexSnapshot.localExecution.sandbox.backgroundExecutionAllowed ? "allowed" : "denied"}</p>
                            <p className="cortex-provider-meta">Shell from response: {cortexSnapshot.localExecution.sandbox.shellExecutionAllowed ? "allowed" : "denied"}</p>
                            <p className="cortex-provider-meta">Patch application: {cortexSnapshot.localExecution.sandbox.automaticPatchApplicationAllowed ? "allowed" : "denied"}</p>
                          </article>
                          <article className="cortex-execution-card">
                            <div className="cortex-execution-status">
                              <strong>{cortexSnapshot.localExecution.buildAnalysisBridge.label}</strong>
                              <span className="cortex-local-only-chip">read-only</span>
                            </div>
                            <p className="cortex-provider-meta">Shell access: {cortexSnapshot.localExecution.buildAnalysisBridge.shellAccess ? "yes" : "no"}</p>
                            <p className="cortex-provider-meta">File writes: {cortexSnapshot.localExecution.buildAnalysisBridge.fileWrites ? "yes" : "no"}</p>
                            <p className="cortex-provider-meta">Future allowed: {cortexSnapshot.localExecution.buildAnalysisBridge.allowedFutureActions.join(", ")}</p>
                            <p className="cortex-provider-blocked">Blocked: {cortexSnapshot.localExecution.buildAnalysisBridge.blockedActions.join(", ")}</p>
                          </article>
                        </div>
                        <div className="cortex-execution-queue">
                          <div className="cortex-execution-status">
                            <strong>Manual Execution Queue</strong>
                            <span className="cortex-runtime-chip">{cortexSnapshot.localExecution.manualQueue.requests.length} requests</span>
                          </div>
                          <div className="cortex-event-filter-bar">
                            <button type="button" className="cortex-activation-btn" onClick={enableLocalOllama}>Enable Local Ollama</button>
                            <button type="button" className="cortex-activation-btn" onClick={createSafeSummarizeRequest}>Create Safe Summarize Request</button>
                            <button type="button" className="cortex-activation-btn" onClick={approveManualRequest}>Approve Request</button>
                            <button type="button" className="cortex-activation-btn" onClick={() => void executeManualRequest()}>Execute Request</button>
                            <button type="button" className="cortex-activation-btn" onClick={denyTestManualRequest}>Deny Request</button>
                            <button type="button" className="cortex-activation-btn" onClick={clearManualQueue}>Clear Queue</button>
                          </div>
                          {cortexSnapshot.localExecution.manualQueue.requests.length === 0 ? (
                            <p className="cortex-runtime-muted">No manual execution requests. Queue is local-only and dormant.</p>
                          ) : cortexSnapshot.localExecution.manualQueue.requests.map((request) => (
                            <article key={request.id} className="cortex-execution-request">
                              <div className="cortex-execution-status">
                                <strong>{request.purpose}</strong>
                                <span className={request.status === "denied" ? "cortex-activation-denied" : "cortex-sandbox-warning"}>{request.status}</span>
                              </div>
                              <p className="cortex-provider-meta">Provider: {request.providerId}</p>
                              <p className="cortex-provider-meta">Purpose: {request.purpose}</p>
                              <p className="cortex-provider-meta">Created: {new Date(request.createdAt).toLocaleString()}</p>
                              <p className="cortex-provider-meta">Approval: {request.requiresApproval ? "required" : "not required"}</p>
                              <p className="cortex-provider-blocked">Blocked: {request.blockedReason}</p>
                            </article>
                          ))}
                        </div>
                      </div>
                    </CortexSection>
                    <CortexSection key={`execution-results-${cortexSnapshot.localExecution.results.length > 0 ? "has-results" : "empty"}`} title="Execution Results" open={expandedSections.executionResults} badge={cortexSnapshot.localExecution.results.length} onToggle={(open) => {
                      setCortexPanelOpen("executionResults", open);
                      appendDevLog(`Execution Results ${open ? "expanded" : "collapsed"}`);
                    }}>
                      <div className="cortex-execution-results">
                        <p className="cortex-runtime-muted">Read-only local analysis only. Results are local/session-only and cannot write files, run commands, or apply patches.</p>
                        <div className="cortex-execution-toolbar">
                          <button type="button" className="cortex-activation-btn" onClick={clearExecutionResults}>Clear Results</button>
                        </div>
                        {cortexSnapshot.localExecution.results.length === 0 ? (
                          <p className="cortex-runtime-muted">No execution results yet.</p>
                        ) : cortexSnapshot.localExecution.results.map((result) => (
                          <article key={result.id} className="cortex-execution-result">
                            <div className="cortex-execution-status">
                              <strong>{result.providerId}</strong>
                              <span className={`cortex-execution-${result.status}`}>{result.status}</span>
                            </div>
                            <p className="cortex-provider-meta">Request: {result.requestId || "n/a"}</p>
                            <p className="cortex-provider-meta">Started: {new Date(result.startedAt).toLocaleString()}</p>
                            <p className="cortex-provider-meta">Duration: {result.durationMs ?? 0}ms / Sandbox: {result.sandboxAllowed ? "allowed" : "blocked"}</p>
                            {result.blockedReasons.length > 0 && <p className="cortex-provider-blocked">Blocked: {result.blockedReasons.join(" ")}</p>}
                            {result.error && <p className="cortex-provider-blocked">Error: {result.error}</p>}
                            {result.output && <div className="cortex-execution-output">{result.output}</div>}
                            {result.output && <button type="button" className="cortex-activation-btn" onClick={() => copyExecutionResult(result.output)}>Copy Result</button>}
                          </article>
                        ))}
                      </div>
                    </CortexSection>
                    </div>
                    <div ref={(node) => { navAnchorRefs.current.timeline = node; }} data-cortex-nav-id="timeline" className={getAnchorClass("timeline")}>
                    <CortexSection title="Cortex Event Timeline" open={expandedSections.eventTimeline} onToggle={(open) => {
                      setCortexPanelOpen("eventTimeline", open);
                      appendDevLog(`Cortex section ${open ? "expanded" : "collapsed"}: Cortex Event Timeline`);
                      cortexRuntime.addTimelineEvent("system", "monitoring", "Timeline section toggled", `Timeline section ${open ? "expanded" : "collapsed"}.`, "system");
                      setCortexSnapshot(cortexRuntime.getSnapshot());
                    }}>
                      <div className="cortex-event-timeline" onMouseEnter={() => {
                        if (!timelineViewedLogRef.current) {
                          appendDevLog("Timeline viewed");
                          timelineViewedLogRef.current = true;
                          cortexRuntime.addTimelineEvent("system", "monitoring", "Timeline viewed", "Operator viewed the event timeline feed.", "system");
                          setCortexSnapshot(cortexRuntime.getSnapshot());
                        }
                      }}>
                        <p className="cortex-runtime-muted">Read-only operational event history for the contained Cortex runtime shell.</p>
                        <div className="cortex-event-status-strip">
                          <span className="cortex-status-pill">Total Events {cortexSnapshot.timelineEvents.length}</span>
                          <span className="cortex-status-pill">Locked Events {cortexSnapshot.timelineEvents.filter((event) => event.severity === "locked").length}</span>
                          <span className="cortex-status-pill">Activation Attempts {cortexSnapshot.timelineEvents.filter((event) => event.type === "activation").length}</span>
                          <span className="cortex-status-pill">Warnings {cortexSnapshot.timelineEvents.filter((event) => event.severity === "warning" || event.severity === "denied").length}</span>
                          <span className="cortex-status-pill">Read-only Mode</span>
                        </div>
                        <div className="cortex-event-filter-bar">
                          {["all", "runtime", "provider", "bridge", "activation", "diagnostics", "security"].map((filter) => (
                            <button key={filter} type="button" className="cortex-event-filter-chip" onClick={() => {
                              setTimelineFilter(filter as typeof timelineFilter);
                              appendDevLog(`Timeline filter changed: ${filter}`);
                            }}>{filter}</button>
                          ))}
                          <button type="button" className="cortex-event-clear-btn" onClick={() => {
                            cortexRuntime.clearTimeline();
                            cortexRuntime.addTimelineEvent("system", "info", "Timeline cleared", "Local in-memory timeline was cleared.", "system");
                            setCortexSnapshot(cortexRuntime.getSnapshot());
                            appendDevLog("Timeline cleared");
                          }}>Clear Timeline</button>
                        </div>
                        <div className="cortex-event-feed">
                          {filteredTimelineEvents.length === 0 ? (
                            <p className="cortex-runtime-muted">No timeline events.</p>
                          ) : filteredTimelineEvents.map((event) => (
                            <article key={event.id} className="cortex-event-row">
                              <div className="cortex-event-header">
                                <strong>{event.title}</strong>
                                <span className="cortex-event-time">{new Date(event.timestamp).toLocaleString()}</span>
                              </div>
                              <div className="cortex-event-header">
                                <span className="cortex-event-severity">{event.severity}</span>
                                <span className="cortex-event-type">{event.type}</span>
                              </div>
                              <p className="cortex-event-description">{event.description}</p>
                              <div className="cortex-event-header">
                                <span className="cortex-runtime-chip">{event.contained ? "contained" : "uncontained"}</span>
                                <span className="cortex-runtime-chip">{event.readonly ? "read-only" : "writable"}</span>
                              </div>
                            </article>
                          ))}
                        </div>
                      </div>
                    </CortexSection>
                    </div>
                    <div ref={(node) => { navAnchorRefs.current.security = node; }} data-cortex-nav-id="security" className={getAnchorClass("security")}>
                    <CortexSection title="Permission Layer" open={expandedSections.permissionLayer} onToggle={(open) => {
                      setCortexPanelOpen("permissionLayer", open);
                      appendDevLog(`Cortex section ${open ? "expanded" : "collapsed"}: Permission Layer`);
                    }}>
                      <p className="cortex-runtime-muted">Read-only. Contained. Operator approval required for activation. Runtime bridges locked.</p>
                    </CortexSection>
                    <div className="cortex-bridge-list">
                      <h4>Containment Status</h4>
                      <p>{ollamaLive ? "Active. Local inference ready." : cortexSnapshot.state ? "Contained. Local inference dormant." : "Contained. Awaiting activation."}</p>
                    </div>
                    </div>
                    <div ref={(node) => { navAnchorRefs.current.future = node; }} data-cortex-nav-id="future" className={getAnchorClass("future")}>
                    <CortexSection title="Next Activation Steps" open={expandedSections.nextActivationSteps} onToggle={(open) => {
                      setCortexPanelOpen("nextActivationSteps", open);
                      appendDevLog(`Cortex section ${open ? "expanded" : "collapsed"}: Next Activation Steps`);
                    }}>
                      <ul onMouseEnter={() => appendDevLog("Cortex status viewed")}>
                        <li>Define Cortex data contracts</li>
                        <li>Add read-only ecosystem context viewer</li>
                        <li>Add safe runtime bridge interface</li>
                        <li>Add manual approval gates</li>
                        <li>Connect to existing Studio Companion build-analysis logic later</li>
                      </ul>
                    </CortexSection>
                    </div>
                    </main>
                    {!dockCollapsed && <aside className="cortex-dock-pane">
                      <div className="cortex-dock-card">
                        <p className="cortex-dock-title">{sectionLabels[dockSection]}</p>
                        <p className="cortex-dock-meta">{sectionNotes[dockSection]}</p>
                        <div className="cortex-dock-chip-row">
                          <span className="cortex-dock-chip">{cortexSnapshot.operationalSummary.runtimePosture}</span>
                          <span className="cortex-dock-chip">{cortexSnapshot.contained ? "Contained" : "Released"}</span>
                          <span className="cortex-dock-chip">Read-only</span>
                        </div>
                      </div>
                      <div className="cortex-dock-card">
                        <p className="cortex-dock-title">Related</p>
                        {dockRelatedLinks.map((id) => (
                          <button key={id} type="button" className="cortex-command-item" onClick={() => focusCortexSection(id, `Runtime interaction selected: ${sectionLabels[id]}`)}>
                            {sectionLabels[id]}
                          </button>
                        ))}
                      </div>
                    </aside>}
                    </div>
                    {commandPaletteOpen && (
                      <div className="cortex-command-overlay" role="dialog" aria-label="Cortex command palette">
                        <div className="cortex-command-palette">
                          <input
                            className="cortex-command-input"
                            value={commandQuery}
                            onChange={(event) => setCommandQuery(event.target.value)}
                            placeholder="Search commands"
                            autoFocus
                          />
                          <div className="cortex-command-list">
                            {visibleCommandPaletteCommands.map((command) => (
                              <button key={command.label} type="button" className="cortex-command-item" onClick={() => runCommandPaletteCommand(command)}>
                                {command.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
