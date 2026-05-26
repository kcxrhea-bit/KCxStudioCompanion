import React from "react";

type ValhallaHeaderProps = {
  onExit?: () => void;
};

export function ValhallaHeader({ onExit }: ValhallaHeaderProps) {
  return (
    <header className="valhalla-header">
      <h1>KCx Valhalla</h1>
      <div className="valhalla-divider" />
      <div className="valhalla-header-status">
        <span className="pill active"><span className="status-dot" /> Forge Mode</span>
        <span className="pill">Runtime: Standby</span>
        <span className="pill">AI: Awaiting Link</span>
        {onExit && <button type="button" className="pill valhalla-exit-btn" onClick={onExit}>Return To Companion</button>}
      </div>
    </header>
  );
}
