export interface Theme {
  id: string;
  name: string;
  colors: {
    background: {
      primary: string;
      secondary: string;
      tertiary: string;
      gradient?: string;
    };
    accent: {
      primary: string;
      secondary: string;
      tertiary: string;
    };
    text: {
      primary: string;
      secondary: string;
      label: string;
      muted: string;
      data: string;
    };
    border: {
      default: string;
      active: string;
      glow: string;
    };
    glow: {
      primary: string;
      secondary: string;
      intensity: number;
    };
    status: {
      success: string;
      warning: string;
      error: string;
      info: string;
      processing?: string;
      active?: string;
    };
  };
  effects: {
    glassMorphism: boolean;
    glowEffects: boolean;
    animations: "full" | "reduced" | "none";
    backdropBlur: number;
    borderRadius: number;
  };
  typography: {
    fontFamily: {
      primary: string;
      monospace: string;
    };
    letterSpacing: {
      tight: string;
      normal: string;
      wide: string;
      extraWide: string;
    };
    textShadow: {
      glow: string;
      depth: string;
    };
  };
  spacing: {
    unit: number;
  };
}
