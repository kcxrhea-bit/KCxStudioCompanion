import React from "react";
import { KDroneNode } from "./KDroneNode";
import { WolfCoreNode } from "./WolfCoreNode";
import { XPodNode } from "./XPodNode";

type SystemState = "idle" | "processing" | "warning" | "error";

interface EcosystemClusterProps {
  systemState: SystemState;
  isKDroneActive: boolean;
}

export function EcosystemCluster({ systemState, isKDroneActive }: EcosystemClusterProps) {
  return (
    <div className={`kcx-ecosystem-panel eco-state-${systemState}`}>
      <KDroneNode key={`drone-${systemState}-${isKDroneActive}`} state={systemState} active={isKDroneActive} />
      <div className="eco-divider" aria-hidden="true" />
      <WolfCoreNode key={`wolf-${systemState}`} state={systemState} />
      <div className="eco-divider" aria-hidden="true" />
      <XPodNode key={`xpod-${systemState}`} state={systemState} />
    </div>
  );
}
