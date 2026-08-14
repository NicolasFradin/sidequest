const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mascotAPI", {
  onShowExercise: (callback) => {
    ipcRenderer.on("show-exercise", (_event, data) => callback(data));
  },
  onThemeChanged: (callback) => {
    ipcRenderer.on("theme-changed", (_event, theme) => callback(theme));
  },
  markDone: () => ipcRenderer.send("exercise-done"),
  markSkipped: () => ipcRenderer.send("exercise-skipped"),
  openDashboard: () => ipcRenderer.send("open-dashboard"),
});
