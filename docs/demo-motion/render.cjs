// Renders index.html frame by frame (deterministic seek(t)) into PNGs, using the Electron
// binary already installed for the app. Usage, from sidequest/packages/app:
//   npx electron ../../../docs/demo-motion/render.cjs <outDir> [fps]
// then assemble with ffmpeg (see README.md next to this file).
const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");

const outDir = path.resolve(process.argv[2] || "frames");
const fps = Number(process.argv[3] || 15);

app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const win = new BrowserWindow({
    width: 960, height: 600, show: false, useContentSize: true,
    webPreferences: { offscreen: true, zoomFactor: 1 },
  });
  await win.loadFile(path.join(__dirname, "index.html"), { search: "render" });
  await win.webContents.executeJavaScript("document.fonts.ready.then(() => Promise.all([...document.images].map(i => i.decode().catch(() => {}))))");
  const duration = await win.webContents.executeJavaScript("window.DURATION");
  const total = Math.round(duration * fps);
  for (let i = 0; i < total; i++) {
    await win.webContents.executeJavaScript(`seek(${i / fps}); new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`);
    const img = await win.webContents.capturePage({ x: 0, y: 0, width: 960, height: 600 });
    fs.writeFileSync(path.join(outDir, `f${String(i).padStart(4, "0")}.png`), img.resize({ width: 960, height: 600 }).toPNG());
  }
  console.log(`rendered ${total} frames to ${outDir}`);
  app.quit();
});
