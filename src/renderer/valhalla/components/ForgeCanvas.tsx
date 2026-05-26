import React, { useMemo, useRef, useState } from "react";
import ReactFlow, { Background, Controls, Edge, MiniMap, Node, NodeMouseHandler, OnMove } from "reactflow";
import "reactflow/dist/style.css";

export type ActivityState = "dormant" | "idle" | "active" | "synchronizing" | "warning" | "locked";
export type SystemClass = "Forge System" | "Runtime System" | "Memory System" | "AI Infrastructure" | "Device Node" | "Reactor Core" | "Protected System" | "Experimental Subsystem";
export type ForgeSystemMeta = { id: string; name: string; systemType: string; runtimeStatus: string; classification: string; state: ActivityState; systemClass: SystemClass; region: string; notes: string; syncLevel: string; containmentLevel: string; metrics: string; lore: string; };
export type ForgeRegionMeta = { id: string; name: string; role: string; systems: number; sync: string; atmosphere: string; summary: string; lore: string; };
export type ValhallaFocusMode = "infrastructure" | "synchronization" | "region" | "containment" | "runtime" | "forge" | "systems" | "memory" | "ai" | "devices";

type ForgeCanvasProps = {
  selectedSystemId: string | null;
  selectedRegionId: string | null;
  operationalOverlay: boolean;
  focusMode: ValhallaFocusMode;
  onSelectSystem: (system: ForgeSystemMeta | null) => void;
  onSelectRegion: (region: ForgeRegionMeta | null) => void;
  onViewportMove: (message: string) => void;
};

export const regions: ForgeRegionMeta[] = [
  { id: "creation", name: "Creation Forge", role: "Primary construction chamber for ecosystem systems.", systems: 2, sync: "High", atmosphere: "Molten industrial haze", summary: "Core forge pressure is stable and contained.", lore: "Foundational fabrication layer where system forms are tempered." },
  { id: "runtime", name: "Runtime Nexus", role: "Operational passage for mode and message flow.", systems: 2, sync: "Moderate", atmosphere: "Clean signal air beneath forge haze", summary: "Runtime channels are steady and secondary.", lore: "Coordination layer seated inside the forge infrastructure." },
  { id: "memory", name: "Memory Vault", role: "Low-frequency archival and recall infrastructure.", systems: 0, sync: "Low", atmosphere: "Heavy archival stillness", summary: "Trace systems remain quiet and watchful.", lore: "Long-horizon storage field preserving prior system shape." },
  { id: "ai", name: "AI Systems", role: "Guarded inference and relay structure.", systems: 2, sync: "Rising", atmosphere: "Warm signal haze", summary: "Inference pathways are warming under restraint.", lore: "Constrained intelligence channels held below the forge surface." },
  { id: "device", name: "Device Grid", role: "Peripheral interface and embodiment layer.", systems: 1, sync: "Variable", atmosphere: "Sparse forge static", summary: "Edge constructs remain tethered to core pressure.", lore: "Mechanical endpoints translating forge state into physical action." },
  { id: "cortex", name: "Cortex Core", role: "Restricted intelligence reactor.", systems: 1, sync: "Suppressed", atmosphere: "Deep reactor containment", summary: "The core remains locked beneath controlled pressure.", lore: "Protected intelligence mass held below operational access." }
];

export const systems: ForgeSystemMeta[] = [
  { id: "companion", name: "KCx Studio Companion", systemType: "Runtime Shell", runtimeStatus: "Standby", classification: "Creation Forge", state: "active", systemClass: "Forge System", region: "Creation Forge", notes: "Primary interface shell seated inside the forge.", syncLevel: "91%", containmentLevel: "N/A", metrics: "Load 42% | Link Health 95%", lore: "Coordination shell for guided ecosystem work." },
  { id: "valhalla", name: "Valhalla Systems", systemType: "Forge Shell", runtimeStatus: "Active", classification: "Creation Forge", state: "synchronizing", systemClass: "Experimental Subsystem", region: "Creation Forge", notes: "Realm control layer and forge environment scaffold.", syncLevel: "88%", containmentLevel: "N/A", metrics: "Heat Envelope Stable | Pulse Window 3.2s", lore: "System chamber binding region pressure and focus." },
  { id: "mode", name: "KCx Mode", systemType: "Mode Layer", runtimeStatus: "Idle", classification: "Runtime Nexus", state: "idle", systemClass: "Runtime System", region: "Runtime Nexus", notes: "Mode control channel for downstream behavior.", syncLevel: "64%", containmentLevel: "N/A", metrics: "Routing Variance Low | Queue Nominal", lore: "Context gate for controlled runtime shifts." },
  { id: "messenger", name: "KCx Messenger", systemType: "Comms Layer", runtimeStatus: "Idle", classification: "Runtime Nexus", state: "idle", systemClass: "Runtime System", region: "Runtime Nexus", notes: "Signal exchange layer with restrained throughput.", syncLevel: "59%", containmentLevel: "N/A", metrics: "Signal Drift Minimal | Buffer 12ms", lore: "Quiet relay architecture for deliberate exchange." },
  { id: "local-ai", name: "Local AI", systemType: "Local Inference", runtimeStatus: "Awaiting", classification: "AI Systems", state: "synchronizing", systemClass: "AI Infrastructure", region: "AI Systems", notes: "Local inference channel warming under guard.", syncLevel: "73%", containmentLevel: "Medium", metrics: "Kernel Warm | Relay Latent", lore: "On-device intelligence path held below full pressure." },
  { id: "cloud-ai", name: "Cloud AI", systemType: "Remote Inference", runtimeStatus: "Offline", classification: "AI Systems", state: "dormant", systemClass: "AI Infrastructure", region: "AI Systems", notes: "External relay held dormant at the boundary.", syncLevel: "21%", containmentLevel: "Medium", metrics: "Relay Inactive | Handshake Deferred", lore: "Long-range intelligence route held in reserve." },
  { id: "robot", name: "Robot Buddy", systemType: "Companion Unit", runtimeStatus: "Attention", classification: "Memory Vault", state: "warning", systemClass: "Device Node", region: "Memory Vault", notes: "Embodied endpoint with minor link variance.", syncLevel: "47%", containmentLevel: "N/A", metrics: "Actuator Watch | Link Jitter 4%", lore: "Physical interface point within the memory vault circuit." },
  { id: "cortex", name: "KCx Cortex", systemType: "Intelligence Core", runtimeStatus: "Locked", classification: "Cortex Core", state: "locked", systemClass: "Reactor Core", region: "Cortex Core", notes: "Restricted intelligence core under full containment.", syncLevel: "11%", containmentLevel: "Maximum", metrics: "Containment Field Stable | Pressure Harmonics Rising", lore: "Protected reactor mass below operational access." }
];

const positions: Record<string, { x: number; y: number }> = { companion: { x: 190, y: 220 }, valhalla: { x: 420, y: 285 }, mode: { x: 760, y: 190 }, messenger: { x: 960, y: 300 }, "local-ai": { x: 760, y: 610 }, "cloud-ai": { x: 1015, y: 635 }, robot: { x: 300, y: 690 }, cortex: { x: 1320, y: 360 } };
const related: Record<string, string[]> = { companion: ["valhalla", "mode", "robot"], valhalla: ["companion", "mode", "messenger"], mode: ["valhalla", "messenger", "local-ai"], messenger: ["mode", "cloud-ai"], "local-ai": ["mode", "cloud-ai"], "cloud-ai": ["messenger", "cortex"], robot: ["companion"], cortex: ["cloud-ai"] };
const edges: Edge[] = [
  { id: "e-companion-valhalla", source: "companion", target: "valhalla", className: "forge-edge edge-creation flow-strong", animated: true },
  { id: "e-valhalla-mode", source: "valhalla", target: "mode", className: "forge-edge edge-runtime", animated: true },
  { id: "e-valhalla-messenger", source: "valhalla", target: "messenger", className: "forge-edge edge-runtime", animated: true },
  { id: "e-mode-local", source: "mode", target: "local-ai", className: "forge-edge edge-ai flow-strong", animated: true },
  { id: "e-messenger-cloud", source: "messenger", target: "cloud-ai", className: "forge-edge edge-ai", animated: true },
  { id: "e-companion-robot", source: "companion", target: "robot", className: "forge-edge edge-device", animated: true },
  { id: "e-cloud-cortex", source: "cloud-ai", target: "cortex", className: "forge-edge edge-cortex", animated: true }
];

export function ForgeCanvas({ selectedSystemId, selectedRegionId, operationalOverlay, focusMode, onSelectSystem, onSelectRegion, onViewportMove }: ForgeCanvasProps) {
  const [lastFocusRegion, setLastFocusRegion] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [zoomBand, setZoomBand] = useState<"near" | "mid" | "far">("mid");
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
    isNavigating ? "realm-navigating" : "",
    `zoom-${zoomBand}`,
    activeRegion ? "realm-focused" : "realm-unfocused",
    activeRegion ? `focus-${activeRegion.toLowerCase().replace(/\s+/g, "-")}` : "",
    lastFocusRegion ? `memory-${lastFocusRegion.toLowerCase().replace(/\s+/g, "-")}` : ""
  ].filter(Boolean).join(" ");

  const nodes = useMemo<Node[]>(() => systems.map((system) => {
    const isSelected = selectedSystemId === system.id;
    const sympathy = selectedSystemId ? related[selectedSystemId]?.includes(system.id) : selectedRegionId ? system.region.toLowerCase().includes(selectedRegionId) : false;
    const isDimmed = Boolean((selectedSystemId && !isSelected && !sympathy) || (selectedRegionId && !sympathy));
    const classTone = `class-${system.systemClass.toLowerCase().replace(/\s+/g, "-")}`;
    return { id: system.id, position: positions[system.id], data: { label: system.name }, type: "default", draggable: false, className: ["forge-node", `state-${system.state}`, classTone, `boot-${system.id}`, isSelected ? "is-selected" : "", isDimmed ? "is-dimmed" : "", sympathy ? "is-related" : ""].filter(Boolean).join(" ") };
  }), [selectedSystemId, selectedRegionId]);

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
  return <section className={panelClass} style={{ height: "100%", minHeight: 0 }}>
    <div className="forge-depth-layer forge-structures" /><div className="forge-depth-layer forge-depth-fog" />
    <div className="ambient-event ambient-flare" /><div className="ambient-event ambient-ripple" /><div className="ambient-event ambient-dim-flare" /><div className="ambient-event ambient-resonance-wave" />
    <div aria-hidden="true" role="presentation" className={`forge-zone zone-creation zone-state-active stage-1 ${selectedRegionId === "creation" ? "zone-selected" : ""}`} /><span className="zone-label zone-label-creation">CREATION FORGE</span>
    <div aria-hidden="true" role="presentation" className={`forge-zone zone-runtime zone-state-idle stage-2 ${selectedRegionId === "runtime" ? "zone-selected" : ""}`} /><span className="zone-label zone-label-runtime">RUNTIME NEXUS</span>
    <div aria-hidden="true" role="presentation" className={`forge-zone zone-memory zone-state-dormant stage-5 ${selectedRegionId === "memory" ? "zone-selected" : ""}`} /><span className="zone-label zone-label-memory">MEMORY VAULT</span>
    <div aria-hidden="true" role="presentation" className={`forge-zone zone-ai zone-state-sync stage-4 ${selectedRegionId === "ai" ? "zone-selected" : ""}`} /><span className="zone-label zone-label-ai">AI SYSTEMS</span>
    <div aria-hidden="true" role="presentation" className={`forge-zone zone-device zone-state-warning stage-3 ${selectedRegionId === "device" ? "zone-selected" : ""}`} /><span className="zone-label zone-label-device">DEVICE GRID</span>
    <div aria-hidden="true" role="presentation" className={`forge-zone zone-cortex zone-state-locked stage-6 ${selectedRegionId === "cortex" ? "zone-selected" : ""}`} /><span className="zone-label zone-label-cortex">CORTEX CORE - LOCKED</span>
    <div className="forge-atmos-layer forge-smoke" /><div className="forge-atmos-layer forge-haze" /><div className="forge-atmos-layer forge-vignette" /><div className="forge-embers" />
    <ReactFlow nodes={nodes} edges={edges} fitView fitViewOptions={{ padding: 0.18, duration: 980, minZoom: 0.3, maxZoom: 1.0 }} minZoom={0.28} maxZoom={1.65} defaultViewport={{ x: 0, y: 0, zoom: 0.65 }} nodesDraggable={false} nodesConnectable={false} elementsSelectable={true} panOnDrag={true} panOnScroll zoomOnScroll zoomOnPinch selectionOnDrag={false} onPaneClick={() => { onSelectSystem(null); onSelectRegion(null); }} onNodeClick={onNodeClick} onMoveStart={onMoveStart} onMove={(_, viewport) => { const now = Date.now(); const message = `Canvas move: x ${viewport.x.toFixed(0)}, y ${viewport.y.toFixed(0)}, zoom ${viewport.zoom.toFixed(2)}`; if (now - lastMoveLogAtRef.current > 1200 && message !== lastMoveMessageRef.current) { onViewportMove(message); lastMoveLogAtRef.current = now; lastMoveMessageRef.current = message; } }} onMoveEnd={onMoveEnd} nodeDragThreshold={1} translateExtent={[[-900, -700], [2300, 1700]]} proOptions={{ hideAttribution: true }}>
      <Background color="rgba(255,122,26,0.06)" gap={56} size={1} />
      <MiniMap zoomable pannable nodeColor="#3A404C" maskColor="rgba(9, 11, 16, 0.72)" />
      <Controls showInteractive={false} />
    </ReactFlow>
  </section>;
}
