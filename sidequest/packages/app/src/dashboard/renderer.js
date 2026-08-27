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
  plans: document.getElementById("panel-plans"),
  history: document.getElementById("panel-history"),
};

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.toggle("active", t === tab));
    Object.entries(panels).forEach(([key, panel]) =>
      panel.classList.toggle("active", key === tab.dataset.tab)
    );
    if (tab.dataset.tab === "history") refreshHistory();
    if (tab.dataset.tab === "plans") refreshPlans();
  });
});

const intervalRange = document.getElementById("interval-range");
const intervalValue = document.getElementById("interval-value");
const modeButtons = [...document.querySelectorAll("#mode-options .option-btn")];
const triggerSourceButtons = [...document.querySelectorAll("#trigger-source-options .option-btn")];
const hookTriggerModeButtons = [...document.querySelectorAll("#hook-trigger-mode-options .option-btn")];
const mascotOptionsContainer = document.getElementById("mascot-options");
const visualThemeButtons = [...document.querySelectorAll("#visual-theme-options .visual-theme-bubble")];
const hookEveryNInput = document.getElementById("hook-every-n-input");
const autolaunchToggle = document.getElementById("autolaunch-toggle");
const toast = document.getElementById("toast");

function formatInterval(minutes) {
  return minutes < 1 ? `${Math.round(minutes * 60)} sec` : `${minutes} min`;
}

/** Reconstruit les boutons de mascotte pour ne proposer que celles du thème actif — l'aperçu de
    chacune suit le mode clair/sombre (ex. sergent désertique en clair, forêt en sombre). */
function renderMascotOptions(visualTheme, activeMascot, theme) {
  const mascotIds = sqMascots.MASCOTS_BY_THEME[visualTheme] ?? sqMascots.MASCOTS_BY_THEME["miami-80s"];
  mascotOptionsContainer.innerHTML = "";
  mascotIds.forEach((mascotId) => {
    const btn = document.createElement("button");
    btn.className = "mascot-option";
    btn.classList.toggle("active", mascotId === activeMascot);
    btn.dataset.mascot = mascotId;

    const img = document.createElement("img");
    img.src = sqMascots.resolveMascotImage(mascotId, theme);
    img.alt = sqMascots.MASCOT_LABELS[mascotId] ?? mascotId;

    const label = document.createElement("span");
    label.textContent = sqMascots.MASCOT_LABELS[mascotId] ?? mascotId;

    btn.append(img, label);
    btn.addEventListener("click", () => save({ activeMascot: mascotId }));
    mascotOptionsContainer.appendChild(btn);
  });
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
  renderMascotOptions(settings.visualTheme, settings.activeMascot, settings.theme);
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
    // refreshPlans() (re-fetch IPC), pas juste renderPlansGrid() (re-rendu du cache) : les packs
    // embarqués sont traduits côté main process (translatePack(), voir @sidequest/core) selon la
    // langue au moment de l'appel — un simple re-rendu du cache garderait l'ancienne langue.
    refreshPlans();
    if (editingPlan) renderPlanExercises();
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

// --- Génération de pack par IA (plan-llm-pack-generation.md) ---

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

// --- Bouton "Générer" de la galerie de packs ---

const generatePlanBtn = document.getElementById("generate-plan-btn");
const generatePlanModal = document.getElementById("generate-plan-modal");
const generatePlanPrompt = document.getElementById("generate-plan-prompt");
const generatePlanError = document.getElementById("generate-plan-error");
const generatePlanCancelBtn = document.getElementById("generate-plan-cancel-btn");
const generatePlanSubmitBtn = document.getElementById("generate-plan-submit-btn");

generatePlanBtn.addEventListener("click", () => {
  // Pas de fournisseur configuré : on n'ouvre pas la modale pour rien, on renvoie vers les
  // réglages (même logique de "découverte progressive" que le bouton d'intégration Claude Code,
  // toujours visible avec un état actionnable plutôt que masqué).
  if (currentSettings.llmProvider === "none") {
    tabs.find((tab) => tab.dataset.tab === "settings")?.click();
    showToast(i18n.t("llm.toast.configureFirst"), "warning");
    return;
  }
  generatePlanPrompt.value = "";
  generatePlanError.hidden = true;
  generatePlanModal.hidden = false;
  generatePlanPrompt.focus();
});

generatePlanCancelBtn.addEventListener("click", () => {
  generatePlanModal.hidden = true;
});

generatePlanSubmitBtn.addEventListener("click", async () => {
  const prompt = generatePlanPrompt.value.trim();
  if (!prompt) return;

  generatePlanSubmitBtn.disabled = true;
  generatePlanSubmitBtn.textContent = i18n.t("plans.generateModal.submitting");
  generatePlanError.hidden = true;

  const { generated, error, plan } = await window.dashboardAPI.generatePlan(prompt);

  generatePlanSubmitBtn.disabled = false;
  generatePlanSubmitBtn.textContent = i18n.t("plans.generateModal.submit");

  if (!generated) {
    generatePlanError.textContent = error;
    generatePlanError.hidden = false;
    return;
  }

  generatePlanModal.hidden = true;
  plansState.customPlans.push(plan);
  openPlanEditor(plan.id);
  showToast(i18n.t("plans.toast.generated"));
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
}

const refreshHistoryBtn = document.getElementById("refresh-history");
refreshHistoryBtn.addEventListener("click", () => refreshHistory());

refreshHistory();

// --- Plans d'entraînement personnalisés ---

const DEFAULT_PLAN_ID = "sport-basic";

const plansGrid = document.getElementById("plans-grid");
const plansListView = document.getElementById("plans-list-view");
const planEditView = document.getElementById("plan-edit-view");
const planEditTitle = document.getElementById("plan-edit-title");
const planNameInput = document.getElementById("plan-name-input");
const planExercisesList = document.getElementById("plan-exercises-list");
const planAddExerciseBtn = document.getElementById("plan-add-exercise-btn");
const planMascotOptionsContainer = document.getElementById("plan-mascot-options");
const newPlanBtn = document.getElementById("new-plan-btn");
const importPlanBtn = document.getElementById("import-plan-btn");
const planBackBtn = document.getElementById("plan-back-btn");

let plansState = { bundledPacks: [], customPlans: [], progress: {} };
/** Plan en cours d'édition (copie locale) : { id, name, exercises, mascot, isBundled } */
let editingPlan = null;

function allPlans() {
  return [...plansState.bundledPacks, ...plansState.customPlans];
}

/** Image de la carte d'un pack dans la galerie : sa propre mascotte si elle en a une (pack
    importé avec sa propre image, éventuellement un palier de croissance selon le niveau XP
    du pack), sinon la mascotte globale actuellement choisie — c'est effectivement celle qui
    s'affichera à l'écran si ce pack est activé. */
function planCardMascotImage(plan) {
  const level = plansState.progress?.[plan.id]?.level ?? 1;
  const stageImagePath = sqMascots.resolvePackMascotStage(plan.mascot, level);
  const overrideUrl = stageImagePath ? `file://${stageImagePath}` : null;
  const mascotId = plan.mascot?.id ?? currentSettings?.activeMascot ?? "ronnie-coleman";
  return sqMascots.resolveMascotImage(mascotId, currentSettings?.theme ?? "dark", overrideUrl);
}

function findPlan(id) {
  return allPlans().find((p) => p.id === id);
}

function planExerciseCountLabel(plan) {
  return i18n.t("plans.count", plan.exercises.length);
}

function renderPlansGrid() {
  plansGrid.innerHTML = "";
  allPlans().forEach((plan) => {
    const isBundled = plan.source === "bundled";
    const isActive = currentSettings?.activeProgram === plan.id;

    const card = document.createElement("div");
    card.className = "plan-card";
    card.style.setProperty("--pack-accent", sqMascots.resolvePackColor(plan));

    const header = document.createElement("div");
    header.className = "plan-card-header";

    const mascotThumb = document.createElement("img");
    mascotThumb.className = "plan-card-mascot";
    mascotThumb.src = planCardMascotImage(plan);
    mascotThumb.alt = "";
    header.appendChild(mascotThumb);

    const name = document.createElement("span");
    name.className = "plan-card-name";
    name.textContent = plan.name;
    header.appendChild(name);

    const badges = document.createElement("div");
    badges.className = "plan-card-badges";
    // Officiel (embarqué avec l'app) / Importé (fichier JSON) / Généré par IA / rien pour un
    // pack créé à la main dans le dashboard ("Perso") — voir plan.source, Phase 0 et
    // plan-llm-pack-generation.md § 3.1 pour "generated".
    if (isBundled) {
      const bundledBadge = document.createElement("span");
      bundledBadge.className = "status-badge bundled";
      bundledBadge.textContent = i18n.t("plans.badge.bundled");
      badges.appendChild(bundledBadge);
    } else if (plan.source === "imported") {
      const importedBadge = document.createElement("span");
      importedBadge.className = "status-badge imported";
      importedBadge.textContent = i18n.t("plans.badge.imported");
      badges.appendChild(importedBadge);
    } else if (plan.source === "generated") {
      const generatedBadge = document.createElement("span");
      generatedBadge.className = "status-badge generated";
      generatedBadge.textContent = i18n.t("plans.badge.generated");
      badges.appendChild(generatedBadge);
    }
    if (isActive) {
      const activeBadge = document.createElement("span");
      activeBadge.className = "status-badge installed";
      activeBadge.textContent = i18n.t("plans.badge.active");
      badges.appendChild(activeBadge);
    }
    header.appendChild(badges);

    const count = document.createElement("p");
    count.className = "plan-card-count";
    count.textContent = planExerciseCountLabel(plan);

    // Barre d'XP (gamification transverse à tous les packs) — voir Storage.addXp/getPackProgress.
    // Palier tous les 100 xp (formule v1 volontairement simple, cf. plan-marketplace-packs.md § 3.4).
    const progress = plansState.progress?.[plan.id] ?? { xp: 0, level: 1 };
    const xpBar = document.createElement("div");
    xpBar.className = "plan-card-xp";
    const xpTrack = document.createElement("div");
    xpTrack.className = "plan-card-xp-track";
    const xpFill = document.createElement("div");
    xpFill.className = "plan-card-xp-fill";
    xpFill.style.width = `${progress.xp % 100}%`;
    xpTrack.appendChild(xpFill);
    const xpLabel = document.createElement("span");
    xpLabel.className = "plan-card-xp-label";
    xpLabel.textContent = i18n.t("plans.level", progress.level);
    xpBar.append(xpTrack, xpLabel);

    const actions = document.createElement("div");
    actions.className = "plan-card-actions";

    const openBtn = document.createElement("button");
    openBtn.className = "option-btn option-btn-sm";
    openBtn.textContent = i18n.t("plans.action.open");
    openBtn.addEventListener("click", () => openPlanEditor(plan.id));

    const duplicateBtn = document.createElement("button");
    duplicateBtn.className = "option-btn option-btn-sm";
    duplicateBtn.textContent = i18n.t("plans.action.duplicate");
    duplicateBtn.addEventListener("click", () => duplicatePlan(plan));

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "option-btn option-btn-sm";
    toggleBtn.textContent = isActive ? i18n.t("plans.action.deactivate") : i18n.t("plans.action.activate");
    // Un plan sans exercice ne doit jamais pouvoir être activé (main/index.js s'en protège aussi
    // en repliant sur le plan par défaut, mais autant ne pas laisser l'UI proposer l'action).
    const isEmpty = plan.exercises.length === 0;
    if (!isActive && isEmpty) {
      toggleBtn.disabled = true;
      toggleBtn.title = i18n.t("plans.action.disabledHint");
    } else {
      toggleBtn.addEventListener("click", () => activatePlan(isActive ? DEFAULT_PLAN_ID : plan.id));
    }

    const exportBtn = document.createElement("button");
    exportBtn.className = "option-btn option-btn-sm";
    exportBtn.textContent = i18n.t("plans.action.export");
    exportBtn.addEventListener("click", () => exportPlan(plan.id));

    actions.append(openBtn, duplicateBtn, toggleBtn, exportBtn);

    if (!isBundled) {
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "option-btn option-btn-sm option-btn-danger";
      deleteBtn.textContent = i18n.t("plans.action.delete");
      deleteBtn.addEventListener("click", () => deletePlan(plan.id));
      actions.appendChild(deleteBtn);
    }

    card.append(header, count, xpBar, actions);
    plansGrid.appendChild(card);
  });
}

async function activatePlan(id) {
  await save({ activeProgram: id });
  renderPlansGrid();
}

async function duplicatePlan(plan) {
  const created = await window.dashboardAPI.createPlan(
    `${plan.name} (${i18n.t("plans.copySuffix")})`,
    structuredClone(plan.exercises)
  );
  plansState.customPlans.push(created);
  openPlanEditor(created.id);
  showToast(i18n.t("plans.toast.duplicated"));
}

async function exportPlan(id) {
  const { exported } = await window.dashboardAPI.exportPlan(id);
  if (exported) showToast(i18n.t("plans.toast.exported"));
}

async function importPlan() {
  const { imported, error, plan } = await window.dashboardAPI.importPlan();
  if (error) {
    showToast(error, "warning");
    return;
  }
  if (!imported) return; // annulé par l'utilisateur, rien à faire
  plansState.customPlans.push(plan);
  openPlanEditor(plan.id);
  showToast(i18n.t("plans.toast.imported"));
}

async function deletePlan(id) {
  if (!confirm(i18n.t("plans.confirmDelete"))) return;
  const nextSettings = await window.dashboardAPI.deletePlan(id);
  plansState.customPlans = plansState.customPlans.filter((p) => p.id !== id);
  applySettingsToUI(nextSettings);
  renderPlansGrid();
  showToast(i18n.t("plans.toast.deleted"));
}

function openPlanEditor(id) {
  const plan = findPlan(id);
  if (!plan) return;
  editingPlan = {
    id: plan.id,
    name: plan.name,
    exercises: structuredClone(plan.exercises),
    mascot: plan.mascot,
    isBundled: plan.source === "bundled",
  };
  planEditTitle.textContent = plan.name;
  planNameInput.value = plan.name;
  planNameInput.disabled = editingPlan.isBundled;
  planAddExerciseBtn.hidden = editingPlan.isBundled;
  renderPlanExercises();
  renderPlanMascotOptions();
  plansListView.hidden = true;
  planEditView.hidden = false;
}

function closePlanEditor() {
  editingPlan = null;
  planEditView.hidden = true;
  plansListView.hidden = false;
  renderPlansGrid();
}

/** Reconstruit les tuiles de mascotte de l'éditeur de pack : toutes les mascottes embarquées
    (pas filtrées par thème, contrairement au sélecteur des réglages — l'identité d'un pack ne
    dépend pas du skin choisi), la mascotte custom actuelle si le pack en a une, et une case "+"
    pour en ajouter une (fichier local aujourd'hui ; génération IA envisagée plus tard, voir
    plan-marketplace-packs.md). Désactivée pour un pack bundled, comme le reste de l'éditeur. */
function renderPlanMascotOptions() {
  planMascotOptionsContainer.innerHTML = "";
  const disabled = editingPlan.isBundled;
  const activeMascotId = editingPlan.mascot?.id;

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
    // convention "toggle" que le bouton Activer/Désactiver d'un pack dans la galerie.
    if (!disabled) {
      btn.addEventListener("click", () =>
        activeMascotId === mascotId ? clearPlanMascot() : setPlanMascotBundled(mascotId)
      );
    }
    planMascotOptionsContainer.appendChild(btn);
  });

  // Mascotte custom actuelle (id hors du catalogue embarqué : import avec sa propre image, ou
  // ajoutée ici via "+") — affichée comme tuile active en plus, pour rester visible/repérable.
  if (editingPlan.mascot && !sqMascots.MASCOT_IMAGES[activeMascotId]) {
    const btn = document.createElement("button");
    btn.className = "mascot-option active";
    btn.disabled = disabled;

    const img = document.createElement("img");
    img.src = `file://${editingPlan.mascot.imagePath}`;
    img.alt = editingPlan.mascot.label;

    const label = document.createElement("span");
    label.textContent = i18n.t("planEditor.mascotCustom");

    btn.append(img, label);
    // Recliquer efface (remplacer une custom = repasser par "+") — même convention toggle que les tuiles embarquées.
    if (!disabled) btn.addEventListener("click", () => clearPlanMascot());
    planMascotOptionsContainer.appendChild(btn);
  }

  if (!disabled) {
    const addBtn = document.createElement("button");
    addBtn.className = "mascot-option mascot-option-add";
    const plus = document.createElement("span");
    plus.className = "mascot-option-plus";
    plus.textContent = "+";
    const label = document.createElement("span");
    label.textContent = i18n.t("planEditor.mascotAdd");
    addBtn.append(plus, label);
    addBtn.addEventListener("click", () => setPlanMascotCustom());
    planMascotOptionsContainer.appendChild(addBtn);
  }
}

/** Synchronise le cache local (galerie) avec un plan renvoyé par le main process après une mise à jour de mascotte. */
function updateCachedPlan(plan) {
  const idx = plansState.customPlans.findIndex((p) => p.id === plan.id);
  if (idx !== -1) plansState.customPlans[idx] = plan;
}

async function clearPlanMascot() {
  const { updated, plan } = await window.dashboardAPI.clearPlanMascot(editingPlan.id);
  if (!updated) return;
  editingPlan.mascot = plan.mascot;
  updateCachedPlan(plan);
  renderPlanMascotOptions();
}

async function setPlanMascotBundled(mascotId) {
  const label = sqMascots.MASCOT_LABELS[mascotId] ?? mascotId;
  const { updated, plan } = await window.dashboardAPI.setPlanMascotBundled(editingPlan.id, mascotId, label);
  if (!updated) return;
  editingPlan.mascot = plan.mascot;
  updateCachedPlan(plan);
  renderPlanMascotOptions();
}

async function setPlanMascotCustom() {
  const { updated, error, plan } = await window.dashboardAPI.setPlanMascotCustom(editingPlan.id);
  if (error) {
    showToast(error, "warning");
    return;
  }
  if (!updated) return; // dialogue annulé par l'utilisateur
  editingPlan.mascot = plan.mascot;
  updateCachedPlan(plan);
  renderPlanMascotOptions();
  showToast(i18n.t("planEditor.toast.mascotUpdated"));
}

function renderPlanExercises() {
  planExercisesList.innerHTML = "";

  editingPlan.exercises.forEach((exercise, index) => {
    const row = document.createElement("div");
    row.className = "plan-exercise-row";

    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.className = "text-input plan-exercise-label";
    labelInput.placeholder = i18n.t("planEditor.labelPlaceholder");
    labelInput.value = exercise.label;
    labelInput.disabled = editingPlan.isBundled;
    labelInput.addEventListener("change", () => updateExerciseField(index, "label", labelInput.value));

    const categoryInput = document.createElement("input");
    categoryInput.type = "text";
    categoryInput.className = "text-input plan-exercise-category";
    categoryInput.placeholder = i18n.t("planEditor.categoryPlaceholder");
    categoryInput.setAttribute("list", "exercise-category-options");
    categoryInput.value = exercise.category;
    categoryInput.disabled = editingPlan.isBundled;
    categoryInput.addEventListener("change", () => updateExerciseField(index, "category", categoryInput.value));

    const durationInput = document.createElement("input");
    durationInput.type = "number";
    durationInput.min = "5";
    durationInput.step = "5";
    durationInput.className = "text-input plan-exercise-duration";
    durationInput.value = exercise.durationSec;
    durationInput.disabled = editingPlan.isBundled;
    durationInput.addEventListener("change", () =>
      updateExerciseField(index, "durationSec", Math.max(5, Number(durationInput.value) || 5))
    );

    row.append(labelInput, categoryInput, durationInput);

    if (!editingPlan.isBundled) {
      const removeBtn = document.createElement("button");
      removeBtn.className = "plan-exercise-remove-btn";
      removeBtn.textContent = "✕";
      removeBtn.title = i18n.t("planEditor.removeExerciseTitle");
      removeBtn.addEventListener("click", () => removeExercise(index));
      row.appendChild(removeBtn);
    }

    planExercisesList.appendChild(row);
  });

  if (editingPlan.exercises.length === 0) {
    const empty = document.createElement("p");
    empty.className = "plans-empty-hint";
    empty.textContent = i18n.t("planEditor.emptyHint");
    planExercisesList.appendChild(empty);
  }
}

async function persistEditingPlan() {
  const updated = await window.dashboardAPI.updatePlan(editingPlan.id, {
    name: editingPlan.name,
    exercises: editingPlan.exercises,
  });
  const idx = plansState.customPlans.findIndex((p) => p.id === updated.id);
  if (idx !== -1) plansState.customPlans[idx] = updated;
  showToast("Enregistré");
}

function updateExerciseField(index, field, value) {
  editingPlan.exercises[index][field] = value;
  persistEditingPlan();
}

function removeExercise(index) {
  editingPlan.exercises.splice(index, 1);
  renderPlanExercises();
  persistEditingPlan();
}

planAddExerciseBtn.addEventListener("click", () => {
  editingPlan.exercises.push({ id: crypto.randomUUID(), label: "", durationSec: 30, category: "" });
  renderPlanExercises();
  persistEditingPlan();
});

planNameInput.addEventListener("change", () => {
  editingPlan.name = planNameInput.value.trim() || i18n.t("plans.noNameFallback");
  planNameInput.value = editingPlan.name;
  planEditTitle.textContent = editingPlan.name;
  persistEditingPlan();
});

newPlanBtn.addEventListener("click", async () => {
  const created = await window.dashboardAPI.createPlan(i18n.t("plans.defaultNewName"), []);
  plansState.customPlans.push(created);
  openPlanEditor(created.id);
});

importPlanBtn.addEventListener("click", () => importPlan());

planBackBtn.addEventListener("click", () => closePlanEditor());

async function refreshPlans() {
  const { bundledPacks, customPlans } = await window.dashboardAPI.getPlans();
  const packs = [...bundledPacks, ...customPlans];
  const progressEntries = await Promise.all(
    packs.map(async (p) => [p.id, await window.dashboardAPI.getPackProgress(p.id)])
  );
  plansState = { bundledPacks, customPlans, progress: Object.fromEntries(progressEntries) };
  renderPlansGrid();
}
