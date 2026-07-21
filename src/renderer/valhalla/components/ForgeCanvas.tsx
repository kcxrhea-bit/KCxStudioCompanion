import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, { Background, Controls, Edge, MiniMap, Node, NodeMouseHandler, OnMove } from "reactflow";
import "reactflow/dist/style.css";
import type { CortexRuntimeSnapshot } from "../../cortex/types";

export type ActivityState = "dormant" | "idle" | "active" | "synchronizing" | "warning" | "locked";
export type SystemClass = "Forge System" | "Runtime System" | "Memory System" | "AI Infrastructure" | "Device Node" | "Reactor Core" | "Protected System" | "Experimental Subsystem" | "Embedded Intelligence";
export type ForgeSystemMeta = { id: string; name: string; systemType: string; runtimeStatus: string; classification: string; state: ActivityState; systemClass: SystemClass; region: string; notes: string; syncLevel: string; containmentLevel: string; metrics: string; lore: string; };
export type ForgeRegionMeta = { id: string; name: string; role: string; systems: number; sync: string; atmosphere: string; summary: string; lore: string; };
export type ValhallaFocusMode = "infrastructure" | "synchronization" | "region" | "containment" | "runtime" | "forge" | "systems" | "memory" | "ai" | "devices";
export type ForgeSystemState = "idle" | "processing" | "warning" | "error";

type ForgeCanvasProps = {
  selectedSystemId: string | null;
  selectedRegionId: string | null;
  operationalOverlay: boolean;
  focusMode: ValhallaFocusMode;
  systemState?: ForgeSystemState;
  cortexSnapshot?: CortexRuntimeSnapshot;
  onSelectSystem: (system: ForgeSystemMeta | null) => void;
  onSelectRegion: (region: ForgeRegionMeta | null) => void;
  onViewportMove: (message: string) => void;
};

// Maps each system node to the bridge id or provider id that represents its live state.
// Bridge ids take precedence (checked first); provider ids are the fallback.
const SYSTEM_BRIDGE_MAP: Record<string, string> = {
  companion:    "studio-companion-self",
  valhalla:     "valhalla-runtime",
  mode:         "messenger",
  messenger:    "messenger",
  "local-ai":   "kcxmodeai",     // closest proxy — local AI layer
  "cloud-ai":   "cortex-intelligence",
  robot:        "robot-buddy",
  cortex:       "cortex-intelligence",
  "godzilla-ai": "kcxmodeai",
};

const SYSTEM_PROVIDER_MAP: Record<string, string> = {
  "local-ai":    "local-ollama-runtime",
  "godzilla-ai": "kcxmodeai",
  cortex:        "studio-companion-analysis",
};

function deriveActivityState(
  systemId: string,
  snapshot: CortexRuntimeSnapshot | undefined
): ActivityState {
  if (!snapshot) return "idle";

  // Runtime state drives the cortex node directly
  if (systemId === "cortex") {
    const s = snapshot.state;
    if (s === "active") return "active";
    if (s === "monitoring") return "synchronizing";
    if (s === "read-only") return "idle";
    if (s === "dormant") return "dormant";
    return "locked";
  }

  // Try bridge first
  const bridgeId = SYSTEM_BRIDGE_MAP[systemId];
  if (bridgeId) {
    const bridge = snapshot.bridges.find((b) => b.id === bridgeId);
    if (bridge) {
      if (bridge.state === "connected") return "active";
      if (bridge.state === "monitoring") return "synchronizing";
      if (bridge.state === "disabled") return "dormant";
      // disconnected
      if (bridge.readiness >= 60) return "idle";
      return "dormant";
    }
  }

  // Try provider
  const providerId = SYSTEM_PROVIDER_MAP[systemId];
  if (providerId) {
    const provider = snapshot.providers.find((p) => p.id === providerId);
    if (provider) {
      if (provider.state === "active") return "active";
      if (provider.state === "monitoring") return "synchronizing";
      if (provider.state === "dormant") return "dormant";
      return "idle";
    }
  }

  return "idle";
}

export const regions: ForgeRegionMeta[] = [
  { id: "creation", name: "Creation Forge", role: "Primary construction chamber for ecosystem systems.", systems: 2, sync: "High", atmosphere: "Molten industrial haze", summary: "Core forge pressure is stable and contained.", lore: "Foundational fabrication layer where system forms are tempered." },
  { id: "runtime", name: "Runtime Nexus", role: "Operational passage for mode and message flow.", systems: 2, sync: "Moderate", atmosphere: "Clean signal air beneath forge haze", summary: "Runtime channels are steady and secondary.", lore: "Coordination layer seated inside the forge infrastructure." },
  { id: "memory", name: "Memory Vault", role: "Low-frequency archival and recall infrastructure.", systems: 0, sync: "Low", atmosphere: "Heavy archival stillness", summary: "Trace systems remain quiet and watchful.", lore: "Long-horizon storage field preserving prior system shape." },
  { id: "ai", name: "AI Systems", role: "Guarded inference and relay structure.", systems: 2, sync: "Rising", atmosphere: "Warm signal haze", summary: "Inference pathways are warming under restraint.", lore: "Constrained intelligence channels held below the forge surface." },
  { id: "device", name: "Device Grid", role: "Peripheral interface and embodiment layer.", systems: 1, sync: "Variable", atmosphere: "Sparse forge static", summary: "Edge constructs remain tethered to core pressure.", lore: "Mechanical endpoints translating forge state into physical action." },
  { id: "cortex", name: "Cortex Core", role: "Restricted intelligence reactor.", systems: 1, sync: "Suppressed", atmosphere: "Deep reactor containment", summary: "The core remains locked beneath controlled pressure.", lore: "Protected intelligence mass held below operational access." },
  { id: "godzilla", name: "GodzillaMode", role: "Personal health layer for the KCx ecosystem.", systems: 1, sync: "Embedded", atmosphere: "Quiet recovery field integrated into the Cortex fallback layer", summary: "GodzillaMode AI brain is embedded inside Studio Companion as a local fallback intelligence module. No external app required.", lore: "A personal health intelligence now living inside the Cortex containment shell, ready to assist when primary providers are unavailable." }
];

export const systems: ForgeSystemMeta[] = [
  { id: "companion", name: "KCx Studio Companion", systemType: "Runtime Shell", runtimeStatus: "Standby", classification: "Creation Forge", state: "active", systemClass: "Forge System", region: "Creation Forge", notes: "Primary interface shell seated inside the forge.", syncLevel: "91%", containmentLevel: "N/A", metrics: "Load 42% | Link Health 95%", lore: "Coordination shell for guided ecosystem work." },
  { id: "valhalla", name: "Valhalla Systems", systemType: "Forge Shell", runtimeStatus: "Active", classification: "Creation Forge", state: "synchronizing", systemClass: "Experimental Subsystem", region: "Creation Forge", notes: "Realm control layer and forge environment scaffold.", syncLevel: "88%", containmentLevel: "N/A", metrics: "Heat Envelope Stable | Pulse Window 3.2s", lore: "System chamber binding region pressure and focus." },
  { id: "mode", name: "KCx Mode", systemType: "Mode Layer", runtimeStatus: "Idle", classification: "Runtime Nexus", state: "idle", systemClass: "Runtime System", region: "Runtime Nexus", notes: "Mode control channel for downstream behavior.", syncLevel: "64%", containmentLevel: "N/A", metrics: "Routing Variance Low | Queue Nominal", lore: "Context gate for controlled runtime shifts." },
  { id: "messenger", name: "KCx Messenger", systemType: "Comms Layer", runtimeStatus: "Idle", classification: "Runtime Nexus", state: "idle", systemClass: "Runtime System", region: "Runtime Nexus", notes: "Signal exchange layer with restrained throughput.", syncLevel: "59%", containmentLevel: "N/A", metrics: "Signal Drift Minimal | Buffer 12ms", lore: "Quiet relay architecture for deliberate exchange." },
  { id: "local-ai", name: "Local AI", systemType: "Local Inference", runtimeStatus: "Awaiting", classification: "AI Systems", state: "synchronizing", systemClass: "AI Infrastructure", region: "AI Systems", notes: "Local inference channel warming under guard.", syncLevel: "73%", containmentLevel: "Medium", metrics: "Kernel Warm | Relay Latent", lore: "On-device intelligence path held below full pressure." },
  { id: "cloud-ai", name: "Cloud AI", systemType: "Remote Inference", runtimeStatus: "Offline", classification: "AI Systems", state: "dormant", systemClass: "AI Infrastructure", region: "AI Systems", notes: "External relay held dormant at the boundary.", syncLevel: "21%", containmentLevel: "Medium", metrics: "Relay Inactive | Handshake Deferred", lore: "Long-range intelligence route held in reserve." },
  { id: "robot", name: "Robot Buddy", systemType: "Companion Unit", runtimeStatus: "Attention", classification: "Memory Vault", state: "warning", systemClass: "Device Node", region: "Memory Vault", notes: "Embodied endpoint with minor link variance.", syncLevel: "47%", containmentLevel: "N/A", metrics: "Actuator Watch | Link Jitter 4%", lore: "Physical interface point within the memory vault circuit." },
  { id: "cortex", name: "KCx Cortex", systemType: "Intelligence Core", runtimeStatus: "Contained", classification: "Cortex Core", state: "dormant", systemClass: "Reactor Core", region: "Cortex Core", notes: "Intelligence core held in deep containment. Awaiting activation.", syncLevel: "11%", containmentLevel: "Maximum", metrics: "Containment Field Stable | Pressure Harmonics Rising", lore: "A restrained reactor intelligence. Not yet operational. Not yet free." },
  { id: "godzilla-ai", name: "GodzillaMode AI", systemType: "Embedded Local Brain", runtimeStatus: "Integrated", classification: "GodzillaMode", state: "synchronizing", systemClass: "Embedded Intelligence", region: "GodzillaMode", notes: "KCxModeAI brain is embedded as a local fallback intelligence module inside Studio Companion. It supports Cortex when Ollama is unavailable. No external app launch required.", syncLevel: "72%", containmentLevel: "Cortex Containment", metrics: "Local Brain Ready | Cortex Fallback Active", lore: "No longer dormant. The health intelligence lives inside the forge now, woven into the Cortex fallback layer." }
];

const positions: Record<string, { x: number; y: number }> = { companion: { x: 190, y: 220 }, valhalla: { x: 420, y: 285 }, mode: { x: 760, y: 190 }, messenger: { x: 960, y: 300 }, "local-ai": { x: 760, y: 610 }, "cloud-ai": { x: 1015, y: 635 }, robot: { x: 300, y: 690 }, cortex: { x: 1320, y: 360 }, "godzilla-ai": { x: 1320, y: 620 } };
const related: Record<string, string[]> = { companion: ["valhalla", "mode", "robot"], valhalla: ["companion", "mode", "messenger"], mode: ["valhalla", "messenger", "local-ai"], messenger: ["mode", "cloud-ai"], "local-ai": ["mode", "cloud-ai"], "cloud-ai": ["messenger", "cortex"], robot: ["companion"], cortex: ["cloud-ai"], "godzilla-ai": ["cortex"] };
const edges: Edge[] = [
  { id: "e-companion-valhalla", source: "companion", target: "valhalla", className: "forge-edge edge-creation flow-strong", animated: true },
  { id: "e-valhalla-mode", source: "valhalla", target: "mode", className: "forge-edge edge-runtime", animated: true },
  { id: "e-valhalla-messenger", source: "valhalla", target: "messenger", className: "forge-edge edge-runtime", animated: true },
  { id: "e-mode-local", source: "mode", target: "local-ai", className: "forge-edge edge-ai flow-strong", animated: true },
  { id: "e-messenger-cloud", source: "messenger", target: "cloud-ai", className: "forge-edge edge-ai", animated: true },
  { id: "e-companion-robot", source: "companion", target: "robot", className: "forge-edge edge-device", animated: true },
  { id: "e-cloud-cortex", source: "cloud-ai", target: "cortex", className: "forge-edge edge-cortex", animated: true },
  { id: "e-cortex-godzilla", source: "cortex", target: "godzilla-ai", className: "forge-edge edge-experimental", animated: false }
];

export function ForgeCanvas({ selectedSystemId, selectedRegionId, operationalOverlay, focusMode, systemState = "idle", cortexSnapshot, onSelectSystem, onSelectRegion, onViewportMove }: ForgeCanvasProps) {
  const panelRef = useRef<HTMLElement | null>(null);
  const [lastFocusRegion, setLastFocusRegion] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [zoomBand, setZoomBand] = useState<"near" | "mid" | "far">("mid");
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const lastMoveLogAtRef = useRef(0);
  const lastMoveMessageRef = useRef("");
  const active = systems.find((s) => s.id === selectedSystemId) ?? null;
  const activeRegion = active?.classification ?? (selectedRegionId ? regions.find((r) => r.id === selectedRegionId)?.name ?? null : null);
  const mood = useMemo(() => ["mood-calm", "mood-sync", "mood-resonance", "mood-pressure", "mood-lull"][Math.floor((Date.now() / 45000) % 5)], [selectedSystemId, selectedRegionId]);
  const panelClass = [
    "forge-canvas-panel",
    "awakening-sequence",
    mood,
    operationalOverlay ? "operational-overlay-on" : "operational-overlay-off",
    `mode-${focusMode}`,
    `forge-system-${systemState}`,
    isNavigating ? "realm-navigating" : "",
    `zoom-${zoomBand}`,
    activeRegion ? "realm-focused" : "realm-unfocused",
    activeRegion ? `focus-${activeRegion.toLowerCase().replace(/\s+/g, "-")}` : "",
    lastFocusRegion ? `memory-${lastFocusRegion.toLowerCase().replace(/\s+/g, "-")}` : ""
  ].filter(Boolean).join(" ");

  const focusMatchesSystem = useCallback((system: ForgeSystemMeta) => {
    if (focusMode === "systems") return true;
    if (focusMode === "forge") return ["companion", "valhalla"].includes(system.id);
    if (focusMode === "runtime") return ["mode", "messenger"].includes(system.id);
    if (focusMode === "memory") return ["robot"].includes(system.id);
    if (focusMode === "ai") return ["local-ai", "cloud-ai"].includes(system.id);
    if (focusMode === "devices") return system.id === "robot";
    return false;
  }, [focusMode]);
  const nodes = useMemo<Node[]>(() => systems.map((system) => {
    const isSelected = selectedSystemId === system.id;
    const isFocusMatch = focusMatchesSystem(system);
    const sympathy = selectedSystemId ? related[selectedSystemId]?.includes(system.id) : selectedRegionId ? system.region.toLowerCase().includes(selectedRegionId) : false;
    const shouldApplyFocusFilter = ["forge", "systems", "runtime", "memory", "ai", "devices"].includes(focusMode);
    const isDimmed = Boolean(
      shouldApplyFocusFilter
        ? !isFocusMatch && !isSelected
        : (selectedSystemId && !isSelected && !sympathy) || (selectedRegionId && !sympathy)
    );
    const classTone = `class-${system.systemClass.toLowerCase().replace(/\s+/g, "-")}`;
    const liveState = cortexSnapshot ? deriveActivityState(system.id, cortexSnapshot) : system.state;
    return { id: system.id, position: positions[system.id], data: { label: system.name }, type: "default", draggable: false, className: ["forge-node", `state-${liveState}`, classTone, `boot-${system.id}`, isSelected ? "is-selected" : "", isDimmed ? "is-dimmed" : "", sympathy ? "is-related" : "", isFocusMatch ? "is-focus-match" : ""].filter(Boolean).join(" ") };
  }), [focusMatchesSystem, focusMode, selectedSystemId, selectedRegionId, cortexSnapshot]);

  const onNodeClick: NodeMouseHandler = (_, node) => {
    const found = systems.find((s) => s.id === node.id) ?? null;
    setLastFocusRegion(found?.classification ?? null);
    onSelectRegion(null);
    onSelectSystem(found);
  };

  const onMoveStart: OnMove = () => setIsNavigating(true);
  const onMoveEnd: OnMove = (_, viewport) => {
    setIsNavigating(false);
    setZoomBand(viewport.zoom < 0.55 ? "far" : viewport.zoom > 1.05 ? "near" : "mid");
    const now = Date.now();
    const message = `Canvas adjusted: zoom ${viewport.zoom.toFixed(2)}`;
    if (now - lastMoveLogAtRef.current > 1200 && message !== lastMoveMessageRef.current) {
      onViewportMove(message);
      lastMoveLogAtRef.current = now;
      lastMoveMessageRef.current = message;
    }
  };
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const updateReady = () => {
      const { width, height } = panel.getBoundingClientRect();
      setIsCanvasReady(width > 0 && height > 0);
    };

    updateReady();

    if (typeof ResizeObserver === "undefined") {
      const timeout = window.setTimeout(updateReady, 0);
      return () => window.clearTimeout(timeout);
    }

    const observer = new ResizeObserver(() => updateReady());
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);

  return <section ref={panelRef} className={panelClass} style={{ height: "100%", minHeight: 0 }}>
    <div className="forge-depth-layer forge-structures" /><div className="forge-depth-layer forge-depth-fog" />
    <div className="ambient-event ambient-flare" /><div className="ambient-event ambient-ripple" /><div className="ambient-event ambient-dim-flare" /><div className="ambient-event ambient-resonance-wave" />
    <div aria-hidden="true" role="presentation" className={`forge-zone zone-creation zone-state-active stage-1 ${selectedRegionId === "creation" ? "zone-selected" : ""}`} /><span className="zone-label zone-label-creation">CREATION FORGE</span>
    <div aria-hidden="true" role="presentation" className={`forge-zone zone-runtime zone-state-idle stage-2 ${selectedRegionId === "runtime" ? "zone-selected" : ""}`} /><span className="zone-label zone-label-runtime">RUNTIME NEXUS</span>
    <div aria-hidden="true" role="presentation" className={`forge-zone zone-memory zone-state-dormant stage-5 ${selectedRegionId === "memory" ? "zone-selected" : ""}`} /><span className="zone-label zone-label-memory">MEMORY VAULT</span>
    <div aria-hidden="true" role="presentation" className={`forge-zone zone-ai zone-state-sync stage-4 ${selectedRegionId === "ai" ? "zone-selected" : ""}`} /><span className="zone-label zone-label-ai">AI SYSTEMS</span>
    <div aria-hidden="true" role="presentation" className={`forge-zone zone-device zone-state-warning stage-3 ${selectedRegionId === "device" ? "zone-selected" : ""}`} /><span className="zone-label zone-label-device">DEVICE GRID</span>
    <div aria-hidden="true" role="presentation" className={`forge-zone zone-cortex zone-state-locked stage-6 ${selectedRegionId === "cortex" ? "zone-selected" : ""}`} /><span className="zone-label zone-label-cortex">CORTEX CORE</span>
    <div className="forge-atmos-layer forge-smoke" /><div className="forge-atmos-layer forge-haze" /><div className="forge-atmos-layer forge-vignette" /><div className="forge-embers" />
    {!isCanvasReady ? (
      <div className="forge-canvas-loading" aria-live="polite">Forge map initializing...</div>
    ) : (
      <ReactFlow nodes={nodes} edges={edges} fitView fitViewOptions={{ padding: 0.18, duration: 980, minZoom: 0.3, maxZoom: 1.0 }} minZoom={0.28} maxZoom={1.65} defaultViewport={{ x: 0, y: 0, zoom: 0.65 }} nodesDraggable={false} nodesConnectable={false} elementsSelectable={true} panOnDrag={true} panOnScroll zoomOnScroll zoomOnPinch selectionOnDrag={false} onPaneClick={() => { onSelectSystem(null); onSelectRegion(null); }} onNodeClick={onNodeClick} onMoveStart={onMoveStart} onMove={(_, viewport) => { const now = Date.now(); const message = `Canvas move: x ${viewport.x.toFixed(0)}, y ${viewport.y.toFixed(0)}, zoom ${viewport.zoom.toFixed(2)}`; if (now - lastMoveLogAtRef.current > 1200 && message !== lastMoveMessageRef.current) { onViewportMove(message); lastMoveLogAtRef.current = now; lastMoveMessageRef.current = message; } }} onMoveEnd={onMoveEnd} nodeDragThreshold={1} translateExtent={[[-900, -700], [2300, 1700]]} proOptions={{ hideAttribution: true }}>
        <Background color="rgba(255,122,26,0.06)" gap={56} size={1} />
        <MiniMap zoomable pannable nodeColor="#3A404C" maskColor="rgba(9, 11, 16, 0.72)" />
        <Controls showInteractive={false} />
      </ReactFlow>
    )}
  </section>;
}
