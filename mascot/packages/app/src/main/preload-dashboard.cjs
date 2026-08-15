const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("dashboardAPI", {
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
});
