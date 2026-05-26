import React, { useCallback, useEffect, useState } from "react";
import { EcosystemStatusPanel } from "./EcosystemStatusPanel";

type SystemState = "idle" | "processing" | "warning" | "error";

export const EcosystemTest: React.FC = () => {
  const [state, setState] = useState<SystemState>("idle");
  const [autoRotate, setAutoRotate] = useState(false);

  const selectState = useCallback((nextState: SystemState) => {
    setState((currentState) => (currentState === nextState ? currentState : nextState));
  }, []);

  const toggleAutoRotate = useCallback(() => {
    setAutoRotate((currentValue) => !currentValue);
  }, []);

  useEffect(() => {
    if (autoRotate) {
      const states: SystemState[] = ["idle", "processing", "warning", "error"];
      let index = 0;

      const interval = setInterval(() => {
        index = (index + 1) % states.length;
        setState(states[index]);
      }, 5000);

      return () => clearInterval(interval);
    }
    return undefined;
  }, [autoRotate]);

  return (
    <div
      style={{
        padding: "40px",
        background: "#000",
        minHeight: "100vh",
        color: "#00D9FF",
      }}
    >
      <h1>KCx Ecosystem Animation Test</h1>

      <div style={{ marginBottom: "20px" }}>
        <button type="button" onClick={() => selectState("idle")}>Idle</button>
        <button type="button" onClick={() => selectState("processing")}>Processing</button>
        <button type="button" onClick={() => selectState("warning")}>Warning</button>
        <button type="button" onClick={() => selectState("error")}>Error</button>
        <button type="button" onClick={toggleAutoRotate}>
          {autoRotate ? "Stop Auto-Rotate" : "Auto-Rotate States"}
        </button>
        <span style={{ marginLeft: "20px" }}>Current: {state}</span>
      </div>

      <div
        className="ecosystem-dock-body ecosystem-test-dock-body"
        style={{
          marginTop: "40px",
        }}
      >
        <EcosystemStatusPanel systemState={state} isKDroneActive={state === "processing"} />
      </div>

      <div style={{ marginTop: "40px" }}>
        <h2>Animation Checklist</h2>
        <ul>
          <li>✓ Wolf howls when processing (head tilt, energy waves, particle burst)</li>
          <li>✓ Drone beam creates random objects when processing (cube/sphere/pyramid)</li>
          <li>✓ X-Pod rings spin continuously (speed varies by state)</li>
          <li>✓ Colors change based on state (cyan/magenta/amber/red)</li>
          <li>✓ Smooth transitions between states</li>
          <li>✓ All animations loop correctly</li>
        </ul>
      </div>
    </div>
  );
};
