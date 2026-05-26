import { Theme } from "./types";

export const tronLegacyTheme: Theme = {
  id: "grid-zero",
  name: "Grid Zero",
  colors: {
    background: {
      primary: "#000000",
      secondary: "#000510",
      tertiary: "#000a15",
      gradient:
        "radial-gradient(ellipse at 20% 30%, rgba(0, 100, 200, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(0, 150, 255, 0.06) 0%, transparent 50%), linear-gradient(180deg, #000000 0%, #000510 40%, #000a15 100%)"
    },
    accent: {
      primary: "#00D4FF",
      secondary: "#FF0080",
      tertiary: "#FF6600"
    },
    text: {
      primary: "#00D4FF",
      secondary: "#FF0080",
      label: "rgba(0, 212, 255, 0.6)",
      muted: "rgba(255, 255, 255, 0.4)",
      data: "#FF0080"
    },
    border: {
      default: "rgba(0, 200, 255, 0.15)",
      active: "rgba(0, 200, 255, 0.4)",
      glow: "rgba(0, 200, 255, 0.8)"
    },
    glow: {
     primary: 'rgba(0, 212, 255, 0.8)',    
     secondary: 'rgba(255, 0, 128, 0.8)',  
     intensity: 1.5,                        
   },
    status: {
      success: "#00f2fe",
      warning: "#ff8800",
      error: "#ff3d3d",
      info: "#00D4FF",
      processing: "#ff007f",
      active: "#ff007f"
    }
  },
  effects: {
    glassMorphism: true,
    glowEffects: true,
    animations: "full",
    backdropBlur: 20,
    borderRadius: 8
  },
  typography: {
    fontFamily: {
      primary:
        "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      monospace: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace"
    },
    letterSpacing: {
      tight: "0.02em",
      normal: "0.05em",
      wide: "0.1em",
      extraWide: "0.15em"
    },
    textShadow: {
      glow: "0 0 20px var(--glow-primary), 0 0 40px var(--glow-primary)",
      depth: "0 2px 4px rgba(0, 0, 0, 0.8)"
    }
  },
  spacing: {
    unit: 4
  }
};
