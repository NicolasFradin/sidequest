const { contextBridge, ipcRenderer, shell, clipboard } = require("electron");

contextBridge.exposeInMainWorld("dashboardAPI", {
  copyToClipboard: (text) => clipboard.writeText(text),
  openExternal: (url) => shell.openExternal(url),
  getSettings: () => ipcRenderer.invoke("dashboard:get-settings"),
  updateSettings: (partial) => ipcRenderer.invoke("dashboard:update-settings", partial),
  getSessions: () => ipcRenderer.invoke("dashboard:get-sessions"),
  getStreak: () => ipcRenderer.invoke("dashboard:get-streak"),
  getExercises: () => ipcRenderer.invoke("dashboard:get-exercises"),
  getDebt: () => ipcRenderer.invoke("dashboard:get-debt"),
  triggerExercise: () => ipcRenderer.send("dashboard:trigger-exercise"),
  isHookInstalled: () => ipcRenderer.invoke("dashboard:hook-is-installed"),
  installHook: () => ipcRenderer.invoke("dashboard:hook-install"),
  uninstallHook: () => ipcRenderer.invoke("dashboard:hook-uninstall"),
  getSides: () => ipcRenderer.invoke("dashboard:get-sides"),
  getSideProgress: (id) => ipcRenderer.invoke("dashboard:get-side-progress", id),
  createSide: (name, exercises) => ipcRenderer.invoke("dashboard:create-side", { name, exercises }),
  updateSide: (id, partial) => ipcRenderer.invoke("dashboard:update-side", { id, partial }),
  deleteSide: (id) => ipcRenderer.invoke("dashboard:delete-side", id),
  exportSide: (id) => ipcRenderer.invoke("dashboard:export-side", id),
  importSide: () => ipcRenderer.invoke("dashboard:import-side"),
  setSideMascotBundled: (sideId, mascotId, label) =>
    ipcRenderer.invoke("dashboard:set-side-mascot-bundled", { sideId, mascotId, label }),
  setSideMascotCustom: (sideId) => ipcRenderer.invoke("dashboard:set-side-mascot-custom", sideId),
  clearSideMascot: (sideId) => ipcRenderer.invoke("dashboard:clear-side-mascot", sideId),
  getLlmStatus: () => ipcRenderer.invoke("dashboard:get-llm-status"),
  setLlmApiKey: (provider, key) => ipcRenderer.invoke("dashboard:set-llm-api-key", { provider, key }),
  testLlmConnection: (provider) => ipcRenderer.invoke("dashboard:test-llm-connection", provider),
  getOllamaModels: (baseUrl) => ipcRenderer.invoke("dashboard:get-ollama-models", baseUrl),
  generateSide: (prompt, mascotDescription) =>
    ipcRenderer.invoke("dashboard:generate-side", { prompt, mascotDescription }),
});
