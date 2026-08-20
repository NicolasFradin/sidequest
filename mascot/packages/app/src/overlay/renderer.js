const mascotImages = {
  "ronnie-coleman": "../../assets/mascots/ronnie-coleman.png",
  "miami-80s": "../../assets/mascots/miami-80s.png",
  "arnold-80s": "../../assets/mascots/arnold-80s.png",
  sergeant: "../../assets/mascots/sergeant.png",
  "sergeant-desert": "../../assets/mascots/sergeant-desert.png",
  goku: "../../assets/mascots/goku.png",
  centurion: "../../assets/mascots/centurion.png",
};
/** Variante d'une mascotte à afficher en mode clair, si elle existe — voir plan-theme-global.md sprint 5. */
const MASCOT_LIGHT_VARIANTS = { sergeant: "sergeant-desert" };

function resolveMascotImage(mascotId, theme) {
  const variantId = theme === "light" ? MASCOT_LIGHT_VARIANTS[mascotId] : null;
  return mascotImages[variantId ?? mascotId] ?? mascotImages["ronnie-coleman"];
}

const mascotImg = document.getElementById("mascot-img");
const exerciseLabel = document.getElementById("exercise-label");
const btnDone = document.getElementById("btn-done");
const btnSkip = document.getElementById("btn-skip");
const btnSettings = document.getElementById("btn-settings");
const blockingBadge = document.getElementById("blocking-badge");

let currentMascotId = null;

window.mascotAPI.onShowExercise(({ exercise, mascot, theme, blocking, language }) => {
  currentMascotId = mascot;
  mascotImg.src = resolveMascotImage(mascot, theme ?? "dark");
  exerciseLabel.textContent = exercise.label;
  document.documentElement.dataset.theme = theme ?? "dark";
  document.documentElement.lang = language ?? "fr";
  i18n.setLanguage(language ?? "fr");
  i18n.applyStaticTranslations();
  btnSkip.hidden = Boolean(blocking);
  blockingBadge.hidden = !blocking;
});

window.mascotAPI.onThemeChanged((theme) => {
  document.documentElement.dataset.theme = theme;
  if (currentMascotId) mascotImg.src = resolveMascotImage(currentMascotId, theme);
});

window.mascotAPI.onLanguageChanged((language) => {
  document.documentElement.lang = language;
  i18n.setLanguage(language);
  i18n.applyStaticTranslations();
});

btnDone.addEventListener("click", () => window.mascotAPI.markDone());
btnSkip.addEventListener("click", () => window.mascotAPI.markSkipped());
btnSettings.addEventListener("click", () => window.mascotAPI.openDashboard());
