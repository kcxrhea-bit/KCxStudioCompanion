import React from "react";
import { KDroneNode } from "./KDroneNode";
import { WolfCoreNode } from "./WolfCoreNode";
import { XPodNode } from "./XPodNode";

type SystemState = "idle" | "processing" | "warning" | "error";

interface EcosystemStatusPanelProps {
  systemState: SystemState;
  isKDroneActive: boolean;
}

export function EcosystemStatusPanel({ systemState, isKDroneActive }: EcosystemStatusPanelProps) {
  return (
    <div className={`ecosystem-status-panel eco-state-${systemState}`}>
      <div className="ecosystem-node-slot">
        <KDroneNode key={`drone-${systemState}-${isKDroneActive}`} state={systemState} active={isKDroneActive} />
      </div>
      <div className="ecosystem-node-slot">
        <WolfCoreNode key={`wolf-${systemState}`} state={systemState} />
      </div>
      <div className="ecosystem-node-slot">
        <XPodNode key={`xpod-${systemState}`} state={systemState} />
      </div>
    </div>
  );
}
