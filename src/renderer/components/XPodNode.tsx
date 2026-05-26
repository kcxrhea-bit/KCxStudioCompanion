import React, { useId } from "react";
import xpodIdle from "../assets/xpod.png";
import xpodProcessingVideo from "../assets/Xpod-Processing.mp4";

type SystemState = "idle" | "processing" | "warning" | "error";

const STATUS: Record<SystemState, string> = {
  idle: "Docked",
  processing: "Orbiting",
  warning: "Alert",
  error: "Halted",
};

function XPodNodeComponent({ state }: { state: SystemState }) {
  const getSpinSpeed = (): number => {
    switch (state) {
      case "idle":
        return 12;
      case "processing":
        return 3;
      case "warning":
        return 6;
      case "error":
        return 20;
      default:
        return 12;
    }
  };

  const spinSpeed = getSpinSpeed();

  const uid = useId().replace(/:/g, "");
  const xpodHullGradient = `xpodHullGradient-${uid}`;
  const xpodTopGradient = `xpodTopGradient-${uid}`;
  const xpodGlow = `xpodGlow-${uid}`;
  const podGradient = `podGradient-${uid}`;

  return (
    <div className={`eco-card xpod-card eco-${state}`}>
      <div className="xpod-depth-layer eco-depth-layer">
        {state === "processing" ? (
          <video
            src={xpodProcessingVideo}
            className="xpod-depth-image xpod-depth-video"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
          />
        ) : (
          <img
            src={xpodIdle}
            className="xpod-depth-image"
            alt="X-Pod Depth"
          />
        )}
      </div>
      <div className="eco-visual-layer">
        <svg viewBox="0 0 34 22" className="eco-svg xpod-svg" aria-hidden="true">
        <defs>
          <radialGradient id={xpodHullGradient} cx="50%" cy="40%" r="80%">
            <stop offset="0%" stopColor="#02060d" stopOpacity="0.97" />
            <stop offset="66%" stopColor="#0c2136" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#00f2fe" stopOpacity="0.28" />
          </radialGradient>
          <linearGradient id={xpodTopGradient} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#caefff" stopOpacity="0.58" />
            <stop offset="58%" stopColor="#00b7ff" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#04101e" stopOpacity="0.3" />
          </linearGradient>
          <radialGradient id={podGradient} cx="50%" cy="35%" r="78%">
            <stop offset="0%" stopColor="#091427" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#0c2238" stopOpacity="0.88" />
            <stop offset="100%" stopColor="#00f2fe" stopOpacity="0.34" />
          </radialGradient>
          <filter id={xpodGlow} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="platform-rings" opacity="0.3">
          <ellipse cx="17" cy="18.7" rx="10.3" ry="1.4" fill="none" stroke="currentColor" strokeWidth="0.32" />
          <ellipse cx="17" cy="18.7" rx="8.1" ry="1.1" fill="none" stroke="currentColor" strokeWidth="0.24" />
          <ellipse cx="17" cy="18.7" rx="5.9" ry="0.82" fill="none" stroke="currentColor" strokeWidth="0.2" />
        </g>

        <g className="orbital-system" filter={`url(#${xpodGlow})`}>
          <ellipse
            className="orbital-track"
            cx="17"
            cy="10.6"
            rx="13"
            ry="6"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.2"
            strokeDasharray="0.5 0.8"
            opacity="0.25"
          />

          <ellipse
            className="xpod-ring ring-outer"
            cx="17"
            cy="10.6"
            rx="12"
            ry="5.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.8"
            style={{
              animationName: "ring-spin",
              animationDuration: `${spinSpeed}s`,
              animationTimingFunction: "linear",
              animationIterationCount: "infinite",
              transformOrigin: "17px 10.6px",
              filter: state === "processing" ? "blur(0.3px)" : "none",
            }}
          />

          <ellipse
            className="xpod-ring ring-middle"
            cx="17"
            cy="10.6"
            rx="9.5"
            ry="4.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.6"
            opacity="0.8"
            style={{
              animationName: "ring-spin-reverse",
              animationDuration: `${spinSpeed * 1.5}s`,
              animationTimingFunction: "linear",
              animationIterationCount: "infinite",
              transformOrigin: "17px 10.6px",
              filter: state === "processing" ? "blur(0.3px)" : "none",
            }}
          />

          <ellipse
            className="xpod-ring ring-inner"
            cx="17"
            cy="10.6"
            rx="7.5"
            ry="3.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.4"
            opacity="0.6"
            style={{
              animationName: "ring-spin",
              animationDuration: `${spinSpeed * 0.65}s`,
              animationTimingFunction: "linear",
              animationIterationCount: "infinite",
              transformOrigin: "17px 10.6px",
            }}
          />

          <circle
            className="track-runner"
            cx="17"
            cy="10.6"
            r="0.6"
            fill="currentColor"
            style={{
              filter: "drop-shadow(0 0 3px currentColor)",
              animationName: "runner-orbit-x, runner-orbit-y",
              animationDuration: `${spinSpeed}s, ${spinSpeed}s`,
              animationTimingFunction: "linear, linear",
              animationIterationCount: "infinite, infinite",
              transformOrigin: "17px 10.6px",
            }}
          />

          {[0, 1, 2, 3, 4].map((i) => (
            <circle
              key={i}
              className="runner-trail"
              cx="17"
              cy="10.6"
              r="0.3"
              fill="currentColor"
              opacity={0.7 - i * 0.12}
              style={{
                animationName: "runner-orbit-x, runner-orbit-y",
                animationDuration: `${spinSpeed}s, ${spinSpeed}s`,
                animationTimingFunction: "linear, linear",
                animationIterationCount: "infinite, infinite",
                animationDelay: `-${i * 0.15}s, -${i * 0.15}s`,
                transformOrigin: "17px 10.6px",
              }}
            />
          ))}

          <path className="xpod-body" d="M10.2,10.6 L13.4,7.3 L20.6,7.3 L23.8,10.6 L20.6,13.9 L13.4,13.9 Z" fill={`url(#${xpodHullGradient})`} />
          <path className="xpod-nose" d="M20.4,8.6 L25.1,10.6 L20.4,12.6 Z" fill={`url(#${xpodTopGradient})`} />
          <ellipse
            cx="17"
            cy="10.6"
            rx="2.5"
            ry="3.5"
            fill={`url(#${podGradient})`}
            stroke="currentColor"
            strokeWidth="0.5"
          />
          <ellipse className="xpod-cockpit" cx="17" cy="10.6" rx="1.6" ry="2.2" />
          <ellipse
            cx="17"
            cy="10.6"
            rx="1.5"
            ry="2"
            fill="currentColor"
            opacity="0.3"
            style={{
              animationName: state === "processing" ? "pod-core-pulse" : "none",
              animationDuration: "1.5s",
              animationTimingFunction: "ease-in-out",
              animationIterationCount: "infinite",
            }}
          />
          <circle className="xpod-engine" cx="11" cy="10.6" r="1.1" />
          <circle className="xpod-light" cx="15.3" cy="8.1" r="0.55" />
          <circle className="xpod-light" cx="18.8" cy="12.8" r="0.55" />
        </g>
        </svg>
      </div>
      <div className="eco-meta">
        <span className="eco-label">X-Pod</span>
        <span className="eco-status">{STATUS[state]}</span>
      </div>
    </div>
  );
}

XPodNodeComponent.displayName = "XPodNode";

export const XPodNode = React.memo(XPodNodeComponent);
