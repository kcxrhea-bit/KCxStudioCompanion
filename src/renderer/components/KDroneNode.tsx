import React, { useEffect, useId, useState } from "react";
import kdroneIdle from "../assets/kdrone.png";
import kdroneProcessingVideo from "../assets/Kdrone-Processing.mp4";

type SystemState = "idle" | "processing" | "warning" | "error";

const STATUS: Record<SystemState, string> = {
  idle: "Parked",
  processing: "Deployed",
  warning: "Alert",
  error: "Locked",
};

function KDroneNodeComponent({ state, active }: { state: SystemState; active?: boolean }) {
  const [beamObject, setBeamObject] = useState<"cube" | "sphere" | "pyramid">("cube");

  useEffect(() => {
    if (state === "processing" || active) {
      const interval = setInterval(() => {
        const objects: ("cube" | "sphere" | "pyramid")[] = ["cube", "sphere", "pyramid"];
        setBeamObject(objects[Math.floor(Math.random() * 3)]);
      }, 4000);

      return () => clearInterval(interval);
    }
    return undefined;
  }, [state, active]);

  const uid = useId().replace(/:/g, "");
  const droneHullGradient = `droneHullGradient-${uid}`;
  const droneWingGradient = `droneWingGradient-${uid}`;
  const droneGlow = `droneGlow-${uid}`;
  const droneBeamGradient = `droneBeamGradient-${uid}`;

  return (
    <div className={`eco-card drone-card eco-${state}${active ? " drone-active" : ""}`}>
      <div className="drone-depth-layer eco-depth-layer">
        {state === "processing" || active ? (
          <video
            src={kdroneProcessingVideo}
            className="drone-depth-image drone-depth-video"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
          />
        ) : (
          <img
            src={kdroneIdle}
            className="drone-depth-image"
            alt="K-Drone Depth"
          />
        )}
      </div>
      <div className="eco-visual-layer">
        <svg viewBox="0 0 34 22" className="eco-svg drone-svg" aria-hidden="true">
        <defs>
          <radialGradient id={droneHullGradient} cx="50%" cy="35%" r="78%">
            <stop offset="0%" stopColor="#050a12" stopOpacity="0.96" />
            <stop offset="65%" stopColor="#10243c" stopOpacity="0.86" />
            <stop offset="100%" stopColor="#00f2fe" stopOpacity="0.3" />
          </radialGradient>
          <linearGradient id={droneWingGradient} x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#03111f" stopOpacity="0.84" />
            <stop offset="55%" stopColor="#00d8ff" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#03111f" stopOpacity="0.84" />
          </linearGradient>
          <linearGradient id={droneBeamGradient} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.1" />
          </linearGradient>
          <filter id={droneGlow} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.15" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="platform-rings" opacity="0.28">
          <ellipse cx="17" cy="18.6" rx="10.4" ry="1.5" fill="none" stroke="currentColor" strokeWidth="0.32" />
          <ellipse cx="17" cy="18.6" rx="8" ry="1.15" fill="none" stroke="currentColor" strokeWidth="0.24" />
        </g>

        <g filter={`url(#${droneGlow})`}>
          <path className="drone-wing" d="M3.2,8.2 L11.4,10.2 L11,12.5 L2.2,14.8 Z" fill={`url(#${droneWingGradient})`} />
          <path className="drone-wing" d="M30.8,8.2 L22.6,10.2 L23,12.5 L31.8,14.8 Z" fill={`url(#${droneWingGradient})`} />
          <path className="drone-body" d="M10.6,7.3 L23.4,7.3 L26.2,10.7 L23.2,14.3 L10.8,14.3 L8.1,11 Z" fill={`url(#${droneHullGradient})`} />
          <path className="drone-body-facet" d="M12,8.9 L17,8 L22,8.9 L20.8,11.8 L13.2,11.8 Z" />
          <path className="drone-cockpit" d="M13.6,8.8 L20.4,8.8 L21.4,10.6 L20.2,12 L13.8,12 L12.7,10.6 Z" />
          <polyline className="holo-facet drone-facet" points="6.2,10.2 10.6,11.3 17,10.1 23.4,11.3 27.8,10.2" />
          <polyline className="holo-facet drone-facet" points="9.2,13 12.8,12.2 17,12.6 21.2,12.2 24.8,13" />
          <circle className="drone-eye" cx="17" cy="10.6" r="1.2" />
          <circle className="drone-light" cx="12.4" cy="13.7" r="0.68" />
          <circle className="drone-light" cx="17" cy="14.4" r="0.68" />
          <circle className="drone-light" cx="21.6" cy="13.7" r="0.68" />
          <circle className="drone-scan" cx="24.8" cy="10.9" r="0.88" />
          <path className="holo-edge drone-edge" d="M9 9.3L13.3 7.8L20.7 7.8L25 9.3" />
        </g>

        {(state === "processing" || active) && (
          <g className="beam-system">
            <path
              className="creation-beam"
              d="M 17,12.3 L 14.5,20 L 19.5,20 Z"
              fill={`url(#${droneBeamGradient})`}
            />

            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <circle
                key={i}
                className="beam-particle"
                cx={17 + (Math.random() - 0.5) * 1.5}
                cy="12"
                r="0.25"
                fill="currentColor"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}

            <circle
              className="beam-target"
              cx="17"
              cy="20"
              r="2"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.2"
              opacity="0.4"
            />

            <g className="materialized-object" transform="translate(17, 20)">
              {beamObject === "cube" && (
                <rect
                  className="beam-object"
                  x="-1"
                  y="-1"
                  width="2"
                  height="2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.4"
                />
              )}

              {beamObject === "sphere" && (
                <circle
                  className="beam-object"
                  cx="0"
                  cy="0"
                  r="1.2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.4"
                />
              )}

              {beamObject === "pyramid" && (
                <polygon
                  className="beam-object"
                  points="0,-1.5 -1.2,1.2 1.2,1.2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.4"
                />
              )}

              <circle
                className="materialization-ring"
                cx="0"
                cy="0"
                r="0.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.3"
              />
            </g>
          </g>
        )}
        </svg>
      </div>
      <div className="eco-meta">
        <span className="eco-label">K-Drone</span>
        <span className="eco-status">{active ? "Deployed" : STATUS[state]}</span>
      </div>
    </div>
  );
}

KDroneNodeComponent.displayName = "KDroneNode";

export const KDroneNode = React.memo(KDroneNodeComponent);
