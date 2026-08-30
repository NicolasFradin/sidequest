// Pas de déstructuration ici : les <script> classiques partagent la même portée de haut niveau
// dans le document, donc `const { resolveMascotImage } = ...` entrerait en conflit avec la
// `function resolveMascotImage` déjà déclarée par shared/mascots.js (chargé juste avant).
const sqMascots = window.sqMascots;

const mascotImg = document.getElementById("mascot-img");
const exerciseLabel = document.getElementById("exercise-label");
const btnDone = document.getElementById("btn-done");
const btnSkip = document.getElementById("btn-skip");
const btnSettings = document.getElementById("btn-settings");
const blockingBadge = document.getElementById("blocking-badge");
const miniTimerFill = document.getElementById("mini-timer-fill");

let currentMascotId = null;
let currentMascotImage = null;

/**
 * Sablier qui se vide : on remet la bulle à 100% sans transition, on force un reflow (sinon le
 * navigateur fusionne les deux changements de hauteur et saute direct à 0%, pas d'animation
 * visible), puis on relance une transition dont la durée colle à exercise.durationSec.
 */
function startMiniTimer(durationSec) {
  const seconds = Number(durationSec) > 0 ? Number(durationSec) : 30;
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
