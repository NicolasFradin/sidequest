import { app, BrowserWindow, Tray, Menu, screen, nativeImage, ipcMain, globalShortcut } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { Scheduler, Storage, loadPack, pickRandomExercise } from "@mascot/core";

app.setName("Mascot Coach");
// App tray-only en arrière-plan : pas de menu applicatif par défaut. Ça évite aussi les
// raccourcis clavier par défaut d'Electron (Cmd+W, Cmd+Q...) qui détruiraient nos fenêtres
// au lieu de les masquer — seul "Quitter" dans le tray doit pouvoir terminer le process.
Menu.setApplicationMenu(null);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(__dirname, "..", "..", "assets");
const OVERLAY_DIR = path.join(__dirname, "..", "overlay");
const DASHBOARD_DIR = path.join(__dirname, "..", "dashboard");
const DASHBOARD_SHORTCUT = "CommandOrControl+Shift+M";

let tray = null;
let overlayWindow = null;
let dashboardWindow = null;
let isQuitting = false;
/** @type {import('@mascot/core').Storage} */
let storage = null;
/** @type {import('@mascot/core').Scheduler} */
let scheduler = null;
let currentExercise = null;
let currentMascot = null;
let currentMode = null;
let currentBlocking = false;

let overlayReady = false;
let pendingPayload = null;

function createOverlayWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const winWidth = 320;
  const winHeight = 400;

  overlayWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: width - winWidth - 24,
    y: height - winHeight - 24,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    movable: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  overlayWindow.webContents.on("preload-error", (event, preloadPath, error) => {
    console.log(`[preload error] ${preloadPath}: ${error}`);
  });

  // Comme pour le dashboard : fermer la fenêtre (ex. Cmd+W si elle a le focus) la masque
  // seulement, elle ne doit jamais être détruite tant que l'app tourne — sauf quand c'est
  // app.quit() lui-même qui ferme les fenêtres (sinon "Quitter" ne peut jamais aboutir).
  overlayWindow.on("close", (event) => {
    if (isQuitting) return;
    event.preventDefault();
    overlayWindow.hide();
  });

  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  overlayWindow.webContents.once("did-finish-load", () => {
    overlayReady = true;
    if (pendingPayload) {
      overlayWindow.webContents.send("show-exercise", pendingPayload);
      if (pendingPayload.blocking) {
        overlayWindow.show();
      } else {
        overlayWindow.showInactive();
      }
      pendingPayload = null;
    }
  });

  overlayWindow.loadFile(path.join(OVERLAY_DIR, "index.html"));
}

function createDashboardWindow() {
  dashboardWindow = new BrowserWindow({
    width: 960,
    height: 640,
    minWidth: 720,
    minHeight: 480,
    title: "Mascot Coach",
    show: false,
    backgroundColor: "#0b0e1a",
    webPreferences: {
      preload: path.join(__dirname, "preload-dashboard.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Fermer la fenêtre (croix) la masque seulement — l'app reste active en tray. Idem que
  // pour l'overlay : on laisse passer si c'est app.quit() qui est en train de fermer.
  dashboardWindow.on("close", (event) => {
    if (isQuitting) return;
    event.preventDefault();
    dashboardWindow.hide();
  });

  dashboardWindow.loadFile(path.join(DASHBOARD_DIR, "index.html"));
}

function showDashboard() {
  dashboardWindow.show();
  dashboardWindow.focus();
}

function toggleDashboard() {
  if (dashboardWindow.isVisible()) {
    dashboardWindow.hide();
  } else {
    showDashboard();
  }
}

/** @returns {string | null} message d'avertissement si l'OS a refusé, sinon null */
function applyAutolaunch(enabled) {
  try {
    if (process.platform === "darwin" || process.platform === "win32") {
      app.setLoginItemSettings({ openAtLogin: enabled });
      // setLoginItemSettings échoue parfois silencieusement côté OS (pas d'exception JS levée) —
      // on relit l'état réel pour détecter un refus (ex: app non signée en mode dev sur macOS).
      const actual = app.getLoginItemSettings().openAtLogin;
      if (actual !== enabled) {
        console.warn(`[autolaunch] refusé par l'OS (voulu: ${enabled}, obtenu: ${actual})`);
        return "Réglage enregistré, mais macOS a refusé l'activation du lancement au démarrage en mode développement (ça fonctionnera une fois l'app empaquetée).";
      }
      return null;
    }
    if (process.platform === "linux") {
      const autostartDir = path.join(homedir(), ".config", "autostart");
      const desktopFilePath = path.join(autostartDir, "mascot-coach.desktop");
      if (enabled) {
        mkdirSync(autostartDir, { recursive: true });
        writeFileSync(
          desktopFilePath,
          `[Desktop Entry]\nType=Application\nName=Mascot Coach\nExec=${process.execPath}\nX-GNOME-Autostart-enabled=true\n`
        );
      } else if (existsSync(desktopFilePath)) {
        unlinkSync(desktopFilePath);
      }
    }
    return null;
  } catch (error) {
    // macOS refuse cet appel pour une app non signée / lancée hors de /Applications (mode dev) —
    // ça fonctionnera normalement une fois l'app empaquetée et signée (Sprint 5).
    console.warn("[autolaunch] refusé par l'OS :", error.message);
    return "Réglage enregistré, mais macOS a refusé l'activation du lancement au démarrage en mode développement (ça fonctionnera une fois l'app empaquetée).";
  }
}

function showExercise() {
  const settings = storage.getSettings();
  const pack = loadPack(settings.activeProgram);
  const exercise = pickRandomExercise(pack);
  const debt = storage.getDebt();
  // gate = toujours bloquant. mixed = bloquant seulement si on a trop esquivé (dette > 0),
  // sinon aussi souple que notify. notify = jamais bloquant.
  const blocking = settings.mode === "gate" || (settings.mode === "mixed" && debt > 0);

  currentExercise = exercise;
  currentMascot = settings.activeMascot;
  currentMode = settings.mode;
  currentBlocking = blocking;

  const payload = {
    exercise,
    mascot: settings.activeMascot,
    mode: settings.mode,
    theme: settings.theme,
    blocking,
  };

  if (!overlayReady) {
    // La fenêtre overlay n'a pas fini son premier chargement (cas rare, ex: triggerNow()
    // appelé juste après le démarrage de l'app) — on met en attente, did-finish-load enverra.
    pendingPayload = payload;
    return;
  }

  overlayWindow.webContents.send("show-exercise", payload);
  if (blocking) {
    overlayWindow.show();
  } else {
    overlayWindow.showInactive();
  }
}

function recordAndHide(status) {
  if (!currentExercise) return;
  if (status === "skipped" && currentBlocking) {
    // Filet de sécurité : le bouton "Passer" est masqué côté overlay en mode bloquant,
    // mais on ignore quand même un éventuel skip pour ne pas casser la garantie de blocage.
    return;
  }
  storage.recordSession({
    timestamp: new Date().toISOString(),
    exerciseId: currentExercise.id,
    status,
    triggerType: "timer",
    verified: false,
    // Filet de sécurité : mascot/mode ne devraient jamais être null ici (toujours réglés en
    // même temps que currentExercise dans showExercise()), mais ces colonnes sont NOT NULL —
    // mieux vaut un fallback silencieux qu'un crash de l'app sur un état inattendu.
    mascot: currentMascot ?? storage.getSettings().activeMascot,
    mode: currentMode ?? storage.getSettings().mode,
  });
  currentExercise = null;
  currentMascot = null;
  currentMode = null;
  currentBlocking = false;
  overlayWindow.hide();
}

function createTray() {
  const iconPath = path.join(ASSETS_DIR, "tray-icon.png");
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 18, height: 18 });
  icon.setTemplateImage(true); // s'adapte au mode clair/sombre de la menu bar macOS
  tray = new Tray(icon);
  tray.setToolTip("Mascot Coach");
  // Le clic gauche sur l'icône tray n'ouvre plus le dashboard automatiquement — seul
  // "Ouvrir le dashboard" dans le menu (clic droit), le raccourci clavier ou l'icône ⚙
  // de l'overlay le font.
  buildTrayMenu();
}

function buildTrayMenu() {
  const menu = Menu.buildFromTemplate([
    {
      label: "Ouvrir le dashboard",
      click: () => showDashboard(),
    },
    { type: "separator" },
    {
      label: "Déclencher un exercice maintenant",
      click: () => scheduler.triggerNow(),
    },
    {
      label: "Mettre en pause",
      type: "checkbox",
      id: "pause",
      click: (item) => {
        if (item.checked) {
          scheduler.stop();
        } else {
          scheduler.start();
        }
      },
    },
    { type: "separator" },
    {
      label: `Streak actuel : ${storage.getCurrentStreak()} jour(s)`,
      enabled: false,
    },
    { type: "separator" },
    { label: "Quitter", click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
}

// Une seule instance de l'app à la fois : si on la relance alors qu'elle tourne déjà,
// on ramène le dashboard existant au premier plan plutôt que d'ouvrir un doublon.
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (dashboardWindow) showDashboard();
  });

  app.whenReady().then(() => {
    const dbPath = path.join(app.getPath("userData"), "mascot.sqlite");
    storage = new Storage(dbPath);
    const settings = storage.getSettings();
    const isFirstLaunch = !storage.hasBeenConfigured();

    createOverlayWindow();
    createDashboardWindow();
    createTray();

    globalShortcut.register(DASHBOARD_SHORTCUT, () => toggleDashboard());

    scheduler = new Scheduler({
      intervalMinutes: settings.intervalMinutes,
      onTrigger: showExercise,
    });
    scheduler.start();

    if (process.env.MASCOT_DEBUG_TRIGGER_ON_START === "1") {
      scheduler.triggerNow();
    }

    if (process.platform === "darwin" && app.dock && !app.isPackaged) {
      // Uniquement en dev (`electron .`) : l'app packagée a déjà la bonne icône via son
      // .icns (fiable, bundle statique) — appeler setIcon() dessus l'écrase par un mécanisme
      // runtime plus fragile qui finit par disparaître. En dev, l'icône générique Electron
      // est remplacée par la mascotte (best-effort, peut être capricieux selon le cache
      // d'icônes du Dock macOS — sans impact sur l'app packagée, ce qui compte vraiment).
      app.dock.setIcon(path.join(ASSETS_DIR, "mascots", "ronnie-coleman.png"));
    }

    // Premier lancement : le dashboard s'ouvre automatiquement (onboarding, cf. Sprint 3.5).
    if (isFirstLaunch) {
      dashboardWindow.once("ready-to-show", () => showDashboard());
    }

    ipcMain.on("exercise-done", () => recordAndHide("done"));
    ipcMain.on("exercise-skipped", () => recordAndHide("skipped"));
    ipcMain.on("open-dashboard", () => showDashboard());

    ipcMain.handle("dashboard:get-settings", () => ({ ...storage.getSettings(), isFirstLaunch }));
    ipcMain.handle("dashboard:update-settings", (_event, partial) => {
      const next = storage.updateSettings(partial);
      if (partial.intervalMinutes !== undefined) {
        scheduler.updateInterval(next.intervalMinutes);
      }
      let autolaunchWarning = null;
      if (partial.autolaunch !== undefined) {
        autolaunchWarning = applyAutolaunch(next.autolaunch);
      }
      if (partial.theme !== undefined) {
        // Diffusé même si l'overlay est masquée, pour qu'elle soit déjà à jour au prochain
        // déclenchement — et se met à jour en direct si elle est affichée au moment du switch.
        overlayWindow.webContents.send("theme-changed", next.theme);
      }
      return { ...next, autolaunchWarning };
    });
    ipcMain.handle("dashboard:get-sessions", () => storage.getSessions());
    ipcMain.handle("dashboard:get-streak", () => storage.getCurrentStreak());
    ipcMain.handle("dashboard:get-exercises", () => loadPack(storage.getSettings().activeProgram).exercises);
    ipcMain.handle("dashboard:get-debt", () => storage.getDebt());
    ipcMain.on("dashboard:trigger-exercise", () => scheduler.triggerNow());
  });

  app.on("before-quit", () => {
    isQuitting = true;
  });

  app.on("will-quit", () => {
    globalShortcut.unregisterAll();
  });

  // L'app tourne en arrière-plan : fermer une fenêtre ne quitte jamais l'app.
  // Seul "Quitter" dans le menu tray (app.quit()) termine le process.
  app.on("window-all-closed", (event) => {
    event.preventDefault();
  });
}
