// Pas de déstructuration ici : les <script> classiques partagent la même portée de haut niveau
// dans le document, donc `const { resolveMascotImage } = ...` entrerait en conflit avec la
// `function resolveMascotImage` déjà déclarée par shared/mascots.js (chargé juste avant).
const sqMascots = window.sqMascots;
const sqMilestones = window.sqMilestones;

const mascotImg = document.getElementById("mascot-img");
const exerciseLabel = document.getElementById("exercise-label");
const btnDone = document.getElementById("btn-done");
const btnSkip = document.getElementById("btn-skip");
const btnSettings = document.getElementById("btn-settings");
const blockingBadge = document.getElementById("blocking-badge");
const miniTimer = document.getElementById("mini-timer");
const miniTimerFill = document.getElementById("mini-timer-fill");
const milestoneBanner = document.getElementById("milestone-banner");
const milestoneBadgeImg = document.getElementById("milestone-badge-img");
const milestoneText = document.getElementById("milestone-text");

let currentMascotId = null;
let currentMascotImage = null;

/**
 * Sablier qui se vide : on remet la bulle à 100% sans transition, on force un reflow (sinon le
 * navigateur fusionne les deux changements de hauteur et saute direct à 0%, pas d'animation
 * visible), puis on relance une transition dont la durée colle à exercise.durationSec.
 * durationSec est optionnel côté quest (voir Exercise.durationSec dans @sidequest/core) : sans
 * valeur, on masque carrément la bulle plutôt que de retomber sur une durée par défaut arbitraire.
 */
function startMiniTimer(durationSec) {
  const seconds = Number(durationSec);
  if (!(seconds > 0)) {
    miniTimer.hidden = true;
    return;
  }
  miniTimer.hidden = false;
  miniTimerFill.style.transition = "none";
  miniTimerFill.style.height = "100%";
  void miniTimerFill.offsetHeight;
  miniTimerFill.style.transition = `height ${seconds}s linear`;
  miniTimerFill.style.height = "0%";
}

window.mascotAPI.onShowExercise(({ exercise, mascot, mascotImage, sideColor, theme, blocking, language }) => {
  currentMascotId = mascot;
  currentMascotImage = mascotImage ?? null;
  mascotImg.src = sqMascots.resolveMascotImage(mascot, theme ?? "dark", currentMascotImage);
  exerciseLabel.textContent = exercise.label;
  startMiniTimer(exercise.durationSec);
  // Un palier affiché lors d'une quest ne doit jamais traîner sur la suivante.
  milestoneBanner.hidden = true;
  milestoneBanner.classList.remove("visible");
  document.documentElement.dataset.theme = theme ?? "dark";
  document.documentElement.lang = language ?? "fr";
  i18n.setLanguage(language ?? "fr");
  i18n.applyStaticTranslations();
  btnSkip.hidden = Boolean(blocking);
  blockingBadge.hidden = !blocking;
  // Ambiance couleur du side actif (fond de la bulle "C'est fait") — voir style.css.
  // removeProperty plutôt qu'une valeur vide : une custom property posée à "" reste valide et ne
  // retombe pas sur le fallback de var(--side-accent, ...).
  if (sideColor) {
    document.documentElement.style.setProperty("--side-accent", sideColor);
  } else {
    document.documentElement.style.removeProperty("--side-accent");
  }
});

window.mascotAPI.onMilestoneReached(({ level }) => {
  const badge = sqMilestones.getBadgeForLevel(level);
  milestoneBadgeImg.src = badge.image;
  milestoneText.textContent = `${i18n.t("overlay.level")} ${badge.level}`;
  milestoneBanner.hidden = false;
  requestAnimationFrame(() => milestoneBanner.classList.add("visible"));
});

window.mascotAPI.onThemeChanged((theme) => {
  document.documentElement.dataset.theme = theme;
  if (currentMascotId) mascotImg.src = sqMascots.resolveMascotImage(currentMascotId, theme, currentMascotImage);
});

window.mascotAPI.onLanguageChanged((language) => {
  document.documentElement.lang = language;
  i18n.setLanguage(language);
  i18n.applyStaticTranslations();
});

// stopPropagation : les bulles sont désormais empilées dans #icon-stack juste sous la bulle
// réglages — on coupe la propagation pour être certain qu'un clic sur "fait"/"passer" ne puisse
// jamais aussi déclencher un listener posé plus haut dans l'arbre (ex. sur .card ou .icon-stack).
btnDone.addEventListener("click", (event) => {
  event.stopPropagation();
  window.mascotAPI.markDone();
});
btnSkip.addEventListener("click", (event) => {
  event.stopPropagation();
  window.mascotAPI.markSkipped();
});
btnSettings.addEventListener("click", (event) => {
  event.stopPropagation();
  window.mascotAPI.openDashboard();
});
