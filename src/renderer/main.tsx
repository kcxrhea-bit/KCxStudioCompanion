import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { ThemeProvider } from "../context/ThemeContext";
import "../styles/typography.css";
import "../styles/materials.css";
import "../styles/components.css";
import "../styles/background.css";
import "../styles/themeSwitcher.css";
import './styles/grid-zero.css';

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
