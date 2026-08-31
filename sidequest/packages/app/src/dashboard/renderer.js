const themeToggle = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon");

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeIcon.textContent = theme === "dark" ? "🌙" : "☀️";
}

themeToggle.addEventListener("click", async () => {
  const isDark = document.documentElement.dataset.theme === "dark";
  const nextTheme = isDark ? "light" : "dark";
  const next = await window.dashboardAPI.updateSettings({ theme: nextTheme });
  applySettingsToUI(next);
});

// Pas de déstructuration ici : les <script> classiques partagent la même portée de haut niveau
// dans le document, donc `const { MASCOT_LABELS } = ...` entrerait en conflit avec le `const
// MASCOT_LABELS` déjà déclaré par shared/mascots.js (chargé juste avant) — d'où cet alias unique.
const sqMascots = window.sqMascots;

const languageButtons = [...document.querySelectorAll("#language-options .language-bubble")];
languageButtons.forEach((btn) =>
  btn.addEventListener("click", () => save({ language: btn.dataset.language }))
);

const tabs = [...document.querySelectorAll(".nav-item")];
const panels = {
  settings: document.getElementById("panel-settings"),
  sides: document.getElementById("panel-sides"),
  history: document.getElementById("panel-history"),
};

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.toggle("active", t === tab));
    Object.entries(panels).forEach(([key, panel]) =>
      panel.classList.toggle("active", key === tab.dataset.tab)
    );
    if (tab.dataset.tab === "history") refreshHistory();
    if (tab.dataset.tab === "sides") refreshSides();
  });
});

const intervalRange = document.getElementById("interval-range");
const intervalValue = document.getElementById("interval-value");
const modeButtons = [...document.querySelectorAll("#mode-options .option-btn")];
const triggerSourceButtons = [...document.querySelectorAll("#trigger-source-options .option-btn")];
const hookTriggerModeButtons = [...document.querySelectorAll("#hook-trigger-mode-options .option-btn")];
const visualThemeButtons = [...document.querySelectorAll("#visual-theme-options .visual-theme-bubble")];
const hookEveryNInput = document.getElementById("hook-every-n-input");
const autolaunchToggle = document.getElementById("autolaunch-toggle");
const toast = document.getElementById("toast");

function formatInterval(minutes) {
  return minutes < 1 ? `${Math.round(minutes * 60)} sec` : `${minutes} min`;
}

let currentSettings = null;
let lastAppliedLanguage = null;

function applySettingsToUI(settings) {
  currentSettings = settings;
  intervalRange.value = settings.intervalMinutes;
  intervalValue.textContent = formatInterval(settings.intervalMinutes);
  modeButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.mode === settings.mode));
  triggerSourceButtons.forEach((btn) =>
    btn.classList.toggle("active", btn.dataset.triggerSource === settings.triggerSource)
  );
  hookTriggerModeButtons.forEach((btn) =>
    btn.classList.toggle("active", btn.dataset.hookTriggerMode === settings.hookTriggerMode)
  );
  visualThemeButtons.forEach((btn) =>
    btn.classList.toggle("active", btn.dataset.visualTheme === settings.visualTheme)
  );
  languageButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.language === settings.language));
  hookEveryNInput.value = settings.hookEveryN;
  autolaunchToggle.checked = settings.autolaunch;
  renderLlmFields(settings);
  applyTheme(settings.theme);
  document.documentElement.dataset.visualTheme = settings.visualTheme;

  i18n.setLanguage(settings.language);
  document.documentElement.lang = settings.language;
  i18n.applyStaticTranslations();
  // Ré-applique la traduction des libellés générés dynamiquement en JS (pas couverts par
  // data-i18n) uniquement quand la langue a réellement changé — évite du travail inutile
  // (re-fetch de la galerie, re-fetch de l'historique) à chaque sauvegarde de réglage.
  if (settings.language !== lastAppliedLanguage) {
    lastAppliedLanguage = settings.language;
    applyHookStatus(hookStatusBadge.classList.contains("installed"));
    // refreshSides() (re-fetch IPC), pas juste renderSidesGrid() (re-rendu du cache) : les sides
    // embarqués sont traduits côté main process (translateSide(), voir @sidequest/core) selon la
    // langue au moment de l'appel — un simple re-rendu du cache garderait l'ancienne langue.
    refreshSides();
    if (editingSide) renderSideExercises();
    if (document.getElementById("panel-history").classList.contains("active")) refreshHistory();
  }
}

let toastTimeout;
function showToast(message, variant = "success") {
  toast.textContent = message;
  toast.classList.toggle("warning", variant === "warning");
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), variant === "warning" ? 4500 : 2000);
}

async function save(partial) {
  const next = await window.dashboardAPI.updateSettings(partial);
  applySettingsToUI(next);
  if (next.autolaunchWarning) {
    showToast(next.autolaunchWarning, "warning");
  } else {
    showToast(i18n.t("toast.saved"));
  }
}

intervalRange.addEventListener("input", () => {
  intervalValue.textContent = formatInterval(Number(intervalRange.value));
});
intervalRange.addEventListener("change", () => save({ intervalMinutes: Number(intervalRange.value) }));

hookEveryNInput.addEventListener("change", () => {
  const value = Math.max(1, Number(hookEveryNInput.value) || 1);
  hookEveryNInput.value = value;
  save({ hookEveryN: value });
});

modeButtons.forEach((btn) => btn.addEventListener("click", () => save({ mode: btn.dataset.mode })));
triggerSourceButtons.forEach((btn) =>
  btn.addEventListener("click", () => save({ triggerSource: btn.dataset.triggerSource }))
);
hookTriggerModeButtons.forEach((btn) =>
  btn.addEventListener("click", () => save({ hookTriggerMode: btn.dataset.hookTriggerMode }))
);
visualThemeButtons.forEach((btn) =>
  btn.addEventListener("click", () => {
    const nextTheme = btn.dataset.visualTheme;
    const validMascots = sqMascots.MASCOTS_BY_THEME[nextTheme] ?? [];
    const partial = { visualTheme: nextTheme };
    // La mascotte active n'existe pas forcément dans le nouveau thème (ex. "sergeant" n'a de
    // sens que pour "military-camo") — on bascule alors sur la première mascotte du thème.
    if (!validMascots.includes(currentSettings?.activeMascot)) {
      partial.activeMascot = validMascots[0];
    }
    save(partial);
  })
);
autolaunchToggle.addEventListener("change", () => save({ autolaunch: autolaunchToggle.checked }));

const onboardingBanner = document.getElementById("onboarding-banner");
const onboardingDismiss = document.getElementById("onboarding-dismiss");
onboardingDismiss.addEventListener("click", () => (onboardingBanner.hidden = true));

const triggerExerciseBtn = document.getElementById("trigger-exercise");
triggerExerciseBtn.addEventListener("click", () => window.dashboardAPI.triggerExercise());

window.dashboardAPI.getSettings().then((settings) => {
  applySettingsToUI(settings);
  if (settings.isFirstLaunch) {
    onboardingBanner.hidden = false;
  }
});

const hookStatusBadge = document.getElementById("hook-status-badge");
const hookToggleBtn = document.getElementById("hook-toggle-btn");

function applyHookStatus(installed) {
  hookStatusBadge.textContent = installed ? i18n.t("hook.status.installed") : i18n.t("hook.status.notInstalled");
  hookStatusBadge.className = `status-badge ${installed ? "installed" : "not-installed"}`;
  hookToggleBtn.textContent = installed ? i18n.t("hook.toggle.disable") : i18n.t("hook.toggle.enable");
}

hookToggleBtn.addEventListener("click", async () => {
  const currentlyInstalled = hookStatusBadge.classList.contains("installed");
  const nowInstalled = currentlyInstalled
    ? await window.dashboardAPI.uninstallHook()
    : await window.dashboardAPI.installHook();
  applyHookStatus(nowInstalled);
  showToast(nowInstalled ? i18n.t("toast.hookEnabled") : i18n.t("toast.hookDisabled"));
});

window.dashboardAPI.isHookInstalled().then(applyHookStatus);

// --- Génération de side par IA (plan-llm-side-generation.md) ---

const llmProviderButtons = [...document.querySelectorAll("#llm-provider-options .option-btn")];
const llmKeyRow = document.getElementById("llm-key-row");
const llmKeyInput = document.getElementById("llm-api-key-input");
const llmSaveKeyBtn = document.getElementById("llm-save-key-btn");
const llmKeyStatus = document.getElementById("llm-key-status");
const llmModelRow = document.getElementById("llm-model-row");
const llmModelInput = document.getElementById("llm-model-input");
const llmBaseUrlRow = document.getElementById("llm-base-url-row");
const llmBaseUrlInput = document.getElementById("llm-base-url-input");
const llmCliStatus = document.getElementById("llm-cli-status");
const llmTestRow = document.getElementById("llm-test-row");
const llmTestBadge = document.getElementById("llm-test-badge");
const llmTestBtn = document.getElementById("llm-test-btn");

const LLM_KEY_PROVIDERS = new Set(["anthropic-api", "openai-api"]);
const LLM_MODEL_PROVIDERS = new Set(["anthropic-api", "openai-api", "ollama"]);
const LLM_CLI_PROVIDERS = new Set(["claude-cli", "codex-cli"]);

/** Statut chargé une fois au démarrage (§ 3.4 du plan) : présence de clé par fournisseur (pas la clé elle-même, jamais renvoyée au renderer) + disponibilité des CLI. */
let llmStatus = { hasAnthropicKey: false, hasOpenaiKey: false, claudeCliAvailable: false, codexCliAvailable: false };

function llmHasKeyFor(provider) {
  if (provider === "anthropic-api") return llmStatus.hasAnthropicKey;
  if (provider === "openai-api") return llmStatus.hasOpenaiKey;
  return false;
}

function llmModelValueFor(provider, settings) {
  if (provider === "anthropic-api") return settings.anthropicModel;
  if (provider === "openai-api") return settings.openaiModel;
  if (provider === "ollama") return settings.ollamaModel;
  return "";
}

/** Un seul jeu de champs, réétiqueté/masqué selon le fournisseur choisi — plutôt que dupliquer le
    markup par fournisseur (un seul est actif à la fois, cf. mode/triggerSource/hookTriggerMode). */
function renderLlmFields(settings) {
  const provider = settings.llmProvider;
  llmProviderButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.llmProvider === provider));

  const showKey = LLM_KEY_PROVIDERS.has(provider);
  llmKeyRow.hidden = !showKey;
  llmKeyStatus.hidden = !showKey;
  if (showKey) {
    llmKeyInput.value = "";
    llmKeyStatus.textContent = llmHasKeyFor(provider) ? i18n.t("llm.keyStored") : i18n.t("llm.keyMissing");
  }

  const showModel = LLM_MODEL_PROVIDERS.has(provider);
  llmModelRow.hidden = !showModel;
  if (showModel) llmModelInput.value = llmModelValueFor(provider, settings);

  const showBaseUrl = provider === "ollama";
  llmBaseUrlRow.hidden = !showBaseUrl;
  if (showBaseUrl) llmBaseUrlInput.value = settings.ollamaBaseUrl;

  const showCli = LLM_CLI_PROVIDERS.has(provider);
  llmCliStatus.hidden = !showCli;
  if (provider === "claude-cli") {
    llmCliStatus.textContent = llmStatus.claudeCliAvailable ? i18n.t("llm.cli.available") : i18n.t("llm.cli.unavailable");
  } else if (provider === "codex-cli") {
    llmCliStatus.textContent = llmStatus.codexCliAvailable ? i18n.t("llm.cli.available") : i18n.t("llm.cli.unavailable");
  }

  llmTestRow.hidden = provider === "none";
  llmTestBadge.textContent = "…";
  llmTestBadge.className = "status-badge";
}

llmProviderButtons.forEach((btn) =>
  btn.addEventListener("click", () => save({ llmProvider: btn.dataset.llmProvider }))
);

llmSaveKeyBtn.addEventListener("click", async () => {
  const key = llmKeyInput.value.trim();
  if (!key) return;
  const provider = currentSettings.llmProvider;
  const { ok } = await window.dashboardAPI.setLlmApiKey(provider, key);
  if (!ok) {
    showToast(i18n.t("llm.toast.keyStorageFailed"), "warning");
    return;
  }
  if (provider === "anthropic-api") llmStatus.hasAnthropicKey = true;
  if (provider === "openai-api") llmStatus.hasOpenaiKey = true;
  renderLlmFields(currentSettings);
  showToast(i18n.t("llm.toast.keySaved"));
});

llmModelInput.addEventListener("change", () => {
  const provider = currentSettings.llmProvider;
  const field = provider === "anthropic-api" ? "anthropicModel" : provider === "openai-api" ? "openaiModel" : "ollamaModel";
  save({ [field]: llmModelInput.value.trim() });
});

llmBaseUrlInput.addEventListener("change", () => save({ ollamaBaseUrl: llmBaseUrlInput.value.trim() }));

llmTestBtn.addEventListener("click", async () => {
  llmTestBadge.textContent = i18n.t("llm.testing");
  llmTestBadge.className = "status-badge";
  const { ok } = await window.dashboardAPI.testLlmConnection(currentSettings.llmProvider);
  llmTestBadge.textContent = ok ? i18n.t("llm.testOk") : i18n.t("llm.testFailed");
  llmTestBadge.className = `status-badge ${ok ? "installed" : "not-installed"}`;
});

window.dashboardAPI.getLlmStatus().then((status) => {
  llmStatus = status;
  if (currentSettings) renderLlmFields(currentSettings);
});

// --- Bouton "Générer" de la galerie de sides ---

const generateSideBtn = document.getElementById("generate-side-btn");
const generateSideModal = document.getElementById("generate-side-modal");
const generateSidePrompt = document.getElementById("generate-side-prompt");
const generateSideMascot = document.getElementById("generate-side-mascot");
const generateSideError = document.getElementById("generate-side-error");
const generateSideCancelBtn = document.getElementById("generate-side-cancel-btn");
const generateSideSubmitBtn = document.getElementById("generate-side-submit-btn");

generateSideBtn.addEventListener("click", () => {
  // Pas de fournisseur configuré : on n'ouvre pas la modale pour rien, on renvoie vers les
  // réglages (même logique de "découverte progressive" que le bouton d'intégration Claude Code,
  // toujours visible avec un état actionnable plutôt que masqué).
  if (currentSettings.llmProvider === "none") {
    tabs.find((tab) => tab.dataset.tab === "settings")?.click();
    showToast(i18n.t("llm.toast.configureFirst"), "warning");
    return;
  }
  generateSidePrompt.value = "";
  generateSideMascot.value = "";
  generateSideError.hidden = true;
  generateSideModal.hidden = false;
  generateSidePrompt.focus();
});

generateSideCancelBtn.addEventListener("click", () => {
  generateSideModal.hidden = true;
});

generateSideSubmitBtn.addEventListener("click", async () => {
  const prompt = generateSidePrompt.value.trim();
  if (!prompt) return;

  generateSideSubmitBtn.disabled = true;
  generateSideSubmitBtn.textContent = i18n.t("sides.generateModal.submitting");
  generateSideError.hidden = true;

  const mascotDescription = generateSideMascot.value.trim();
  const { generated, error, side, mascotIdea } = await window.dashboardAPI.generateSide(
    prompt,
    mascotDescription || undefined
  );

  generateSideSubmitBtn.disabled = false;
  generateSideSubmitBtn.textContent = i18n.t("sides.generateModal.submit");

  if (!generated) {
    generateSideError.textContent = error;
    generateSideError.hidden = false;
    return;
  }

  generateSideModal.hidden = true;
  sidesState.customSides.push(side);
  openSideEditor(side.id, mascotIdea);
  showToast(i18n.t("sides.toast.generated"));
});

const statStreak = document.getElementById("stat-streak");
const statWeek = document.getElementById("stat-week");
const statTotal = document.getElementById("stat-total");
const statDebt = document.getElementById("stat-debt");
const barChart = document.getElementById("bar-chart");
const historyTableBody = document.getElementById("history-table-body");
const historyEmpty = document.getElementById("history-empty");

function statusLabel(status) {
  return i18n.t(`status.${status}`);
}
function modeLabel(mode) {
  return i18n.t(`mode.${mode}`);
}

function dayKey(timestamp) {
  return timestamp.slice(0, 10);
}

function formatDateTime(timestamp) {
  return new Date(timestamp).toLocaleString(i18n.getLocale(), {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderBarChart(sessions) {
  const today = new Date();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const count = sessions.filter((s) => s.status === "done" && dayKey(s.timestamp) === key).length;
    days.push({ label: d.toLocaleDateString(i18n.getLocale(), { weekday: "short" }), count });
  }
  const max = Math.max(1, ...days.map((d) => d.count));

  barChart.innerHTML = "";
  days.forEach((day) => {
    const col = document.createElement("div");
    col.className = "bar-col";

    const countEl = document.createElement("span");
    countEl.className = "bar-count";
    countEl.textContent = day.count || "";

    const barEl = document.createElement("div");
    barEl.className = "bar";
    barEl.style.height = `${(day.count / max) * 100}%`;

    const dayEl = document.createElement("span");
    dayEl.className = "bar-day";
    dayEl.textContent = day.label;

    col.append(countEl, barEl, dayEl);
    barChart.appendChild(col);
  });

  return days.reduce((sum, d) => sum + d.count, 0);
}

function renderHistoryTable(sessions, exerciseLabels) {
  const recent = sessions.slice(0, 25);
  historyTableBody.innerHTML = "";
  historyEmpty.hidden = recent.length > 0;

  recent.forEach((session) => {
    const row = document.createElement("tr");

    const dateCell = document.createElement("td");
    dateCell.textContent = formatDateTime(session.timestamp);

    const exerciseCell = document.createElement("td");
    exerciseCell.textContent = exerciseLabels.get(session.exerciseId) ?? session.exerciseId;

    const mascotCell = document.createElement("td");
    const mascotWrap = document.createElement("span");
    mascotWrap.className = "history-mascot";
    const mascotImg = document.createElement("img");
    mascotImg.src = sqMascots.MASCOT_IMAGES[session.mascot] ?? sqMascots.MASCOT_IMAGES["ronnie-coleman"];
    mascotImg.alt = "";
    const mascotLabel = document.createElement("span");
    mascotLabel.textContent = sqMascots.MASCOT_LABELS[session.mascot] ?? session.mascot;
    mascotWrap.append(mascotImg, mascotLabel);
    mascotCell.appendChild(mascotWrap);

    const modeCell = document.createElement("td");
    modeCell.textContent = modeLabel(session.mode) ?? session.mode;

    const statusCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = `status-badge ${session.status}`;
    badge.textContent = statusLabel(session.status) ?? session.status;
    statusCell.appendChild(badge);

    row.append(dateCell, exerciseCell, mascotCell, modeCell, statusCell);
    historyTableBody.appendChild(row);
  });
}

const shareStats = { streak: 0, week: 0, total: 0 };

async function refreshHistory() {
  const [sessions, streak, exercises, debt] = await Promise.all([
    window.dashboardAPI.getSessions(),
    window.dashboardAPI.getStreak(),
    window.dashboardAPI.getExercises(),
    window.dashboardAPI.getDebt(),
  ]);
  const exerciseLabels = new Map(exercises.map((e) => [e.id, e.label]));

  statStreak.textContent = streak;
  statTotal.textContent = sessions.length;
  statWeek.textContent = renderBarChart(sessions);
  statDebt.textContent = debt;
  statDebt.classList.toggle("stat-value-warning", debt > 0);
  renderHistoryTable(sessions, exerciseLabels);

  shareStats.streak = streak;
  shareStats.week = statWeek.textContent;
  shareStats.total = sessions.length;
}

const refreshHistoryBtn = document.getElementById("refresh-history");
refreshHistoryBtn.addEventListener("click", () => refreshHistory());

refreshHistory();

// --- Partage sur les réseaux sociaux ---

const SIDEQUEST_REPO_URL = "https://github.com/NicolasFradin/sidequest";

function buildShareText() {
  return i18n.t("history.share.text", shareStats.streak, shareStats.week, shareStats.total);
}

async function shareTo(url) {
  await window.dashboardAPI.copyToClipboard(buildShareText());
  window.dashboardAPI.openExternal(url);
  showToast(i18n.t("history.share.toast"));
}

document.getElementById("share-linkedin-btn").addEventListener("click", () => {
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SIDEQUEST_REPO_URL)}`;
  shareTo(linkedinUrl);
});

document.getElementById("share-github-btn").addEventListener("click", () => {
  const githubUrl = `${SIDEQUEST_REPO_URL}/issues/new?title=${encodeURIComponent("Mon avancement SideQuest")}&body=${encodeURIComponent(buildShareText())}`;
  shareTo(githubUrl);
});

// --- Sides personnalisés ---

const DEFAULT_SIDE_ID = "sport-basic";

const sidesGrid = document.getElementById("sides-grid");
const sidesListView = document.getElementById("sides-list-view");
const sideEditView = document.getElementById("side-edit-view");
const sideEditTitle = document.getElementById("side-edit-title");
const sideNameInput = document.getElementById("side-name-input");
const sideExercisesList = document.getElementById("side-exercises-list");
const sideAddExerciseBtn = document.getElementById("side-add-exercise-btn");
const sideMascotOptionsContainer = document.getElementById("side-mascot-options");
const sideMascotAiIdea = document.getElementById("side-mascot-ai-idea");
const newSideBtn = document.getElementById("new-side-btn");
const importSideBtn = document.getElementById("import-side-btn");
const sideBackBtn = document.getElementById("side-back-btn");

let sidesState = { bundledSides: [], customSides: [], progress: {} };
/** Side en cours d'édition (copie locale) : { id, name, exercises, mascot, isBundled } */
let editingSide = null;

function allSides() {
  return [...sidesState.bundledSides, ...sidesState.customSides];
}

/** Image de la carte d'un side dans la galerie : sa propre mascotte si elle en a une (side
    importé avec sa propre image, éventuellement un palier de croissance selon le niveau XP
    du side) ; à défaut, un side bundled (SideGym...) retombe sur la mascotte globale
    actuellement choisie — c'est effectivement celle qui s'affichera à l'écran si ce side est
    activé — tandis qu'un side custom/importé/généré par IA retombe sur la mascotte SideQuest
    par défaut plutôt que d'hériter du skin visuel en cours. */
function sideCardMascotImage(side) {
  const level = sidesState.progress?.[side.id]?.level ?? 1;
  const stageImagePath = sqMascots.resolveSideMascotStage(side.mascot, level);
  const overrideUrl = stageImagePath
    ? `file://${stageImagePath}`
    : side.source !== "bundled"
      ? sqMascots.DEFAULT_SIDE_MASCOT_IMAGE
      : null;
  const mascotId = side.mascot?.id ?? currentSettings?.activeMascot ?? "ronnie-coleman";
  return sqMascots.resolveMascotImage(mascotId, currentSettings?.theme ?? "dark", overrideUrl);
}

function findSide(id) {
  return allSides().find((p) => p.id === id);
}

function sideExerciseCountLabel(side) {
  return i18n.t("sides.count", side.exercises.length);
}

function renderSidesGrid() {
  sidesGrid.innerHTML = "";
  allSides().forEach((side) => {
    const isBundled = side.source === "bundled";
    const isActive = currentSettings?.activeProgram === side.id;

    const card = document.createElement("div");
    card.className = "side-card";
    card.style.setProperty("--side-accent", sqMascots.resolveSideColor(side));

    const header = document.createElement("div");
    header.className = "side-card-header";

    const mascotThumb = document.createElement("img");
    mascotThumb.className = "side-card-mascot";
    mascotThumb.src = sideCardMascotImage(side);
    mascotThumb.alt = "";
    header.appendChild(mascotThumb);

    const name = document.createElement("span");
    name.className = "side-card-name";
    name.textContent = side.name;
    header.appendChild(name);

    const badges = document.createElement("div");
    badges.className = "side-card-badges";
    // Officiel (embarqué avec l'app) / Importé (fichier JSON) / Généré par IA / rien pour un
    // side créé à la main dans le dashboard ("Perso") — voir side.source, Phase 0 et
    // plan-llm-side-generation.md § 3.1 pour "generated".
    if (isBundled) {
      const bundledBadge = document.createElement("span");
      bundledBadge.className = "status-badge bundled";
      bundledBadge.textContent = i18n.t("sides.badge.bundled");
      badges.appendChild(bundledBadge);
    } else if (side.source === "imported") {
      const importedBadge = document.createElement("span");
      importedBadge.className = "status-badge imported";
      importedBadge.textContent = i18n.t("sides.badge.imported");
      badges.appendChild(importedBadge);
    } else if (side.source === "generated") {
      const generatedBadge = document.createElement("span");
      generatedBadge.className = "status-badge generated";
      generatedBadge.textContent = i18n.t("sides.badge.generated");
      badges.appendChild(generatedBadge);
    }
    if (isActive) {
      const activeBadge = document.createElement("span");
      activeBadge.className = "status-badge installed";
      activeBadge.textContent = i18n.t("sides.badge.active");
      badges.appendChild(activeBadge);
    }
    header.appendChild(badges);

    const count = document.createElement("p");
    count.className = "side-card-count";
    count.textContent = sideExerciseCountLabel(side);

    // Barre d'XP (gamification transverse à tous les sides) — voir Storage.addXp/getSideProgress.
    // Palier tous les 100 xp (formule v1 volontairement simple, cf. plan-marketplace-sides.md § 3.4).
    const progress = sidesState.progress?.[side.id] ?? { xp: 0, level: 1 };
    const xpBar = document.createElement("div");
    xpBar.className = "side-card-xp";
    const xpTrack = document.createElement("div");
    xpTrack.className = "side-card-xp-track";
    const xpFill = document.createElement("div");
    xpFill.className = "side-card-xp-fill";
    xpFill.style.width = `${progress.xp % 100}%`;
    xpTrack.appendChild(xpFill);
    const xpLabel = document.createElement("span");
    xpLabel.className = "side-card-xp-label";
    xpLabel.textContent = i18n.t("sides.level", progress.level);
    xpBar.append(xpTrack, xpLabel);

    const actions = document.createElement("div");
    actions.className = "side-card-actions";

    const openBtn = document.createElement("button");
    openBtn.className = "option-btn option-btn-sm";
    openBtn.textContent = i18n.t("sides.action.open");
    openBtn.addEventListener("click", () => openSideEditor(side.id));

    const duplicateBtn = document.createElement("button");
    duplicateBtn.className = "option-btn option-btn-sm";
    duplicateBtn.textContent = i18n.t("sides.action.duplicate");
    duplicateBtn.addEventListener("click", () => duplicateSide(side));

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "option-btn option-btn-sm";
    toggleBtn.textContent = isActive ? i18n.t("sides.action.deactivate") : i18n.t("sides.action.activate");
    // Un side sans quête ne doit jamais pouvoir être activé (main/index.js s'en protège aussi
    // en repliant sur le side par défaut, mais autant ne pas laisser l'UI proposer l'action).
    const isEmpty = side.exercises.length === 0;
    if (!isActive && isEmpty) {
      toggleBtn.disabled = true;
      toggleBtn.title = i18n.t("sides.action.disabledHint");
    } else {
      toggleBtn.addEventListener("click", () => activateSide(isActive ? DEFAULT_SIDE_ID : side.id));
    }

    const exportBtn = document.createElement("button");
    exportBtn.className = "option-btn option-btn-sm";
    exportBtn.textContent = i18n.t("sides.action.export");
    exportBtn.addEventListener("click", () => exportSide(side.id));

    actions.append(openBtn, duplicateBtn, toggleBtn, exportBtn);

    if (!isBundled) {
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "option-btn option-btn-sm option-btn-danger";
      deleteBtn.textContent = i18n.t("sides.action.delete");
      deleteBtn.addEventListener("click", () => deleteSide(side.id));
      actions.appendChild(deleteBtn);
    }

    card.append(header, count, xpBar, actions);
    sidesGrid.appendChild(card);
  });
}

async function activateSide(id) {
  await save({ activeProgram: id });
  renderSidesGrid();
}

async function duplicateSide(side) {
  const created = await window.dashboardAPI.createSide(
    `${side.name} (${i18n.t("sides.copySuffix")})`,
    structuredClone(side.exercises)
  );
  sidesState.customSides.push(created);
  openSideEditor(created.id);
  showToast(i18n.t("sides.toast.duplicated"));
}

async function exportSide(id) {
  const { exported } = await window.dashboardAPI.exportSide(id);
  if (exported) showToast(i18n.t("sides.toast.exported"));
}

async function importSide() {
  const { imported, error, side } = await window.dashboardAPI.importSide();
  if (error) {
    showToast(error, "warning");
    return;
  }
  if (!imported) return; // annulé par l'utilisateur, rien à faire
  sidesState.customSides.push(side);
  openSideEditor(side.id);
  showToast(i18n.t("sides.toast.imported"));
}

async function deleteSide(id) {
  if (!confirm(i18n.t("sides.confirmDelete"))) return;
  const nextSettings = await window.dashboardAPI.deleteSide(id);
  sidesState.customSides = sidesState.customSides.filter((p) => p.id !== id);
  applySettingsToUI(nextSettings);
  renderSidesGrid();
  showToast(i18n.t("sides.toast.deleted"));
}

function openSideEditor(id, aiMascotIdea) {
  const side = findSide(id);
  if (!side) return;
  editingSide = {
    id: side.id,
    name: side.name,
    exercises: structuredClone(side.exercises),
    mascot: side.mascot,
    isBundled: side.source === "bundled",
  };
  sideEditTitle.textContent = side.name;
  sideNameInput.value = side.name;
  sideNameInput.disabled = editingSide.isBundled;
  sideAddExerciseBtn.hidden = editingSide.isBundled;
  renderSideExercises();
  renderSideMascotOptions();
  // Idée de mascotte en texte suggérée par l'IA (dashboard:generate-side) — affichée une seule
  // fois à l'ouverture juste après une génération, jamais persistée (pas d'image générée).
  if (aiMascotIdea) {
    sideMascotAiIdea.textContent = i18n.t("sideEditor.aiMascotIdea", aiMascotIdea);
    sideMascotAiIdea.hidden = false;
  } else {
    sideMascotAiIdea.hidden = true;
  }
  sidesListView.hidden = true;
  sideEditView.hidden = false;
}

function closeSideEditor() {
  editingSide = null;
  sideEditView.hidden = true;
  sidesListView.hidden = false;
  renderSidesGrid();
}

/** Reconstruit les tuiles de mascotte de l'éditeur de side : toutes les mascottes embarquées
    (pas filtrées par thème, contrairement au sélecteur des réglages — l'identité d'un side ne
    dépend pas du skin choisi), la mascotte custom actuelle si le side en a une, et une case "+"
    pour en ajouter une (fichier local aujourd'hui ; génération IA envisagée plus tard, voir
    plan-marketplace-sides.md). Désactivée pour un side bundled, comme le reste de l'éditeur. */
function renderSideMascotOptions() {
  sideMascotOptionsContainer.innerHTML = "";
  const disabled = editingSide.isBundled;
  const activeMascotId = editingSide.mascot?.id;

  Object.keys(sqMascots.MASCOT_IMAGES).forEach((mascotId) => {
    const btn = document.createElement("button");
    btn.className = "mascot-option";
    btn.dataset.mascotId = mascotId;
    btn.classList.toggle("active", activeMascotId === mascotId);
    btn.disabled = disabled;

    const img = document.createElement("img");
    img.src = sqMascots.MASCOT_IMAGES[mascotId];
    img.alt = sqMascots.MASCOT_LABELS[mascotId] ?? mascotId;

    const label = document.createElement("span");
    label.textContent = sqMascots.MASCOT_LABELS[mascotId] ?? mascotId;

    btn.append(img, label);
    // Recliquer sur la tuile déjà active l'efface (retombe sur la mascotte globale) — même
    // convention "toggle" que le bouton Activer/Désactiver d'un side dans la galerie.
    if (!disabled) {
      btn.addEventListener("click", () =>
        activeMascotId === mascotId ? clearSideMascot() : setSideMascotBundled(mascotId)
      );
    }
    sideMascotOptionsContainer.appendChild(btn);
  });

  // Mascotte custom actuelle (id hors du catalogue embarqué : import avec sa propre image, ou
  // ajoutée ici via "+") — affichée comme tuile active en plus, pour rester visible/repérable.
  if (editingSide.mascot && !sqMascots.MASCOT_IMAGES[activeMascotId]) {
    const btn = document.createElement("button");
    btn.className = "mascot-option active";
    btn.disabled = disabled;

    const img = document.createElement("img");
    img.src = `file://${editingSide.mascot.imagePath}`;
    img.alt = editingSide.mascot.label;

    const label = document.createElement("span");
    label.textContent = i18n.t("sideEditor.mascotCustom");

    btn.append(img, label);
    // Recliquer efface (remplacer une custom = repasser par "+") — même convention toggle que les tuiles embarquées.
    if (!disabled) btn.addEventListener("click", () => clearSideMascot());
    sideMascotOptionsContainer.appendChild(btn);
  }

  if (!disabled) {
    const addBtn = document.createElement("button");
    addBtn.className = "mascot-option mascot-option-add";
    const plus = document.createElement("span");
    plus.className = "mascot-option-plus";
    plus.textContent = "+";
    const label = document.createElement("span");
    label.textContent = i18n.t("sideEditor.mascotAdd");
    addBtn.append(plus, label);
    addBtn.addEventListener("click", () => setSideMascotCustom());
    sideMascotOptionsContainer.appendChild(addBtn);
  }
}

/** Synchronise le cache local (galerie) avec un side renvoyé par le main process après une mise à jour de mascotte. */
function updateCachedSide(side) {
  const idx = sidesState.customSides.findIndex((p) => p.id === side.id);
  if (idx !== -1) sidesState.customSides[idx] = side;
}

async function clearSideMascot() {
  const { updated, side } = await window.dashboardAPI.clearSideMascot(editingSide.id);
  if (!updated) return;
  editingSide.mascot = side.mascot;
  updateCachedSide(side);
  renderSideMascotOptions();
}

async function setSideMascotBundled(mascotId) {
  const label = sqMascots.MASCOT_LABELS[mascotId] ?? mascotId;
  const { updated, side } = await window.dashboardAPI.setSideMascotBundled(editingSide.id, mascotId, label);
  if (!updated) return;
  editingSide.mascot = side.mascot;
  updateCachedSide(side);
  renderSideMascotOptions();
}

async function setSideMascotCustom() {
  const { updated, error, side } = await window.dashboardAPI.setSideMascotCustom(editingSide.id);
  if (error) {
    showToast(error, "warning");
    return;
  }
  if (!updated) return; // dialogue annulé par l'utilisateur
  editingSide.mascot = side.mascot;
  updateCachedSide(side);
  renderSideMascotOptions();
  showToast(i18n.t("sideEditor.toast.mascotUpdated"));
}

function renderSideExercises() {
  sideExercisesList.innerHTML = "";

  editingSide.exercises.forEach((exercise, index) => {
    const row = document.createElement("div");
    row.className = "side-exercise-row";

    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.className = "text-input side-exercise-label";
    labelInput.placeholder = i18n.t("sideEditor.labelPlaceholder");
    labelInput.value = exercise.label;
    labelInput.disabled = editingSide.isBundled;
    labelInput.addEventListener("change", () => updateExerciseField(index, "label", labelInput.value));

    const categoryInput = document.createElement("input");
    categoryInput.type = "text";
    categoryInput.className = "text-input side-exercise-category";
    categoryInput.placeholder = i18n.t("sideEditor.categoryPlaceholder");
    categoryInput.setAttribute("list", "exercise-category-options");
    categoryInput.value = exercise.category;
    categoryInput.disabled = editingSide.isBundled;
    categoryInput.addEventListener("change", () => updateExerciseField(index, "category", categoryInput.value));

    const durationInput = document.createElement("input");
    durationInput.type = "number";
    durationInput.min = "5";
    durationInput.step = "5";
    durationInput.placeholder = i18n.t("sideEditor.durationPlaceholder");
    durationInput.className = "text-input side-exercise-duration";
    durationInput.value = exercise.durationSec ?? "";
    durationInput.disabled = editingSide.isBundled;
    durationInput.addEventListener("change", () => {
      // Optionnel (voir Exercise.durationSec côté core) : champ vidé -> pas de minuteur pour cette
      // quest dans l'overlay, plutôt qu'un repli silencieux sur une durée par défaut.
      const raw = durationInput.value.trim();
      updateExerciseField(index, "durationSec", raw === "" ? undefined : Math.max(5, Number(raw) || 5));
    });

    row.append(labelInput, categoryInput, durationInput);

    if (!editingSide.isBundled) {
      const removeBtn = document.createElement("button");
      removeBtn.className = "side-exercise-remove-btn";
      removeBtn.textContent = "✕";
      removeBtn.title = i18n.t("sideEditor.removeExerciseTitle");
      removeBtn.addEventListener("click", () => removeExercise(index));
      row.appendChild(removeBtn);
    }

    sideExercisesList.appendChild(row);
  });

  if (editingSide.exercises.length === 0) {
    const empty = document.createElement("p");
    empty.className = "sides-empty-hint";
    empty.textContent = i18n.t("sideEditor.emptyHint");
    sideExercisesList.appendChild(empty);
  }
}

async function persistEditingSide() {
  const updated = await window.dashboardAPI.updateSide(editingSide.id, {
    name: editingSide.name,
    exercises: editingSide.exercises,
  });
  const idx = sidesState.customSides.findIndex((p) => p.id === updated.id);
  if (idx !== -1) sidesState.customSides[idx] = updated;
  showToast("Enregistré");
}

function updateExerciseField(index, field, value) {
  editingSide.exercises[index][field] = value;
  persistEditingSide();
}

function removeExercise(index) {
  editingSide.exercises.splice(index, 1);
  renderSideExercises();
  persistEditingSide();
}

sideAddExerciseBtn.addEventListener("click", () => {
  editingSide.exercises.push({ id: crypto.randomUUID(), label: "", durationSec: 30, category: "" });
  renderSideExercises();
  persistEditingSide();
});

sideNameInput.addEventListener("change", () => {
  editingSide.name = sideNameInput.value.trim() || i18n.t("sides.noNameFallback");
  sideNameInput.value = editingSide.name;
  sideEditTitle.textContent = editingSide.name;
  persistEditingSide();
});

newSideBtn.addEventListener("click", async () => {
  const created = await window.dashboardAPI.createSide(i18n.t("sides.defaultNewName"), []);
  sidesState.customSides.push(created);
  openSideEditor(created.id);
});

importSideBtn.addEventListener("click", () => importSide());

sideBackBtn.addEventListener("click", () => closeSideEditor());

async function refreshSides() {
  const { bundledSides, customSides } = await window.dashboardAPI.getSides();
  const sides = [...bundledSides, ...customSides];
  const progressEntries = await Promise.all(
    sides.map(async (p) => [p.id, await window.dashboardAPI.getSideProgress(p.id)])
  );
  sidesState = { bundledSides, customSides, progress: Object.fromEntries(progressEntries) };
  renderSidesGrid();
}
