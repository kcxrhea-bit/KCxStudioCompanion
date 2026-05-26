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
    setActiveSection(mapSystemToSection(system));
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
    const bridgeLockedMessage = "External app bridge not connected yet.";

    switch (action) {
      case "Open System":
        if (system?.id === "companion") {
          return { title: action, message: `${system.name} system route prepared. Switching to Companion Dashboard.`, companionSectionId: "Dashboard" };
        }
        if (system?.id === "valhalla") {
          return { title: action, message: `${system.name} system route prepared. Switching to Companion Project Context.`, companionSectionId: "Project Context" };
        }
        if (system?.id === "local-ai" || system?.id === "cloud-ai") {
          return { title: action, message: `${system.name} system route prepared. Switching to AI Providers.`, companionSectionId: "AI Providers" };
        }
        if (region?.id === "device") {
          return { title: action, message: `${region.name} regional gateway prepared. Switching to Settings.`, companionSectionId: "Settings" };
        }
        if (region?.id === "memory") {
          return { title: action, message: `${region.name} regional gateway prepared. Switching to Project Memory.`, companionSectionId: "Project Memory" };
        }
        if (region?.id === "ai") {
          return { title: action, message: `${region.name} regional gateway prepared. Switching to AI Providers.`, companionSectionId: "AI Providers" };
        }
        if (system?.id === "mode" || system?.id === "messenger" || system?.id === "robot" || system?.id === "cortex") {
          return { title: action, message: bridgeLockedMessage };
        }
        if (region?.id === "runtime" || region?.id === "device") {
          return { title: action, message: `${region.name} regional gateway prepared. ${bridgeLockedMessage}` };
        }
        if (system) {
          return { title: action, message: `${system.name} system route prepared locally. Real app bridge not connected yet.` };
        }
        if (region) {
          return { title: action, message: `${region.name} regional gateway prepared. Select a system node for direct app routing.` };
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
        if (system?.id === "companion") {
          return { title: action, message: `${system.name} runtime layer prepared. Switching to Telemetry.`, companionSectionId: "Telemetry" };
        }
        if (region?.id === "device") {
          return { title: action, message: `${region.name} runtime layer prepared. Switching to Telemetry.`, companionSectionId: "Telemetry" };
        }
        if (region?.id === "runtime") {
          return { title: action, message: `${region.name} runtime layer prepared. Switching to Telemetry.`, companionSectionId: "Telemetry" };
        }
        if (system?.id === "mode" || system?.id === "messenger" || system?.id === "robot" || system?.id === "cortex") {
          return { title: action, message: bridgeLockedMessage };
        }
        if (system) {
          return { title: action, message: `${system.name} runtime status: ${system.runtimeStatus}. Local runtime layer prepared.` };
        }
        if (region) {
          return { title: action, message: `${region.name} runtime layer prepared. Sync status: ${region.sync}.` };
        }
        return { title: action, message: "Select a system or region to inspect runtime readiness." };
      case "Enter Region":
        if (region) {
          return { title: action, message: `${region.name} chamber entry prepared. Regional access remains frontend-only.` };
        }
        if (system) {
          const parentRegion = system.region || "Unknown region";
          return { title: action, message: `${system.name} sits in ${parentRegion}. Region entry prepared locally.` };
        }
        return { title: action, message: "Select a region or system before entering a chamber." };
      case "Access Node":
        if (system) {
          return { title: action, message: `${system.name} node access prepared. Local node bridge not connected yet.` };
        }
        if (region) {
          return { title: action, message: "Select a system node inside this region." };
        }
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
        if (system) {
          return { title: action, message: `${system.name} activity: standby traces, link health, and chamber events are available in the local ledger.` };
        }
        if (region?.id === "device") {
          return { title: action, message: `${region.name} activity: device-linked telemetry prepared. Switching to Telemetry.`, companionSectionId: "Telemetry" };
        }
        if (region) {
          return { title: action, message: `${region.name} activity: ${region.sync} sync health, ${region.systems} systems, local forge traces.` };
        }
        return { title: action, message: "No local activity available until a system or region is selected." };
      default:
        return { title: action, message: `${selectedLabel} route prepared locally.` };
    }
  }, []);
  const handleInspectorAction = useCallback((action: string) => {
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
    setIsChamberOpen(true);
    appendDevLog(`Attempted system entry: ${selectedSystem.name}`);
    appendDevLog(`Chamber opened: ${selectedSystem.name}`);
  }, [appendDevLog, selectedSystem]);
  const closeChamber = useCallback(() => {
    const chamberSystem = selectedSystem?.id === activeChamberId ? selectedSystem : null;
    appendDevLog(`Chamber closed${chamberSystem ? `: ${chamberSystem.name}` : ""}`);
    setIsChamberOpen(false);
  }, [activeChamberId, appendDevLog, selectedSystem]);
  const activeChamberSystem = useMemo(() => {
    if (!activeChamberId) return null;
    if (selectedSystem?.id === activeChamberId) return selectedSystem;
    return null;
  }, [activeChamberId, selectedSystem]);
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
        setSelectedRegion(null);
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
      {isChamberOpen && activeChamberSystem && (
        <section className="valhalla-chamber-overlay" role="dialog" aria-label={`${activeChamberSystem.name} chamber`}>
          <div className="valhalla-chamber-shell">
            <header className="valhalla-chamber-header">
              <p>Forge Bay Access</p>
              <button type="button" onClick={closeChamber}>Back To Valhalla</button>
            </header>
            <div className="valhalla-chamber-body">
              <h2>{activeChamberSystem.name}</h2>
              <p><strong>System Role:</strong> {activeChamberSystem.classification}</p>
              <p><strong>Purpose:</strong> {activeChamberSystem.notes}</p>
              <p><strong>Readiness:</strong> {activeChamberSystem.state} / {activeChamberSystem.metrics}</p>
              <div className="valhalla-chamber-actions">
                <p>Routing surface reserved for future live system entry.</p>
                <button type="button" onClick={() => appendDevLog(`Chamber placeholder action: ${activeChamberSystem.name}`)}>Prepare Entry Path</button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
