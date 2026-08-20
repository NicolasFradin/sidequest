/** Dictionnaire FR/EN de l'overlay mascotte — même mécanisme que dashboard/i18n.js. */
const TRANSLATIONS = {
  fr: {
    "overlay.label": "C'est l'heure de bouger !",
    "overlay.done": "C'est fait 💪",
    "overlay.skip": "Passer",
    "overlay.settings.title": "Réglages",
    "overlay.timer.title": "Temps écoulé",
    "overlay.blocking.title": "Séance obligatoire",
  },
  en: {
    "overlay.label": "Time to move!",
    "overlay.done": "Done 💪",
    "overlay.skip": "Skip",
    "overlay.settings.title": "Settings",
    "overlay.timer.title": "Elapsed time",
    "overlay.blocking.title": "Mandatory session",
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
