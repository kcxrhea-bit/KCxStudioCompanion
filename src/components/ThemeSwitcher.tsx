import React from "react";
import { useTheme } from "../context/ThemeContext";

export const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme, availableThemes } = useTheme();

  return (
    <div className="theme-switcher panel-secondary edge-glow-top">
      <label className="theme-switcher-label text-label" htmlFor="theme-switcher-select">
        Visual Theme
      </label>
      <select
        id="theme-switcher-select"
        value={theme.id}
        onChange={(e) => setTheme(e.target.value)}
        className="theme-switcher-select"
      >
        {availableThemes.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
};
