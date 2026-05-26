import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Theme } from "../themes/types";
import { tronLegacyTheme } from "../themes/tronLegacy";
import { defaultDarkTheme } from "../themes/defaultDark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (themeId: string) => void;
  availableThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const availableThemes = useMemo(() => [tronLegacyTheme, defaultDarkTheme], []);

  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem("kcx-studio-theme");
    return availableThemes.find((t) => t.id === saved) || tronLegacyTheme;
  });

  const setTheme = (themeId: string) => {
    const newTheme = availableThemes.find((t) => t.id === themeId);
    if (newTheme) {
      setThemeState(newTheme);
      localStorage.setItem("kcx-studio-theme", themeId);
    }
  };

  useEffect(() => {
    const root = document.documentElement;

    root.style.setProperty("--color-bg-primary", theme.colors.background.primary);
    root.style.setProperty("--color-bg-secondary", theme.colors.background.secondary);
    root.style.setProperty("--color-bg-tertiary", theme.colors.background.tertiary);
    root.style.setProperty("--color-bg-gradient", theme.colors.background.gradient || "");

    root.style.setProperty("--color-accent-primary", theme.colors.accent.primary);
    root.style.setProperty("--color-accent-secondary", theme.colors.accent.secondary);
    root.style.setProperty("--color-accent-tertiary", theme.colors.accent.tertiary);

    root.style.setProperty("--color-text-primary", theme.colors.text.primary);
    root.style.setProperty("--color-text-secondary", theme.colors.text.secondary);
    root.style.setProperty("--color-text-label", theme.colors.text.label);
    root.style.setProperty("--color-text-muted", theme.colors.text.muted);
    root.style.setProperty("--color-text-data", theme.colors.text.data);

    root.style.setProperty("--color-border-default", theme.colors.border.default);
    root.style.setProperty("--color-border-active", theme.colors.border.active);
    root.style.setProperty("--color-border-glow", theme.colors.border.glow);

    root.style.setProperty("--glow-primary", theme.colors.glow.primary);
    root.style.setProperty("--glow-secondary", theme.colors.glow.secondary);
    root.style.setProperty("--glow-intensity", theme.colors.glow.intensity.toString());

    root.style.setProperty("--color-status-success", theme.colors.status.success);
    root.style.setProperty("--color-status-warning", theme.colors.status.warning);
    root.style.setProperty("--color-status-error", theme.colors.status.error);
    root.style.setProperty("--color-status-info", theme.colors.status.info);
    root.style.setProperty("--color-status-processing", theme.colors.status.processing || theme.colors.status.warning);
    root.style.setProperty("--color-status-active", theme.colors.status.active || theme.colors.status.processing || theme.colors.status.warning);

    root.style.setProperty("--backdrop-blur", `${theme.effects.backdropBlur}px`);
    root.style.setProperty("--border-radius", `${theme.effects.borderRadius}px`);

    root.style.setProperty("--font-primary", theme.typography.fontFamily.primary);
    root.style.setProperty("--font-mono", theme.typography.fontFamily.monospace);
    root.style.setProperty("--letter-spacing-tight", theme.typography.letterSpacing.tight);
    root.style.setProperty("--letter-spacing-normal", theme.typography.letterSpacing.normal);
    root.style.setProperty("--letter-spacing-wide", theme.typography.letterSpacing.wide);
    root.style.setProperty("--letter-spacing-extra-wide", theme.typography.letterSpacing.extraWide);
    root.style.setProperty("--text-shadow-glow", theme.typography.textShadow.glow);
    root.style.setProperty("--text-shadow-depth", theme.typography.textShadow.depth);

    root.style.setProperty("--spacing-unit", `${theme.spacing.unit}px`);

    const themeClassPrefix = "theme-";
    document.body.classList.forEach((className) => {
      if (className.startsWith(themeClassPrefix)) {
        document.body.classList.remove(className);
      }
    });
    document.body.classList.add(`${themeClassPrefix}${theme.id}`);

    document.body.dataset.glowEffects = theme.effects.glowEffects.toString();
    document.body.dataset.glassMorphism = theme.effects.glassMorphism.toString();
    document.body.dataset.animations = theme.effects.animations;
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, availableThemes }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};
