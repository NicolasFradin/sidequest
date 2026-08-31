import { app, BrowserWindow, Tray, Menu, screen, nativeImage, ipcMain, globalShortcut, dialog, shell, clipboard } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";
import {
  Scheduler,
  Storage,
  loadSide,
  listBundledSides,
  pickRandomExercise,
  parseSideJson,
  translateSide,
  HookServer,
  isInstalled as isClaudeHookInstalled,
  install as installClaudeHook,
  uninstall as uninstallClaudeHook,
  resolveProvider,
  generateSide,
  isClaudeCliAvailable,
  isCodexCliAvailable,
  listOllamaModels,
} from "@sidequest/core";
import { t } from "./i18n.js";
import { isEncryptionAvailable, setApiKey, getApiKey, hasApiKey } from "./llm-credentials.js";

app.setName("SideQuest");
// App tray-only en arrière-plan : pas de menu applicatif par défaut. Ça évite aussi les
// raccourcis clavier par défaut d'Electron (Cmd+W, Cmd+Q...) qui détruiraient nos fenêtres
// au lieu de les masquer — seul "Quitter" dans le tray doit pouvoir terminer le process.
Menu.setApplicationMenu(null);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(__dirname, "..", "..", "assets");
const OVERLAY_DIR = path.join(__dirname, "..", "overlay");
const DASHBOARD_DIR = path.join(__dirname, "..", "dashboard");
const DASHBOARD_SHORTCUT = "CommandOrControl+Shift+M";
const CLAUDE_SETTINGS_PATH = path.join(homedir(), ".claude", "settings.json");
/** Mascottes custom décodées depuis un import de side (voir dashboard:import-side) — jamais le base64 en base SQLite, juste ce chemin. */
const CUSTOM_MASCOTS_DIR = () => path.join(app.getPath("userData"), "custom-mascots");
const MAX_MASCOT_IMAGE_BYTES = 3 * 1024 * 1024;
/** Marge large au-dessus de l'affichage réel (72px) — borne un fichier qui mentirait sur son poids compressé (image massive mais bien compressée) plutôt que de faire confiance au seul poids du fichier. */
const MAX_MASCOT_DIMENSION_PX = 2048;
/** mime -> extension de fichier pour les mascottes custom décodées depuis un data URI base64. */
const MASCOT_MIME_EXTENSIONS = { png: "png", jpeg: "jpg", jpg: "jpg", webp: "webp" };

/**
 * Valide qu'un buffer est *réellement* une image décodable (pas juste un fichier dont
 * l'extension/l'en-tête MIME prétend en être une) et reste sous des bornes raisonnables — poids
 * (déjà vérifié par l'appelant en amont pour éviter de décoder un fichier énorme pour rien) et
 * dimensions en pixels. `nativeImage.createFromBuffer` ne lève jamais d'exception sur un contenu
 * invalide, elle renvoie une image "vide" (`isEmpty()`) — c'est le signal à vérifier.
 */
function isValidMascotImageBuffer(buffer) {
  if (buffer.length === 0 || buffer.length > MAX_MASCOT_IMAGE_BYTES) return false;
  const image = nativeImage.createFromBuffer(buffer);
  if (image.isEmpty()) return false;
  const { width, height } = image.getSize();
  return width > 0 && height > 0 && width <= MAX_MASCOT_DIMENSION_PX && height <= MAX_MASCOT_DIMENSION_PX;
}

let tray = null;
let overlayWindow = null;
let dashboardWindow = null;
let isQuitting = false;
/** @type {import('@sidequest/core').Storage} */
let storage = null;
/** @type {import('@sidequest/core').Scheduler} */
let scheduler = null;
/** @type {import('@sidequest/core').HookServer} */
let hookServer = null;
/** Nombre d'appels du hook reçus depuis le dernier déclenchement (voir hookEveryN) */
let hookCallCount = 0;
/** Timer en attente en mode hookTriggerMode "thinking" (annulé par onTurnEnd si Claude répond vite) */
let pendingThinkingTimer = null;
/** Ne proposer l'exercice en mode "thinking" que si Claude travaille encore après ce délai */
const THINKING_DEBOUNCE_MS = 8000;
/**
 * `respond()` du hook /trigger en attente tant qu'un exercice bloquant qu'il a déclenché n'est
 * pas marqué fait — l'appeler renvoie enfin la réponse HTTP à curl, ce qui rend la main au hook
 * Claude Code (donc à l'utilisateur dans son terminal). Voir showExercise()/recordAndHide().
 */
let pendingHookRespond = null;
let currentExercise = null;
let currentMascot = null;
let currentMode = null;
let currentBlocking = false;
/** Id du side actif au moment du déclenchement — sert à créditer l'XP du bon side dans recordAndHide(). */
let currentSideId = null;
/** XP gagnée par exercice complété ("fait") — formule volontairement plate pour v1, pas de barème par side/exercice. */
const XP_PER_EXERCISE = 10;

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
    title: "SideQuest",
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
      const desktopFilePath = path.join(autostartDir, "sidequest.desktop");
      if (enabled) {
        mkdirSync(autostartDir, { recursive: true });
        writeFileSync(
          desktopFilePath,
          `[Desktop Entry]\nType=Application\nName=SideQuest\nExec=${process.execPath}\nX-GNOME-Autostart-enabled=true\n`
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

/**
 * Résout le programme actif : side custom stocké en base, sinon side JSON livré avec l'app.
 * Replie sur le side par défaut si le résultat n'a aucun exercice (ex. side custom créé mais pas
 * encore rempli, puis activé par erreur) — sinon pickRandomExercise() renvoie `undefined` et bloque
 * silencieusement les boutons Fait/Passer (voire le hook Claude Code en mode bloquant).
 * Traduit selon la langue de l'UI (no-op sur un side custom/importé/généré, qui n'a jamais de
 * champs `*En` — voir translateSide()) : centralisé ici pour couvrir à la fois showExercise()
 * (l'overlay) et dashboard:get-exercises (l'historique) sans dupliquer l'appel.
 */
function loadActiveProgram(settings) {
  const side = storage.getSide(settings.activeProgram) ?? loadSide(settings.activeProgram);
  const resolved = side.exercises.length > 0 ? side : loadSide("sport-basic");
  return translateSide(resolved, settings.language);
}

/**
 * Décode un data URI base64 (`data:image/png;base64,...`) et écrit l'image sur disque, sous
 * `userData/custom-mascots/` — jamais le base64 lui-même en base SQLite, seul ce chemin l'est
 * (voir Storage.createSide). Retourne `null` si le format ou la taille (>3 Mo décodé) est invalide.
 * @returns {string | null} chemin fichier absolu
 */
function decodeMascotImage(image) {
  const match = /^data:image\/(png|jpe?g|webp);base64,([a-zA-Z0-9+/=]+)$/.exec(image ?? "");
  if (!match) return null;
  const buffer = Buffer.from(match[2], "base64");
  if (!isValidMascotImageBuffer(buffer)) return null;

  const ext = MASCOT_MIME_EXTENSIONS[match[1].toLowerCase()] ?? "png";
  const dir = CUSTOM_MASCOTS_DIR();
  mkdirSync(dir, { recursive: true });
  const imagePath = path.join(dir, `${randomUUID()}.${ext}`);
  writeFileSync(imagePath, buffer);
  return imagePath;
}

/**
 * Copie un fichier image choisi via un dialogue natif (mascotte propre à un side, § "sélection
 * de mascotte au niveau du side") sous `userData/custom-mascots/` — même dossier/mêmes bornes que
 * `decodeMascotImage`, mais lit un fichier réel plutôt qu'un data URI base64 (pas besoin de passer
 * par du base64 quand on a déjà un chemin de fichier natif). Retourne `null` si l'extension, la
 * taille, le contenu (pas une image décodable malgré l'extension) ou les dimensions sont invalides
 * — voir `isValidMascotImageBuffer`.
 * @returns {string | null} chemin fichier absolu
 */
function storeMascotFile(sourcePath) {
  const ext = path.extname(sourcePath).slice(1).toLowerCase();
  // MASCOT_MIME_EXTENSIONS couvre déjà "jpg" et "jpeg" comme clés séparées (toutes deux -> "jpg").
  const normalizedExt = MASCOT_MIME_EXTENSIONS[ext];
  if (!normalizedExt) return null;

  let buffer;
  try {
    buffer = readFileSync(sourcePath);
  } catch {
    return null;
  }
  if (!isValidMascotImageBuffer(buffer)) return null;

  const dir = CUSTOM_MASCOTS_DIR();
  mkdirSync(dir, { recursive: true });
  const imagePath = path.join(dir, `${randomUUID()}.${normalizedExt}`);
  writeFileSync(imagePath, buffer);
  return imagePath;
}

/** Supprime le fichier d'une mascotte custom si elle vit bien sous userData (jamais un PNG embarqué avec l'app) — best-effort, ne doit jamais faire échouer l'appelant. */
function cleanupCustomMascotFile(imagePath) {
  if (!imagePath?.startsWith(CUSTOM_MASCOTS_DIR())) return;
  try {
    unlinkSync(imagePath);
  } catch {
    // fichier déjà absent ou inaccessible — tant pis, pas bloquant.
  }
}

/** Ré-encode la mascotte d'un side en data URI base64, pour un export JSON auto-suffisant (round-trip avec dashboard:import-side). */
function mascotToDataUri(mascot) {
  if (!mascot?.imagePath) return null;
  try {
    const ext = path.extname(mascot.imagePath).slice(1).toLowerCase();
    const mime = ext === "jpg" ? "jpeg" : ext;
    const buffer = readFileSync(mascot.imagePath);
    return `data:image/${mime};base64,${buffer.toString("base64")}`;
  } catch {
    // Fichier mascotte introuvable (ex. userData déplacé/nettoyé à la main) — on exporte sans
    // mascotte plutôt que de faire échouer tout l'export.
    return null;
  }
}

/** Mascotte par défaut d'un side custom/importé/généré par IA sans mascotte propre — miroir de
 * `DEFAULT_SIDE_MASCOT_IMAGE` dans shared/mascots.js (dashboard), résolue ici en chemin absolu
 * puisque ce process ne connaît pas la racine relative de l'overlay/du dashboard. */
const DEFAULT_SIDE_MASCOT_PATH = path.join(ASSETS_DIR, "mascots", "sidequest.png");

/**
 * Résout le chemin de l'image d'une mascotte de side selon le niveau atteint (paliers de
 * croissance optionnels, ex. SideCat/SideTama — voir `SideMascot.stages` dans @sidequest/core).
 * Sans `stages`, `imagePath` sert pour tous les niveaux (comportement inchangé pour SideGym etc.).
 * Un side sans mascotte propre retombe sur `DEFAULT_SIDE_MASCOT_PATH`, sauf s'il est bundled
 * (SideGym...), qui garde le repli sur la mascotte globale géré par l'appelant (`payload.mascot`).
 */
function resolveSideMascotImagePath(side, level) {
  if (!side.mascot) return side.source === "bundled" ? null : DEFAULT_SIDE_MASCOT_PATH;
  if (!side.mascot.stages?.length) return side.mascot.imagePath;
  const eligible = side.mascot.stages.filter((s) => s.minLevel <= level).sort((a, b) => b.minLevel - a.minLevel);
  return eligible[0]?.imagePath ?? side.mascot.imagePath;
}

/**
 * Couleur d'accent d'un side — miroir de `resolveSideColor` dans shared/mascots.js (dashboard),
 * dupliquée ici pour l'overlay qui tourne côté main process (contexte Node, pas de module partagé
 * possible avec le renderer). `side.color` si défini, sinon une teinte stable dérivée de son id.
 */
function resolveSideColor(side) {
  if (side.color) return side.color;
  let hash = 0;
  for (let i = 0; i < side.id.length; i++) hash = (hash * 31 + side.id.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

/** Traduit un code d'erreur `parseSideJson`/`generateSide` (packages/core) en clé i18n — un seul endroit pour les deux flux (import manuel, génération LLM). */
function sideParseErrorKey(error) {
  switch (error) {
    case "empty":
      return "errorEmptyExercises";
    case "too-many-exercises":
      return "errorTooManyExercises";
    case "invalid-json":
      return "errorLlmInvalidJson";
    case "provider-error":
      return "errorLlmProviderError";
    case "invalid-shape":
    default:
      return "errorInvalidShape";
  }
}

function showExercise() {
  const settings = storage.getSettings();
  const side = loadActiveProgram(settings);
  const exercise = pickRandomExercise(side);
  const sideProgress = storage.getSideProgress(side.id);
  const debt = storage.getDebt();
  // gate = toujours bloquant. mixed = bloquant seulement si on a trop esquivé (dette > 0),
  // sinon aussi souple que notify. notify = jamais bloquant.
  const blocking = settings.mode === "gate" || (settings.mode === "mixed" && debt > 0);

  currentExercise = exercise;
  currentMascot = settings.activeMascot;
  currentMode = settings.mode;
  currentBlocking = blocking;
  currentSideId = side.id;

  const mascotStageImagePath = resolveSideMascotImagePath(side, sideProgress.level);
  const payload = {
    exercise,
    mascot: settings.activeMascot,
    // Mascotte propre au side (importée avec sa propre image, éventuellement un palier de
    // croissance selon le niveau XP du side), ou la mascotte SideQuest par défaut pour un side
    // custom/importé/généré sans la sienne (voir resolveSideMascotImagePath) — l'overlay n'a
    // pas besoin d'accès fichier lui-même, ce chemin absolu résolu côté main lui suffit.
    mascotImage: mascotStageImagePath ? `file://${mascotStageImagePath}` : null,
    // Couleur d'accent du side actif — l'overlay la pose en variable CSS (--side-accent),
    // consommée par son style.css (bordure du bouton "Passer", halo de la mascotte).
    sideColor: resolveSideColor(side),
    // XP/niveau du side actif — l'overlay en tire l'affichage du prochain badge à débloquer
    // (voir shared/milestones.js), sans avoir besoin d'un aller-retour IPC dédié.
    sideProgress,
    mode: settings.mode,
    theme: settings.theme,
    language: settings.language,
    blocking,
  };

  if (!overlayReady) {
    // La fenêtre overlay n'a pas fini son premier chargement (cas rare, ex: triggerNow()
    // appelé juste après le démarrage de l'app) — on met en attente, did-finish-load enverra.
    pendingPayload = payload;
    return blocking;
  }

  overlayWindow.webContents.send("show-exercise", payload);
  if (blocking) {
    overlayWindow.show();
  } else {
    overlayWindow.showInactive();
  }
  return blocking;
}

function recordAndHide(status) {
  if (!currentExercise) return;
  if (status === "skipped" && currentBlocking) {
    // Filet de sécurité : la bulle "Passer" est masquée côté overlay en mode bloquant,
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
  if (status === "done" && currentSideId) {
    storage.addXp(currentSideId, XP_PER_EXERCISE);
  }
  currentExercise = null;
  currentMascot = null;
  currentMode = null;
  currentBlocking = false;
  currentSideId = null;
  overlayWindow.hide();

  // Libère le hook Claude Code retenu par ce même exercice (mode "stop"/"start" bloquant, voir
  // maybeTriggerFromHook) — no-op si l'exercice ne venait pas d'un hook ou n'était pas bloquant.
  if (pendingHookRespond) {
    pendingHookRespond();
    pendingHookRespond = null;
  }
}

function createTray() {
  const iconPath = path.join(ASSETS_DIR, "tray-icon.png");
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 18, height: 18 });
  icon.setTemplateImage(true); // s'adapte au mode clair/sombre de la menu bar macOS
  tray = new Tray(icon);
  tray.setToolTip("SideQuest");
  // Le clic gauche sur l'icône tray n'ouvre plus le dashboard automatiquement — seul
  // "Ouvrir le dashboard" dans le menu (clic droit), le raccourci clavier ou l'icône ⚙
  // de l'overlay le font.
  buildTrayMenu();
}

function buildTrayMenu() {
  const lang = storage.getSettings().language;
  const menu = Menu.buildFromTemplate([
    {
      label: t(lang, "trayOpenDashboard"),
      click: () => showDashboard(),
    },
    { type: "separator" },
    {
      label: t(lang, "trayTriggerNow"),
      click: () => scheduler.triggerNow(),
    },
    {
      label: t(lang, "trayPause"),
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
      label: t(lang, "trayStreak", storage.getCurrentStreak()),
      enabled: false,
    },
    { type: "separator" },
    { label: t(lang, "trayQuit"), click: () => app.quit() },
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
    const dbPath = path.join(app.getPath("userData"), "sidequest.sqlite");
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
    // "hook" seul : le minuteur classique reste en pause, seul /trigger déclenche des exercices.
    if (settings.triggerSource !== "hook") {
      scheduler.start();
    }

    /**
     * @param {() => void} respond Renvoie la réponse HTTP au hook Claude Code (curl). Appelé tout
     *   de suite si rien n'est déclenché ou si l'exercice n'est pas bloquant ; sinon retenu dans
     *   pendingHookRespond et appelé plus tard par recordAndHide() une fois l'exercice fait —
     *   c'est ça qui bloque réellement la session Claude Code, pas juste l'UI de la mascotte.
     *   En mode "thinking", le débounce (onTurnStart ci-dessous) appelle un respond() no-op :
     *   /turn-start a déjà répondu immédiatement 8s plus tôt, ce déclenchement différé ne peut
     *   plus bloquer le hook qui l'a initié — c'est onTurnEnd (Stop) qui prend le relais dans ce
     *   cas, voir plus bas.
     */
    function maybeTriggerFromHook(respond) {
      const currentSettings = storage.getSettings();
      // "timer" seul : on ignore les appels du hook (ex. laissé configuré après un
      // changement de réglage) plutôt que de le désinstaller côté Claude Code.
      if (currentSettings.triggerSource === "timer") {
        respond();
        return;
      }

      // hookEveryN = 1 (défaut) déclenche à chaque appel. > 1 = une réponse Claude sur N,
      // pour ne pas interrompre trop souvent sur des sessions avec beaucoup d'allers-retours.
      hookCallCount += 1;
      if (hookCallCount < currentSettings.hookEveryN) {
        respond();
        return;
      }
      hookCallCount = 0;

      const blocking = showExercise();
      if (blocking) {
        // Un seul trigger bloquant à la fois : si un précédent traînait encore (ne devrait pas
        // arriver, showExercise() écrase l'exercice courant), on le libère d'abord pour ne pas
        // fuir la connexion HTTP qui l'attendait.
        if (pendingHookRespond) pendingHookRespond();
        pendingHookRespond = respond;
      } else {
        respond();
      }
    }

    hookServer = new HookServer({
      // Modes "stop" et "start" : déclenchement immédiat (hook Stop ou UserPromptSubmit installé
      // en conséquence côté claude-hook-installer, un seul des deux à la fois).
      onTrigger: maybeTriggerFromHook,
      // Mode "thinking" : début de tour (UserPromptSubmit) — on ne propose l'exercice que si
      // Claude travaille encore après THINKING_DEBOUNCE_MS, pour ne pas interrompre un aller-retour rapide.
      onTurnStart: () => {
        if (pendingThinkingTimer) clearTimeout(pendingThinkingTimer);
        pendingThinkingTimer = setTimeout(() => {
          pendingThinkingTimer = null;
          maybeTriggerFromHook(() => {});
        }, THINKING_DEBOUNCE_MS);
      },
      // Mode "thinking" : fin de tour (Stop).
      onTurnEnd: (respond) => {
        if (pendingThinkingTimer) {
          // Claude a fini avant la fin du débounce : rien n'a été déclenché, on annule et on
          // rend la main tout de suite — c'est justement le but du mode "thinking" (ne jamais
          // retarder un échange rapide).
          clearTimeout(pendingThinkingTimer);
          pendingThinkingTimer = null;
          respond();
          return;
        }
        // Le débounce a peut-être déjà déclenché un exercice avant que Claude ait fini — s'il
        // est encore bloquant et pas terminé, on retient la réponse comme pour /trigger :
        // recordAndHide() la libérera une fois l'exercice fait. Claude a donc pu démarrer son
        // tour instantanément dans tous les cas, mais ne récupère la main à la fin que si
        // l'exercice (bloquant) déclenché entre-temps est terminé.
        if (currentExercise && currentBlocking) {
          if (pendingHookRespond) pendingHookRespond(); // filet de sécurité, ne devrait pas arriver
          pendingHookRespond = respond;
        } else {
          respond();
        }
      },
    });
    hookServer.start().catch((error) => {
      console.error("[hook-server] échec du démarrage :", error.message);
    });

    if (process.env.MASCOT_DEBUG_TRIGGER_ON_START === "1") {
      scheduler.triggerNow();
    }

    if (process.platform === "darwin" && app.dock && !app.isPackaged) {
      // Uniquement en dev (`electron .`) : l'app packagée a déjà la bonne icône via son
      // .icns (fiable, bundle statique) — appeler setIcon() dessus l'écrase par un mécanisme
      // runtime plus fragile qui finit par disparaître. En dev, l'icône générique Electron
      // est remplacée par la mascotte (best-effort, peut être capricieux selon le cache
      // d'icônes du Dock macOS — sans impact sur l'app packagée, ce qui compte vraiment).
      app.dock.setIcon(path.join(ASSETS_DIR, "mascots", "sidequest.png"));
    }

    // Premier lancement : le dashboard s'ouvre automatiquement (onboarding, cf. Sprint 3.5).
    if (isFirstLaunch) {
      dashboardWindow.once("ready-to-show", () => showDashboard());
    }

    ipcMain.on("exercise-done", () => recordAndHide("done"));
    ipcMain.on("exercise-skipped", () => recordAndHide("skipped"));
    ipcMain.on("open-dashboard", () => showDashboard());

    ipcMain.handle("dashboard:copy-to-clipboard", (_event, text) => clipboard.writeText(text));
    ipcMain.handle("dashboard:open-external", (_event, url) => shell.openExternal(url));

    ipcMain.handle("dashboard:get-settings", () => ({ ...storage.getSettings(), isFirstLaunch }));
    ipcMain.handle("dashboard:update-settings", (_event, partial) => {
      const next = storage.updateSettings(partial);
      if (partial.intervalMinutes !== undefined) {
        scheduler.updateInterval(next.intervalMinutes);
      }
      if (partial.hookEveryN !== undefined) {
        hookCallCount = 0;
      }
      if (partial.hookTriggerMode !== undefined) {
        hookCallCount = 0;
        if (pendingThinkingTimer) {
          clearTimeout(pendingThinkingTimer);
          pendingThinkingTimer = null;
        }
        // Ne réinstalle que si l'intégration est déjà active, pour rester cohérent avec le
        // statut affiché dans le dashboard — le changement de mode seul n'active pas l'intégration.
        if (isClaudeHookInstalled(CLAUDE_SETTINGS_PATH)) {
          installClaudeHook(CLAUDE_SETTINGS_PATH, next.hookTriggerMode);
        }
      }
      if (partial.triggerSource !== undefined) {
        if (next.triggerSource === "hook") {
          scheduler.stop();
        } else if (!scheduler.isRunning()) {
          scheduler.start();
        }
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
      if (partial.language !== undefined) {
        overlayWindow.webContents.send("language-changed", next.language);
        buildTrayMenu();
      }
      return { ...next, autolaunchWarning };
    });
    ipcMain.handle("dashboard:get-sessions", () => storage.getSessions());
    ipcMain.handle("dashboard:get-streak", () => storage.getCurrentStreak());
    ipcMain.handle("dashboard:get-exercises", () => loadActiveProgram(storage.getSettings()).exercises);
    ipcMain.handle("dashboard:get-debt", () => storage.getDebt());
    ipcMain.on("dashboard:trigger-exercise", () => scheduler.triggerNow());

    ipcMain.handle("dashboard:get-sides", () => {
      const lang = storage.getSettings().language;
      return {
        bundledSides: listBundledSides().map((p) => translateSide(p, lang)),
        customSides: storage.getSides(),
      };
    });
    ipcMain.handle("dashboard:get-side-progress", (_event, id) => storage.getSideProgress(id));
    ipcMain.handle("dashboard:create-side", (_event, { name, exercises }) => storage.createSide(name, exercises));
    ipcMain.handle("dashboard:update-side", (_event, { id, partial }) => storage.updateSide(id, partial));

    // --- Mascotte propre à un side (galerie -> éditeur de side -> section "Mascotte") ---
    // Un side bundled n'a pas cette section (champs désactivés côté renderer, cf. isBundled),
    // mais ces handlers ne le vérifient pas eux-mêmes — storage.updateSide() sur un id bundled
    // échouerait de toute façon ("Side inconnu", les sides embarqués ne sont pas en base).
    ipcMain.handle("dashboard:set-side-mascot-bundled", (_event, { sideId, mascotId, label }) => {
      const imagePath = path.join(ASSETS_DIR, "mascots", `${mascotId}.png`);
      if (!existsSync(imagePath)) return { updated: false };
      const existing = storage.getSide(sideId);
      cleanupCustomMascotFile(existing?.mascot?.imagePath);
      const side = storage.updateSide(sideId, { mascot: { id: mascotId, label, imagePath } });
      return { updated: true, side };
    });

    ipcMain.handle("dashboard:set-side-mascot-custom", async (_event, sideId) => {
      const lang = storage.getSettings().language;
      const { canceled, filePaths } = await dialog.showOpenDialog(dashboardWindow, {
        title: t(lang, "chooseMascotDialogTitle"),
        filters: [{ name: t(lang, "imageFilterName"), extensions: ["png", "jpg", "jpeg", "webp"] }],
        properties: ["openFile"],
      });
      if (canceled || filePaths.length === 0) return { updated: false, error: null };

      const imagePath = storeMascotFile(filePaths[0]);
      if (!imagePath) return { updated: false, error: t(lang, "errorInvalidMascot") };

      const existing = storage.getSide(sideId);
      cleanupCustomMascotFile(existing?.mascot?.imagePath);
      const side = storage.updateSide(sideId, {
        mascot: { id: `custom:${randomUUID()}`, label: existing?.name ?? "", imagePath },
      });
      return { updated: true, side };
    });

    ipcMain.handle("dashboard:clear-side-mascot", (_event, sideId) => {
      const existing = storage.getSide(sideId);
      cleanupCustomMascotFile(existing?.mascot?.imagePath);
      const side = storage.updateSide(sideId, { mascot: null });
      return { updated: true, side };
    });

    ipcMain.handle("dashboard:delete-side", (_event, id) => {
      const side = storage.getSide(id);
      storage.deleteSide(id);
      cleanupCustomMascotFile(side?.mascot?.imagePath);
      return storage.getSettings();
    });

    ipcMain.handle("dashboard:export-side", async (_event, id) => {
      const lang = storage.getSettings().language;
      const rawSide = storage.getSide(id) ?? listBundledSides().find((p) => p.id === id) ?? null;
      if (!rawSide) return { exported: false };
      // Exporte dans la langue actuellement affichée (no-op sur un side custom/importé/généré,
      // qui n'a jamais de champs `*En`) — cohérent avec ce que l'utilisateur voit à l'écran.
      const side = translateSide(rawSide, lang);

      const { canceled, filePath } = await dialog.showSaveDialog(dashboardWindow, {
        title: t(lang, "exportDialogTitle"),
        defaultPath: `${side.name.replace(/[^a-z0-9-_]+/gi, "-")}.json`,
        filters: [{ name: t(lang, "exportFilterName"), extensions: ["json"] }],
      });
      if (canceled || !filePath) return { exported: false };

      const mascotImage = mascotToDataUri(side.mascot);
      const exported = {
        name: side.name,
        exercises: side.exercises,
        ...(mascotImage ? { mascot: { label: side.mascot.label, image: mascotImage } } : {}),
      };
      writeFileSync(filePath, JSON.stringify(exported, null, 2), "utf-8");
      return { exported: true };
    });

    ipcMain.handle("dashboard:import-side", async () => {
      const lang = storage.getSettings().language;
      const { canceled, filePaths } = await dialog.showOpenDialog(dashboardWindow, {
        title: t(lang, "importDialogTitle"),
        filters: [{ name: t(lang, "exportFilterName"), extensions: ["json"] }],
        properties: ["openFile"],
      });
      if (canceled || filePaths.length === 0) return { imported: false, error: null };

      let data;
      try {
        data = JSON.parse(readFileSync(filePaths[0], "utf-8"));
      } catch {
        return { imported: false, error: t(lang, "errorInvalidJson") };
      }

      // Même sanitizer que la génération LLM (dashboard:generate-side) — un fichier édité à la
      // main et un texte produit par un modèle sont tous les deux des données non fiables,
      // mêmes règles pour les deux (voir sides.ts, plan-llm-side-generation.md § 3.1).
      const parsed = parseSideJson(data);
      if ("error" in parsed) return { imported: false, error: t(lang, sideParseErrorKey(parsed.error)) };
      const { name, exercises } = parsed;

      // La mascotte est optionnelle — sans elle, comportement inchangé (mascotte globale).
      let mascot;
      if (data.mascot !== undefined) {
        const imagePath = decodeMascotImage(data.mascot?.image);
        if (!imagePath) return { imported: false, error: t(lang, "errorInvalidMascot") };
        mascot = { id: `custom:${randomUUID()}`, label: String(data.mascot?.label ?? name), imagePath };
      }

      const side = storage.createSide(name, exercises, { source: "imported", mascot });
      return { imported: true, side };
    });

    // --- Génération de side par LLM (plan-llm-side-generation.md) — premier point d'entrée
    // réseau/process-externe de l'app ; voir § 3.5 du plan pour la posture de sécurité (clé
    // jamais en clair/SQLite, Ollama en loopback par défaut, args de tableau jamais un shell).
    ipcMain.handle("dashboard:get-llm-status", async () => {
      const [claudeCliAvailable, codexCliAvailable] = await Promise.all([
        isClaudeCliAvailable(),
        isCodexCliAvailable(),
      ]);
      return {
        hasAnthropicKey: hasApiKey("anthropic-api"),
        hasOpenaiKey: hasApiKey("openai-api"),
        claudeCliAvailable,
        codexCliAvailable,
        encryptionAvailable: isEncryptionAvailable(),
      };
    });

    ipcMain.handle("dashboard:set-llm-api-key", (_event, { provider, key }) => {
      try {
        setApiKey(provider, key);
        return { ok: true };
      } catch {
        return { ok: false };
      }
    });

    /** Construit les options d'appel d'un provider à partir des Settings courants — jamais la clé en dur nulle part, lue à la demande. */
    function llmOptionsFromSettings(settings) {
      const provider = settings.llmProvider;
      const apiKeyProvider = provider === "anthropic-api" || provider === "openai-api" ? provider : null;
      return {
        apiKey: apiKeyProvider ? (getApiKey(apiKeyProvider) ?? undefined) : undefined,
        model:
          provider === "anthropic-api"
            ? settings.anthropicModel
            : provider === "openai-api"
              ? settings.openaiModel
              : provider === "ollama"
                ? settings.ollamaModel
                : undefined,
        baseUrl: provider === "ollama" ? settings.ollamaBaseUrl : undefined,
      };
    }

    ipcMain.handle("dashboard:test-llm-connection", async (_event, providerId) => {
      const settings = storage.getSettings();
      if (providerId === "claude-cli") return { ok: await isClaudeCliAvailable() };
      if (providerId === "codex-cli") return { ok: await isCodexCliAvailable() };
      if (providerId === "ollama") {
        try {
          await listOllamaModels(settings.ollamaBaseUrl);
          return { ok: true };
        } catch {
          return { ok: false };
        }
      }
      const provider = resolveProvider(providerId);
      if (!provider) return { ok: false };
      try {
        // Appel minimal réel plutôt qu'un simple ping — pas d'endpoint de healthcheck dédié
        // chez Anthropic/OpenAI, donc un aller-retour trivial fait office de test de connexion.
        await provider.generate('Reply with only this exact JSON: {"ok":true}', llmOptionsFromSettings(settings));
        return { ok: true };
      } catch {
        return { ok: false };
      }
    });

    ipcMain.handle("dashboard:get-ollama-models", async (_event, baseUrl) => {
      try {
        return { models: await listOllamaModels(baseUrl) };
      } catch {
        return { models: [] };
      }
    });

    ipcMain.handle("dashboard:generate-side", async (_event, { prompt, mascotDescription }) => {
      const settings = storage.getSettings();
      const provider = resolveProvider(settings.llmProvider);
      if (!provider) {
        return { generated: false, error: t(settings.language, "errorLlmNotConfigured") };
      }

      const result = await generateSide(
        provider,
        prompt,
        llmOptionsFromSettings(settings),
        mascotDescription
      );
      if ("error" in result) {
        return { generated: false, error: t(settings.language, sideParseErrorKey(result.error)) };
      }

      const side = storage.createSide(result.name, result.exercises, { source: "generated" });
      // Suggestion texte, jamais persistée — pas d'image générée (voir plan-llm-side-generation.md),
      // juste une idée affichée une fois dans l'éditeur pour guider le choix manuel de mascotte.
      return { generated: true, side, mascotIdea: result.mascotIdea };
    });

    ipcMain.handle("dashboard:hook-is-installed", () => isClaudeHookInstalled(CLAUDE_SETTINGS_PATH));
    ipcMain.handle("dashboard:hook-install", () => {
      installClaudeHook(CLAUDE_SETTINGS_PATH, storage.getSettings().hookTriggerMode);
      return isClaudeHookInstalled(CLAUDE_SETTINGS_PATH);
    });
    ipcMain.handle("dashboard:hook-uninstall", () => {
      uninstallClaudeHook(CLAUDE_SETTINGS_PATH);
      return isClaudeHookInstalled(CLAUDE_SETTINGS_PATH);
    });
  });

  app.on("before-quit", () => {
    isQuitting = true;
  });

  app.on("will-quit", () => {
    globalShortcut.unregisterAll();
    if (pendingThinkingTimer) clearTimeout(pendingThinkingTimer);
    // Ne laisse pas un hook Claude Code retenu indéfiniment si l'app quitte pendant qu'un
    // exercice bloquant est en attente — mieux vaut rendre la main tout de suite.
    if (pendingHookRespond) {
      pendingHookRespond();
      pendingHookRespond = null;
    }
    hookServer?.stop();
  });

  // L'app tourne en arrière-plan : fermer une fenêtre ne quitte jamais l'app.
  // Seul "Quitter" dans le menu tray (app.quit()) termine le process.
  app.on("window-all-closed", (event) => {
    event.preventDefault();
  });
}
