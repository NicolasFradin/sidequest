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

let currentMascotId = null;
let currentMascotImage = null;

window.mascotAPI.onShowExercise(({ exercise, mascot, mascotImage, sideColor, theme, blocking, language }) => {
  currentMascotId = mascot;
  currentMascotImage = mascotImage ?? null;
  mascotImg.src = sqMascots.resolveMascotImage(mascot, theme ?? "dark", currentMascotImage);
  exerciseLabel.textContent = exercise.label;
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

btnDone.addEventListener("click", () => window.mascotAPI.markDone());
btnSkip.addEventListener("click", () => window.mascotAPI.markSkipped());
btnSettings.addEventListener("click", () => window.mascotAPI.openDashboard());
