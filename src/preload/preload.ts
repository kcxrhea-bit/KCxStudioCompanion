import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("kcxApi", {
  getState: () => ipcRenderer.invoke("state:get"),
  saveState: (nextState: unknown) => ipcRenderer.invoke("state:save", nextState),
  getReleaseInfo: () => ipcRenderer.invoke("app:releaseInfo"),
  clearDiagnosticLogs: () => ipcRenderer.invoke("diagnostics:clear-logs"),
  runCommand: (request: unknown) => ipcRenderer.invoke("cmd:run", request),
  startOllama: () => ipcRenderer.invoke("ollama:start"),
  stopOllama: () => ipcRenderer.invoke("ollama:stop"),
  scanProject: (rootPath: string) => {
    console.log("[preload] scanProject called", rootPath);
    return ipcRenderer.invoke("project:scan", rootPath);
  },
  testProviderConnection: (provider: unknown) => ipcRenderer.invoke("provider:test", provider),
  onBuildOutputLine: (callback: (event: any) => void) => {
    const listener = (_event: unknown, payload: any) => {
      console.log('[preload] build-output-line received:', JSON.stringify(payload));
      const safePayload = {
        id: payload?.id || `build-${Date.now()}-${Math.random()}`,
        at: payload?.at || new Date().toISOString(),
        label: payload?.label || '',
        level: payload?.level || 'info'
      };
      console.log('[preload] forwarding safePayload:', JSON.stringify(safePayload));
      callback(safePayload);
    };
    ipcRenderer.on("build-output-line", listener);
    return () => ipcRenderer.removeListener("build-output-line", listener);
  }
});
