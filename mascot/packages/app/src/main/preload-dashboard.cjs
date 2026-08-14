const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("dashboardAPI", {
  getSettings: () => ipcRenderer.invoke("dashboard:get-settings"),
  updateSettings: (partial) => ipcRenderer.invoke("dashboard:update-settings", partial),
  getSessions: () => ipcRenderer.invoke("dashboard:get-sessions"),
  getStreak: () => ipcRenderer.invoke("dashboard:get-streak"),
  getExercises: () => ipcRenderer.invoke("dashboard:get-exercises"),
});
