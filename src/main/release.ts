import { app, dialog } from "electron";
import fs from "node:fs";
import path from "node:path";

export type ReleaseSettings = {
  diagnosticsEnabled: boolean;
  telemetryEnabled: boolean;
  experimentalFeaturesEnabled: boolean;
  backupOnSave: boolean;
  buildChannel: "private-beta" | "public-beta" | "stable";
  updateChannel: "manual" | "beta" | "stable";
};

export type LicenseState = {
  mode: "community" | "trial" | "licensed";
  licenseKeyHash: string;
  entitlements: string[];
  cloudAccountId?: string;
  lastValidatedAt?: string;
};

export const defaultReleaseSettings: ReleaseSettings = {
  diagnosticsEnabled: true,
  telemetryEnabled: false,
  experimentalFeaturesEnabled: false,
  backupOnSave: true,
  buildChannel: "private-beta",
  updateChannel: "manual"
};

export const defaultLicenseState: LicenseState = {
  mode: "community",
  licenseKeyHash: "",
  entitlements: ["local_orchestration", "project_memory", "manual_provider_routing"]
};

export const getReleaseInfo = () => ({
  productName: app.getName(),
  version: app.getVersion(),
  electron: process.versions.electron,
  chrome: process.versions.chrome,
  node: process.versions.node,
  platform: process.platform,
  arch: process.arch,
  channel: defaultReleaseSettings.buildChannel,
  packaged: app.isPackaged
});

export const ensureUserDataReady = (): { ok: boolean; diagnosticsPath: string; message: string } => {
  const userData = app.getPath("userData");
  const diagnosticsPath = path.join(userData, "logs");
  try {
    fs.mkdirSync(userData, { recursive: true });
    fs.mkdirSync(diagnosticsPath, { recursive: true });
    fs.accessSync(userData, fs.constants.R_OK | fs.constants.W_OK);
    return { ok: true, diagnosticsPath, message: "Storage ready." };
  } catch (error) {
    return { ok: false, diagnosticsPath, message: error instanceof Error ? error.message : String(error) };
  }
};

export const appendDiagnosticLog = (message: string): void => {
  try {
    const ready = ensureUserDataReady();
    if (!ready.ok) return;
    const line = `[${new Date().toISOString()}] ${message.replace(/\r?\n/g, " ")}\n`;
    fs.appendFileSync(path.join(ready.diagnosticsPath, "runtime.log"), line, "utf8");
  } catch {
    // Diagnostics must never block app startup.
  }
};

export const clearDiagnosticLogs = (): { ok: boolean; error?: string } => {
  try {
    const ready = ensureUserDataReady();
    if (!ready.ok) return { ok: false, error: ready.message };
    const runtimeLogPath = path.join(ready.diagnosticsPath, "runtime.log");
    if (fs.existsSync(runtimeLogPath)) fs.writeFileSync(runtimeLogPath, "", "utf8");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
};

export const showSafeFailureDialog = (title: string, detail: string): void => {
  dialog.showMessageBox({
    type: "warning",
    title,
    message: title,
    detail,
    buttons: ["Continue"],
    defaultId: 0
  }).catch(() => undefined);
};
