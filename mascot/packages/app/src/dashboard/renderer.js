const themeToggle = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon");

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeIcon.textContent = theme === "dark" ? "🌙" : "☀️";
}

themeToggle.addEventListener("click", async () => {
  const isDark = document.documentElement.dataset.theme === "dark";
  const nextTheme = isDark ? "light" : "dark";
  applyTheme(nextTheme);
  await window.dashboardAPI.updateSettings({ theme: nextTheme });
});

const MASCOT_LABELS = {
  "ronnie-coleman": "Ronnie Coleman",
  "miami-80s": "Miami 80s",
  "arnold-80s": "Arnold 80s",
  sergeant: "Sergent",
  "sergeant-desert": "Sergent (désert)",
  goku: "Goku",
  centurion: "Centurion",
};
const MASCOT_IMAGES = {
  "ronnie-coleman": "../../assets/mascots/ronnie-coleman.png",
  "miami-80s": "../../assets/mascots/miami-80s.png",
  "arnold-80s": "../../assets/mascots/arnold-80s.png",
  sergeant: "../../assets/mascots/sergeant.png",
  "sergeant-desert": "../../assets/mascots/sergeant-desert.png",
  goku: "../../assets/mascots/goku.png",
  centurion: "../../assets/mascots/centurion.png",
};
/** Mascottes disponibles selon le thème global (skin) actif — voir docs/plan-theme-global.md sprint 3. */
const MASCOTS_BY_THEME = {
  "miami-80s": ["ronnie-coleman", "miami-80s", "arnold-80s"],
  "military-camo": ["sergeant", "sergeant-desert"],
  dragonball: ["goku"],
  "roman-empire": ["centurion"],
};

const tabs = [...document.querySelectorAll(".nav-item")];
const panels = {
  settings: document.getElementById("panel-settings"),
  history: document.getElementById("panel-history"),
};

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.toggle("active", t === tab));
    Object.entries(panels).forEach(([key, panel]) =>
      panel.classList.toggle("active", key === tab.dataset.tab)
    );
    if (tab.dataset.tab === "history") refreshHistory();
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

/** Reconstruit les boutons de mascotte pour ne proposer que celles du thème actif. */
function renderMascotOptions(visualTheme, activeMascot) {
  const mascotIds = MASCOTS_BY_THEME[visualTheme] ?? MASCOTS_BY_THEME["miami-80s"];
  mascotOptionsContainer.innerHTML = "";
  mascotIds.forEach((mascotId) => {
    const btn = document.createElement("button");
    btn.className = "mascot-option";
    btn.classList.toggle("active", mascotId === activeMascot);
    btn.dataset.mascot = mascotId;

    const img = document.createElement("img");
    img.src = MASCOT_IMAGES[mascotId];
    img.alt = MASCOT_LABELS[mascotId] ?? mascotId;

    const label = document.createElement("span");
    label.textContent = MASCOT_LABELS[mascotId] ?? mascotId;

    btn.append(img, label);
    btn.addEventListener("click", () => save({ activeMascot: mascotId }));
    mascotOptionsContainer.appendChild(btn);
  });
}

let currentSettings = null;

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
  renderMascotOptions(settings.visualTheme, settings.activeMascot);
  visualThemeButtons.forEach((btn) =>
    btn.classList.toggle("active", btn.dataset.visualTheme === settings.visualTheme)
  );
  hookEveryNInput.value = settings.hookEveryN;
  autolaunchToggle.checked = settings.autolaunch;
  applyTheme(settings.theme);
  document.documentElement.dataset.visualTheme = settings.visualTheme;
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
    showToast("Enregistré");
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
    const validMascots = MASCOTS_BY_THEME[nextTheme] ?? [];
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
  hookStatusBadge.textContent = installed ? "Activé" : "Non activé";
  hookStatusBadge.className = `status-badge ${installed ? "installed" : "not-installed"}`;
  hookToggleBtn.textContent = installed ? "Désactiver" : "Activer l'intégration";
}

hookToggleBtn.addEventListener("click", async () => {
  const currentlyInstalled = hookStatusBadge.classList.contains("installed");
  const nowInstalled = currentlyInstalled
    ? await window.dashboardAPI.uninstallHook()
    : await window.dashboardAPI.installHook();
  applyHookStatus(nowInstalled);
  showToast(nowInstalled ? "Intégration Claude Code activée" : "Intégration Claude Code désactivée");
});

window.dashboardAPI.isHookInstalled().then(applyHookStatus);

const statStreak = document.getElementById("stat-streak");
const statWeek = document.getElementById("stat-week");
const statTotal = document.getElementById("stat-total");
const statDebt = document.getElementById("stat-debt");
const barChart = document.getElementById("bar-chart");
const historyTableBody = document.getElementById("history-table-body");
const historyEmpty = document.getElementById("history-empty");

const STATUS_LABELS = { done: "Fait", skipped: "Passé", missed: "Manqué" };
const MODE_LABELS = { notify: "Notification douce", gate: "Blocage réel", mixed: "Mixte" };

function dayKey(timestamp) {
  return timestamp.slice(0, 10);
}

function formatDateTime(timestamp) {
  return new Date(timestamp).toLocaleString("fr-FR", {
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
    days.push({ label: d.toLocaleDateString("fr-FR", { weekday: "short" }), count });
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
    mascotImg.src = MASCOT_IMAGES[session.mascot] ?? MASCOT_IMAGES["ronnie-coleman"];
    mascotImg.alt = "";
    const mascotLabel = document.createElement("span");
    mascotLabel.textContent = MASCOT_LABELS[session.mascot] ?? session.mascot;
    mascotWrap.append(mascotImg, mascotLabel);
    mascotCell.appendChild(mascotWrap);

    const modeCell = document.createElement("td");
    modeCell.textContent = MODE_LABELS[session.mode] ?? session.mode;

    const statusCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = `status-badge ${session.status}`;
    badge.textContent = STATUS_LABELS[session.status] ?? session.status;
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
