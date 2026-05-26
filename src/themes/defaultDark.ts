import { Theme } from "./types";

export const defaultDarkTheme: Theme = {
  id: "default-dark",
  name: "Default Dark",
  colors: {
    background: {
      primary: "#0a0a0a",
      secondary: "#141414",
      tertiary: "#1e1e1e",
      gradient: "linear-gradient(180deg, #0a0a0a 0%, #000000 100%)"
    },
    accent: {
      primary: "#3b82f6",
      secondary: "#8b5cf6",
      tertiary: "#f59e0b"
    },
    text: {
      primary: "#ffffff",
      secondary: "#d1d5db",
      label: "#9ca3af",
      muted: "#6b7280",
      data: "#ffffff"
    },
    border: {
      default: "rgba(255, 255, 255, 0.1)",
      active: "rgba(59, 130, 246, 0.4)",
      glow: "rgba(59, 130, 246, 0.6)"
    },
    glow: {
      primary: "rgba(59, 130, 246, 0.3)",
      secondary: "rgba(139, 92, 246, 0.3)",
      intensity: 0.5
    },
    status: {
      success: "#00f2fe",
      warning: "#ff8800",
      error: "#ff3d3d",
      info: "#3b82f6",
      processing: "#ff007f",
      active: "#ff007f"
    }
  },
  effects: {
    glassMorphism: false,
    glowEffects: false,
    animations: "reduced",
    backdropBlur: 0,
    borderRadius: 6
  },
  typography: {
    fontFamily: {
      primary:
        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      monospace: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace"
    },
    letterSpacing: {
      tight: "0",
      normal: "0.01em",
      wide: "0.05em",
      extraWide: "0.1em"
    },
    textShadow: {
      glow: "none",
      depth: "0 1px 2px rgba(0, 0, 0, 0.5)"
    }
  },
  spacing: {
    unit: 4
  }
};
