/** Dictionnaire FR/EN de l'overlay mascotte — même mécanisme que dashboard/i18n.js. */
const TRANSLATIONS = {
  fr: {
    "overlay.label": "Mets cette période à profit !",
    "overlay.done": "C'est fait 💪",
    "overlay.skip": "Passer",
    "overlay.settings.title": "Réglages",
    "overlay.timer.title": "Temps restant",
    "overlay.blocking.title": "Séance obligatoire",
    "overlay.level": "Niveau",
  },
  en: {
    "overlay.label": "Make the most of this time!",
    "overlay.done": "Done 💪",
    "overlay.skip": "Skip",
    "overlay.settings.title": "Settings",
    "overlay.timer.title": "Time remaining",
    "overlay.blocking.title": "Mandatory session",
    "overlay.level": "Level",
  },
};

let currentLang = "fr";

function setLanguage(lang) {
  currentLang = TRANSLATIONS[lang] ? lang : "fr";
}

function t(key) {
  return TRANSLATIONS[currentLang]?.[key] ?? TRANSLATIONS.fr[key] ?? key;
}

function applyStaticTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });
}

window.i18n = { setLanguage, t, applyStaticTranslations };
