const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mascotAPI", {
  onShowExercise: (callback) => {
    ipcRenderer.on("show-exercise", (_event, data) => callback(data));
  },
  onThemeChanged: (callback) => {
    ipcRenderer.on("theme-changed", (_event, theme) => callback(theme));
  },
  onLanguageChanged: (callback) => {
    ipcRenderer.on("language-changed", (_event, language) => callback(language));
  },
  onMilestoneReached: (callback) => {
    ipcRenderer.on("milestone-reached", (_event, data) => callback(data));
  },
  markDone: () => ipcRenderer.send("exercise-done"),
  markSkipped: () => ipcRenderer.send("exercise-skipped"),
  openDashboard: () => ipcRenderer.send("open-dashboard"),
});
