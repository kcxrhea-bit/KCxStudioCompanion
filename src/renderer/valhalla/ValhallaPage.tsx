import React, { useCallback, useMemo, useState } from "react";
import { ValhallaHeader } from "./components/ValhallaHeader";
import { ValhallaSidebar, ValhallaSidebarSection } from "./components/ValhallaSidebar";
import { ForgeCanvas, ForgeRegionMeta, ForgeSystemMeta, systems, regions, ValhallaFocusMode } from "./components/ForgeCanvas";
import { SystemInspector } from "./components/SystemInspector";
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
  const cortexStatus = useMemo(() => ({
    state: "contained",
    activation: "Dormant",
    intelligence: "Offline",
    routing: "Monitoring only",
    permissions: "Read-only shell",
    risk: "Contained",
    nextStage: "Runtime bridge not connected"
  }), []);
  const isAwake = useMemo(() => true, []);
  const appendDevLog = useCallback((message: string) => {
    const entry = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), message };
    setDevLogs((prev) => [entry, ...prev].slice(0, 50));
  }, []);
  const clearDevLogs = useCallback(() => setDevLogs([]), []);
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
    if (isCortex) appendDevLog("Cortex chamber opened");
    appendDevLog(`Attempted system entry: ${selectedSystem.name}`);
    appendDevLog(`Chamber opened: ${selectedSystem.name}`);
  }, [appendDevLog, selectedSystem]);
  const closeChamber = useCallback(() => {
    const chamberSystem = selectedSystem?.id === activeChamberId ? selectedSystem : null;
    appendDevLog(`Chamber closed${chamberSystem ? `: ${chamberSystem.name}` : ""}`);
    setIsChamberOpen(false);
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
        <section className="valhalla-chamber-overlay" role="dialog" aria-label={`${activeChamberSelection.name} chamber`}>
          <div className="valhalla-chamber-shell">
            <header className="valhalla-chamber-header">
              <p>Forge Bay Access</p>
              <button type="button" onClick={closeChamber}>Back To Valhalla</button>
            </header>
            <div className="valhalla-chamber-body">
              <h2>{activeChamberSelection.name}</h2>
              <p><strong>Role:</strong> {"classification" in activeChamberSelection ? activeChamberSelection.classification : activeChamberSelection.role}</p>
              <p><strong>Purpose:</strong> {"notes" in activeChamberSelection ? activeChamberSelection.notes : activeChamberSelection.summary}</p>
              <p><strong>Readiness:</strong> {"state" in activeChamberSelection ? `${activeChamberSelection.state} / ${activeChamberSelection.metrics}` : `${activeChamberSelection.sync} sync`}</p>
              <div className="valhalla-chamber-actions">
                <p>{chamberResult ?? "Companion-linked entry is available where routing exists."}</p>
                <button type="button" onClick={() => {
                  const route = getCompanionRouteForSelection(activeChamberSelection, "Chamber");
                  if (route.companionSectionId) {
                    appendDevLog(`Chamber route: ${activeChamberSelection.name} -> ${route.companionSectionId}`);
                    onNavigateToCompanionSection?.(route.companionSectionId);
                    setIsChamberOpen(false);
                    return;
                  }
                  const message = route.message ?? "No linked Companion route is available for this chamber.";
                  setChamberResult(message);
                  appendDevLog(`Chamber route unavailable: ${activeChamberSelection.name}`);
                }}>Open In Companion</button>
              </div>
              {"id" in activeChamberSelection && activeChamberSelection.id === "cortex" && (
                <div className="valhalla-cortex-chamber">
                  <p className="cortex-chamber-status">CONTAINMENT ACTIVE</p>
                  <p className="cortex-chamber-detail">
                    Local intelligence core detected. Activation requires
                    system readiness confirmation.
                  </p>
                  <p className="cortex-chamber-detail">
                    ML runtime: Not loaded. Local model: Absent.
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
              {cortexChamberOpen && "id" in activeChamberSelection && activeChamberSelection.id === "cortex" && (
                <section className="cortex-chamber">
                  <header className="cortex-chamber-header">
                    <h3>KCx Cortex</h3>
                    <p>Contained intelligence operator for the KCx ecosystem.</p>
                    <span className="cortex-contained-badge">Read-Only Containment</span>
                  </header>
                  <div className="cortex-status-grid">
                    {Object.entries(cortexStatus).map(([key, value]) => (
                      <article key={key} className="cortex-status-card">
                        <p>{key}</p>
                        <strong>{value}</strong>
                      </article>
                    ))}
                  </div>
                  <p>
                    Cortex is the future orchestration brain for KCx Studio Companion, Valhalla, KCxMode, Messenger,
                    Robot Buddy, and supporting systems. This chamber is currently frontend-only and read-only.
                    Runtime bridges, model routing, memory, and automation are intentionally locked until later phases.
                  </p>
                  <div className="cortex-bridge-list">
                    <h4>Containment Status</h4>
                    <p>Contained. Dormant. Frontend-only shell.</p>
                    <h4>Future Responsibilities</h4>
                    <ul>
                      <li>Route project context between KCx systems</li>
                      <li>Coordinate local and optional online AI models</li>
                      <li>Analyze build logs and project states</li>
                      <li>Suggest safe next actions</li>
                      <li>Maintain ecosystem memory boundaries</li>
                      <li>Feed Valhalla operational state</li>
                    </ul>
                    <h4>Locked Runtime Bridges</h4>
                    <ul onMouseEnter={() => appendDevLog("Cortex bridge list viewed")}>
                      <li>Local model bridge</li>
                      <li>Build analysis bridge</li>
                      <li>Project memory bridge</li>
                      <li>Messenger/Android app bridge</li>
                      <li>KCxModeAI bridge</li>
                      <li>Safety/permission layer</li>
                    </ul>
                    <h4>Next Activation Steps</h4>
                    <ul onMouseEnter={() => appendDevLog("Cortex status viewed")}>
                      <li>Define Cortex data contracts</li>
                      <li>Add read-only ecosystem context viewer</li>
                      <li>Add safe runtime bridge interface</li>
                      <li>Add manual approval gates</li>
                      <li>Connect to existing Studio Companion build-analysis logic later</li>
                    </ul>
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
