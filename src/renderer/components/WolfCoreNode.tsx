import React, { useId } from "react";
import cwolfIdle from "../assets/cwolf.png";
import cwolfProcessingVideo from "../assets/Cwolf-Processing.mp4";

type SystemState = "idle" | "processing" | "warning" | "error";

const STATUS: Record<SystemState, string> = {
  idle: "Stable",
  processing: "Thinking",
  warning: "Attention",
  error: "Critical",
};

function WolfCoreNodeComponent({ state }: { state: SystemState }) {
  const uid = useId().replace(/:/g, "");

  const wolfCoreGradient = `wolfCoreGradient-${uid}`;
  const wolfFacetGradient = `wolfFacetGradient-${uid}`;
  const wolfGlow = `wolfGlow-${uid}`;
  return (
    <div className={`eco-card wolf-card eco-${state}`}>
      {/* ========================= */}
      {/* 🧠 IMAGE DEPTH LAYER */}
      {/* ========================= */}
      <div className="wolf-depth-layer eco-depth-layer">
        {state === "processing" ? (
          <video
            src={cwolfProcessingVideo}
            className="wolf-depth-image wolf-depth-video"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
          />
        ) : (
          <img
            src={cwolfIdle}
            className="wolf-depth-image"
            alt="Wolf-Core Depth"
          />
        )}
      </div>

      {/* ========================= */}
      {/* 🎨 SVG OVERLAY LAYER */}
      {/* ========================= */}
      <div className="eco-visual-layer">
        <svg viewBox="0 0 24 26" className="eco-svg wolf-svg" aria-hidden="true">

        <defs>
          <radialGradient id={wolfCoreGradient} cx="50%" cy="40%" r="72%">
            <stop offset="0%" stopColor="#02060d" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#0a1a2e" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#00f2fe" stopOpacity="0.25" />
          </radialGradient>

          <linearGradient id={wolfFacetGradient} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#b8eeff" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#00b9ff" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#070d1c" stopOpacity="0.15" />
          </linearGradient>

          <filter id={wolfGlow} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* PLATFORM RINGS */}
        <g className="platform-rings" opacity="0.25">
          <ellipse cx="12" cy="23.6" rx="9.2" ry="1.5" fill="none" stroke="currentColor" strokeWidth="0.35" />
          <ellipse cx="12" cy="23.6" rx="6.8" ry="1.1" fill="none" stroke="currentColor" strokeWidth="0.25" />
          <ellipse cx="12" cy="23.6" rx="4.5" ry="0.8" fill="none" stroke="currentColor" strokeWidth="0.2" />
        </g>

        {/* LIGHT OVERLAY (NEW DEPTH TRICK) */}
        <g className="wolf-light-pass" opacity="0.35">
          <path d="M4 12 L12 6 L20 12" fill="none" stroke="white" strokeWidth="0.4" />
        </g>

        {/* ENERGY CORE */}
        <g filter={`url(#${wolfGlow})`}>
          <polygon className="wolf-ear" points="4,12 7.1,2 10,10.8" fill={`url(#${wolfCoreGradient})`} />
          <polygon className="wolf-ear" points="20,12 16.9,2 14,10.8" fill={`url(#${wolfCoreGradient})`} />

          <polygon
            className="wolf-face"
            points="4,12 20,12 18.5,19.2 13,24 11,24 5.5,19.2"
            fill={`url(#${wolfCoreGradient})`}
          />

          <polygon
            className="wolf-face-facet"
            points="8.2,14.1 12,12.9 15.8,14.1 14.4,17.2 9.6,17.2"
            fill={`url(#${wolfFacetGradient})`}
          />

          <polyline className="wolf-facet" points="6.3,13.5 9.4,16.2 12,15 14.6,16.2 17.7,13.5" />
          <polyline className="wolf-facet" points="7.1,17.8 10.1,20.3 12,19.2 13.9,20.3 16.9,17.8" />

          <circle className="wolf-eye" cx="9.3" cy="16" r="1.2" />
          <circle className="wolf-eye" cx="14.7" cy="16" r="1.2" />

          <polygon className="wolf-nose" points="11.4,20.9 12,22.3 12.6,20.9" />

          <path className="wolf-edge" d="M5.3 12.5L9.1 8.2L14.9 8.2L18.7 12.5" />
        </g>

        {state === "processing" && (
          <g className="howl-animation">
            <path
              className="howl-wave howl-wave-1"
              d="M 12,17 Q 12,12 12,8"
              stroke="currentColor"
              strokeWidth="0.5"
              fill="none"
              opacity="0"
            />
            <path
              className="howl-wave howl-wave-2"
              d="M 10,16 Q 10,12 10,8"
              stroke="currentColor"
              strokeWidth="0.5"
              fill="none"
              opacity="0"
            />
            <path
              className="howl-wave howl-wave-3"
              d="M 14,16 Q 14,12 14,8"
              stroke="currentColor"
              strokeWidth="0.5"
              fill="none"
              opacity="0"
            />

            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              const cx = 12;
              const cy = 12;
              return (
                <circle
                  key={angle}
                  className="howl-particle"
                  cx={cx}
                  cy={cy}
                  r="0.4"
                  fill="currentColor"
                  style={
                    {
                      "--particle-x": `${Math.cos(rad) * 8}px`,
                      "--particle-y": `${Math.sin(rad) * 8}px`,
                      animationDelay: `${i * 0.08}s`,
                    } as React.CSSProperties
                  }
                />
              );
            })}
          </g>
        )}
        </svg>
      </div>

      {/* ========================= */}
      {/* META */}
      {/* ========================= */}
      <div className="eco-meta">
        <span className="eco-label">WOLF-CORE</span>
        <span className="eco-status">{STATUS[state]}</span>
      </div>
    </div>
  );
}

WolfCoreNodeComponent.displayName = "WolfCoreNode";

export const WolfCoreNode = React.memo(WolfCoreNodeComponent);
