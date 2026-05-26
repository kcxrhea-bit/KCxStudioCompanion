import React from "react";

export function DashboardBackground() {
  return (
    <div className="dashboard-bg" aria-hidden="true">
      <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <defs>
          <radialGradient id="db-cyan-pool" cx="50%" cy="42%" r="52%">
            <stop offset="0%" stopColor="#00ffff" stopOpacity="0.055" />
            <stop offset="100%" stopColor="#00ffff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="db-mag-l" cx="8%" cy="10%" r="55%">
            <stop offset="0%" stopColor="#ff00ff" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#ff00ff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="db-mag-r" cx="92%" cy="90%" r="55%">
            <stop offset="0%" stopColor="#ff00ff" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#ff00ff" stopOpacity="0" />
          </radialGradient>
          <filter id="db-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="db-core-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Ambient pools */}
        <rect width="1600" height="900" fill="url(#db-cyan-pool)" />
        <rect width="1600" height="900" fill="url(#db-mag-l)" />
        <rect width="1600" height="900" fill="url(#db-mag-r)" />

        {/* === Central triangle geometry — wolf/icon echo === */}
        <g transform="translate(800,370)">
          {/* Outermost orbit */}
          <circle cx="0" cy="0" r="310" fill="none" stroke="#ff00ff" strokeWidth="0.4" strokeOpacity="0.045" />
          {/* Outer orbit */}
          <circle cx="0" cy="0" r="240" fill="none" stroke="#00ffff" strokeWidth="0.45" strokeOpacity="0.07" />
          {/* Mid orbit */}
          <circle cx="0" cy="0" r="168" fill="none" stroke="#00ffff" strokeWidth="0.4" strokeOpacity="0.06" />

          {/* Outer triangle — R=220 */}
          <polygon
            points="800,140 990,470 610,470"
            transform="translate(-800,-370)"
            fill="none" stroke="#00ffff" strokeWidth="0.75" strokeOpacity="0.13"
          />
          {/* Middle triangle — R=148 */}
          <polygon
            points="800,222 928,436 672,436"
            transform="translate(-800,-370)"
            fill="none" stroke="#00ffff" strokeWidth="0.6" strokeOpacity="0.10"
          />
          {/* Inner triangle — magenta — R=80 */}
          <polygon
            points="800,290 869,402 731,402"
            transform="translate(-800,-370)"
            fill="none" stroke="#ff00ff" strokeWidth="0.75" strokeOpacity="0.14"
          />

          {/* Radial spokes from center */}
          <line x1="0" y1="0" x2="0" y2="-230" stroke="#00ffff" strokeWidth="0.35" strokeOpacity="0.06" />
          <line x1="0" y1="0" x2="199" y2="115" stroke="#00ffff" strokeWidth="0.35" strokeOpacity="0.06" />
          <line x1="0" y1="0" x2="-199" y2="115" stroke="#00ffff" strokeWidth="0.35" strokeOpacity="0.06" />

          {/* Core node */}
          <circle cx="0" cy="0" r="4" fill="#00ffff" fillOpacity="0.45" filter="url(#db-core-glow)" />
          <circle cx="0" cy="0" r="1.5" fill="#00ffff" fillOpacity="0.9" />
        </g>

        {/* === HUD corner brackets === */}
        <g stroke="#00ffff" strokeWidth="1.1" fill="none" strokeOpacity="0.52" filter="url(#db-glow)">
          <path d="M 36 36 L 36 88 M 36 36 L 88 36" />
          <path d="M 1564 36 L 1564 88 M 1564 36 L 1512 36" />
          <path d="M 36 864 L 36 812 M 36 864 L 88 864" />
          <path d="M 1564 864 L 1564 812 M 1564 864 L 1512 864" />
        </g>

        {/* === Left HUD readout panel === */}
        <g stroke="#00ffff" strokeWidth="0.45" strokeOpacity="0.22">
          {([340, 382, 424, 466, 508, 550, 592] as const).map((y, i) => {
            const len = [200, 155, 182, 140, 170, 150, 188][i];
            return (
              <g key={y}>
                <line x1="68" y1={y} x2={68 + len} y2={y} />
                <circle cx="68" cy={y} r="2.2" fill="#00ffff" fillOpacity="0.38" stroke="none" />
              </g>
            );
          })}
          <line x1="68" y1="325" x2="68" y2="610" strokeOpacity="0.12" />
        </g>

        {/* === Right HUD readout panel === */}
        <g stroke="#00ffff" strokeWidth="0.45" strokeOpacity="0.22">
          {([340, 382, 424, 466, 508, 550, 592] as const).map((y, i) => {
            const len = [200, 155, 182, 140, 170, 150, 188][i];
            return (
              <g key={y}>
                <line x1={1532} y1={y} x2={1532 - len} y2={y} />
                <circle cx={1532} cy={y} r="2.2" fill="#00ffff" fillOpacity="0.38" stroke="none" />
              </g>
            );
          })}
          <line x1="1532" y1="325" x2="1532" y2="610" strokeOpacity="0.12" />
        </g>

        {/* === Top horizontal rule === */}
        <g stroke="#00ffff" strokeOpacity="0.18">
          <line x1="68" y1="118" x2="1532" y2="118" strokeWidth="0.45" />
          <line x1="800" y1="111" x2="800" y2="125" strokeWidth="0.9" />
          <line x1="400" y1="114" x2="400" y2="122" strokeWidth="0.7" />
          <line x1="1200" y1="114" x2="1200" y2="122" strokeWidth="0.7" />
          <circle cx="600" cy="118" r="1.8" fill="#00ffff" fillOpacity="0.35" stroke="none" />
          <circle cx="1000" cy="118" r="1.8" fill="#00ffff" fillOpacity="0.35" stroke="none" />
        </g>

        {/* === Bottom horizontal rule === */}
        <g stroke="#00ffff" strokeOpacity="0.18">
          <line x1="68" y1="762" x2="1532" y2="762" strokeWidth="0.45" />
          <circle cx="400" cy="762" r="2" fill="#00ffff" fillOpacity="0.3" stroke="none" />
          <circle cx="800" cy="762" r="2" fill="#00ffff" fillOpacity="0.3" stroke="none" />
          <circle cx="1200" cy="762" r="2" fill="#00ffff" fillOpacity="0.3" stroke="none" />
        </g>

        {/* === Left vertical accent === */}
        <line x1="66" y1="128" x2="66" y2="752" stroke="#00ffff" strokeWidth="0.35" strokeOpacity="0.11" />
        {/* === Right vertical accent === */}
        <line x1="1534" y1="128" x2="1534" y2="752" stroke="#00ffff" strokeWidth="0.35" strokeOpacity="0.11" />

        {/* === Magenta hex node — lower-left === */}
        <g fill="none" stroke="#ff00ff" strokeOpacity="0.17">
          <polygon points="148,668 166,658 166,678 148,688 130,678 130,658" strokeWidth="0.8" />
          <polygon points="148,668 184,648 184,688 148,708 112,688 112,648" strokeWidth="0.55" />
        </g>

        {/* === Magenta hex node — upper-right === */}
        <g fill="none" stroke="#ff00ff" strokeOpacity="0.17">
          <polygon points="1452,232 1470,222 1470,242 1452,252 1434,242 1434,222" strokeWidth="0.8" />
          <polygon points="1452,232 1488,212 1488,252 1452,272 1416,252 1416,212" strokeWidth="0.55" />
        </g>

        {/* === Connection lines from hex nodes to composition === */}
        <line
          x1="184" y1="658" x2="610" y2="460"
          stroke="#ff00ff" strokeWidth="0.35" strokeOpacity="0.07"
          strokeDasharray="5,12"
        />
        <line
          x1="1416" y1="242" x2="990" y2="400"
          stroke="#ff00ff" strokeWidth="0.35" strokeOpacity="0.07"
          strokeDasharray="5,12"
        />
      </svg>
    </div>
  );
}
