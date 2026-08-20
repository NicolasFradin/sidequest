/**
 * Dictionnaire FR/EN de l'UI du dashboard. Clé plate -> chaîne, ou fonction pour les rares cas
 * avec interpolation (pluriel, compteur). Les noms de thèmes visuels (Miami 80's, etc.) et le
 * contenu des exercices/plans (données utilisateur) ne sont volontairement pas traduits ici.
 */
const TRANSLATIONS = {
  fr: {
    "nav.settings": "Réglages",
    "nav.plans": "Plans",
    "nav.history": "Historique",
    "theme.button": "Thème",
    "theme.toggle.title": "Changer de thème",

    "settings.triggerNow": "🎲 Générer un exercice",
    "settings.triggerNow.title": "Générer un exercice maintenant",

    "onboarding.title": "Bienvenue sur Mascot Coach 👋",
    "onboarding.text":
      "Choisis ton intervalle, ta mascotte, et active le lancement au démarrage si tu veux — tout reste modifiable à tout moment.",
    "onboarding.dismiss": "J'ai compris",

    "interval.label": "Intervalle entre deux exercices",

    "mode.label": "Mode",
    "mode.notify": "Notification douce",
    "mode.gate": "Blocage réel",
    "mode.mixed": "Mixte",
    "mode.hint":
      "Notification douce : \"Passer\" toujours possible. Blocage réel : impossible de fermer sans faire l'exercice. Mixte : \"Passer\" possible normalement, mais devient bloquant dès que tu as trop esquivé (dette &gt; 0, voir l'onglet Historique).",

    "triggerSource.label": "Source de déclenchement",
    "triggerSource.timer": "Minuteur seul",
    "triggerSource.hook": "Hook Claude Code seul",
    "triggerSource.both": "Les deux",
    "triggerSource.hint":
      "Minuteur seul : ignore le hook Claude Code s'il est configuré. Hook seul : le minuteur est en pause, seul le hook déclenche des exercices. Les deux (défaut) : minuteur ET hook actifs.",

    "claudeIntegration.label": "Intégration Claude Code",
    "claudeIntegration.hint":
      "Ajoute un hook à ta config Claude Code (<code>~/.claude/settings.json</code>) selon le point de déclenchement choisi ci-dessous. Ne touche à aucun autre réglage déjà présent dans ce fichier.",
    "hookTriggerMode.stop": "Fin de réponse",
    "hookTriggerMode.start": "Début de réponse",
    "hookTriggerMode.thinking": "Pendant que Claude réfléchit",
    "hookTriggerMode.hint":
      "Fin de réponse : la mascotte apparaît quand Claude a fini (comportement historique). Début de réponse : dès que tu envoies ton message. Pendant que Claude réfléchit : seulement si Claude travaille encore après quelques secondes (n'interrompt pas les échanges rapides).",
    "hookEveryN.prefix": "Se déclencher toutes les",
    "hookEveryN.suffix": "réponse(s) de Claude",

    "mascot.label": "Mascotte",
    "mascot.hint": "Les mascottes disponibles dépendent du thème choisi ci-dessus.",

    "autolaunch.label": "Lancer au démarrage",
    "autolaunch.hint": "Ouvre Mascot Coach automatiquement à la connexion.",

    "hook.status.installed": "Activé",
    "hook.status.notInstalled": "Non activé",
    "hook.toggle.enable": "Activer l'intégration",
    "hook.toggle.disable": "Désactiver",
    "toast.hookEnabled": "Intégration Claude Code activée",
    "toast.hookDisabled": "Intégration Claude Code désactivée",

    "toast.saved": "Enregistré",

    "plans.pageTitle": "Plans d'entraînement",
    "plans.import": "Importer un plan",
    "plans.new": "+ Nouveau plan",
    "plans.badge.default": "Défaut",
    "plans.badge.active": "Actif",
    "plans.count": (n) => `${n} exercice${n > 1 ? "s" : ""}`,
    "plans.action.open": "Ouvrir",
    "plans.action.duplicate": "Dupliquer",
    "plans.action.activate": "Activer",
    "plans.action.deactivate": "Désactiver",
    "plans.action.export": "Exporter",
    "plans.action.delete": "Supprimer",
    "plans.action.disabledHint": "Ajoute au moins un exercice avant d'activer ce plan.",
    "plans.confirmDelete": "Supprimer ce plan ? Cette action est irréversible.",
    "plans.toast.duplicated": "Plan dupliqué",
    "plans.toast.exported": "Plan exporté",
    "plans.toast.imported": "Plan importé",
    "plans.toast.deleted": "Plan supprimé",
    "plans.defaultNewName": "Nouveau plan",
    "plans.copySuffix": "copie",
    "plans.noNameFallback": "Plan sans nom",

    "planEditor.backTitle": "Retour",
    "planEditor.nameLabel": "Nom du plan",
    "planEditor.exercisesLabel": "Exercices",
    "planEditor.addExercise": "+ Ajouter un exercice",
    "planEditor.labelPlaceholder": "Nom de l'exercice",
    "planEditor.categoryPlaceholder": "Catégorie",
    "planEditor.removeExerciseTitle": "Supprimer cet exercice",
    "planEditor.emptyHint": "Aucun exercice pour l'instant.",

    "history.pageTitle": "Historique",
    "history.refresh.title": "Rafraîchir",
    "history.stat.streak": "🔥 Streak (jours)",
    "history.stat.week": "Séances cette semaine",
    "history.stat.total": "Séances au total",
    "history.stat.debt": "⛓ Dette de séances",
    "history.chart.label": "Volume / semaine (7 derniers jours)",
    "history.table.label": "Séances récentes",
    "history.table.date": "Date",
    "history.table.exercise": "Exercice",
    "history.table.mascot": "Mascotte",
    "history.table.mode": "Mode",
    "history.table.status": "Statut",
    "history.empty": "Aucune séance enregistrée pour l'instant.",
    "status.done": "Fait",
    "status.skipped": "Passé",
    "status.missed": "Manqué",

    locale: "fr-FR",
  },
  en: {
    "nav.settings": "Settings",
    "nav.plans": "Plans",
    "nav.history": "History",
    "theme.button": "Theme",
    "theme.toggle.title": "Switch theme",

    "settings.triggerNow": "🎲 Generate an exercise",
    "settings.triggerNow.title": "Generate an exercise now",

    "onboarding.title": "Welcome to Mascot Coach 👋",
    "onboarding.text":
      "Pick your interval, your mascot, and turn on launch at startup if you'd like — everything stays editable anytime.",
    "onboarding.dismiss": "Got it",

    "interval.label": "Interval between exercises",

    "mode.label": "Mode",
    "mode.notify": "Soft notification",
    "mode.gate": "Hard gate",
    "mode.mixed": "Mixed",
    "mode.hint":
      "Soft notification: \"Skip\" always available. Hard gate: can't dismiss without doing the exercise. Mixed: \"Skip\" works normally, but becomes gated once you've skipped too much (debt &gt; 0, see the History tab).",

    "triggerSource.label": "Trigger source",
    "triggerSource.timer": "Timer only",
    "triggerSource.hook": "Claude Code hook only",
    "triggerSource.both": "Both",
    "triggerSource.hint":
      "Timer only: ignores the Claude Code hook if configured. Hook only: the timer is paused, only the hook triggers exercises. Both (default): timer AND hook active.",

    "claudeIntegration.label": "Claude Code integration",
    "claudeIntegration.hint":
      "Adds a hook to your Claude Code config (<code>~/.claude/settings.json</code>) based on the trigger point chosen below. Doesn't touch any other setting already present in that file.",
    "hookTriggerMode.stop": "End of response",
    "hookTriggerMode.start": "Start of response",
    "hookTriggerMode.thinking": "While Claude is thinking",
    "hookTriggerMode.hint":
      "End of response: the mascot appears when Claude is done (historical behavior). Start of response: as soon as you send your message. While Claude is thinking: only if Claude is still working after a few seconds (doesn't interrupt quick exchanges).",
    "hookEveryN.prefix": "Trigger every",
    "hookEveryN.suffix": "Claude response(s)",

    "mascot.label": "Mascot",
    "mascot.hint": "Available mascots depend on the theme chosen above.",

    "autolaunch.label": "Launch at startup",
    "autolaunch.hint": "Opens Mascot Coach automatically when you log in.",

    "hook.status.installed": "Enabled",
    "hook.status.notInstalled": "Not enabled",
    "hook.toggle.enable": "Enable integration",
    "hook.toggle.disable": "Disable",
    "toast.hookEnabled": "Claude Code integration enabled",
    "toast.hookDisabled": "Claude Code integration disabled",

    "toast.saved": "Saved",

    "plans.pageTitle": "Training plans",
    "plans.import": "Import a plan",
    "plans.new": "+ New plan",
    "plans.badge.default": "Default",
    "plans.badge.active": "Active",
    "plans.count": (n) => `${n} exercise${n > 1 ? "s" : ""}`,
    "plans.action.open": "Open",
    "plans.action.duplicate": "Duplicate",
    "plans.action.activate": "Activate",
    "plans.action.deactivate": "Deactivate",
    "plans.action.export": "Export",
    "plans.action.delete": "Delete",
    "plans.action.disabledHint": "Add at least one exercise before activating this plan.",
    "plans.confirmDelete": "Delete this plan? This action can't be undone.",
    "plans.toast.duplicated": "Plan duplicated",
    "plans.toast.exported": "Plan exported",
    "plans.toast.imported": "Plan imported",
    "plans.toast.deleted": "Plan deleted",
    "plans.defaultNewName": "New plan",
    "plans.copySuffix": "copy",
    "plans.noNameFallback": "Unnamed plan",

    "planEditor.backTitle": "Back",
    "planEditor.nameLabel": "Plan name",
    "planEditor.exercisesLabel": "Exercises",
    "planEditor.addExercise": "+ Add an exercise",
    "planEditor.labelPlaceholder": "Exercise name",
    "planEditor.categoryPlaceholder": "Category",
    "planEditor.removeExerciseTitle": "Remove this exercise",
    "planEditor.emptyHint": "No exercises yet.",

    "history.pageTitle": "History",
    "history.refresh.title": "Refresh",
    "history.stat.streak": "🔥 Streak (days)",
    "history.stat.week": "Sessions this week",
    "history.stat.total": "Total sessions",
    "history.stat.debt": "⛓ Session debt",
    "history.chart.label": "Volume / week (last 7 days)",
    "history.table.label": "Recent sessions",
    "history.table.date": "Date",
    "history.table.exercise": "Exercise",
    "history.table.mascot": "Mascot",
    "history.table.mode": "Mode",
    "history.table.status": "Status",
    "history.empty": "No sessions recorded yet.",
    "status.done": "Done",
    "status.skipped": "Skipped",
    "status.missed": "Missed",

    locale: "en-US",
  },
};

let currentLang = "fr";

function setLanguage(lang) {
  currentLang = TRANSLATIONS[lang] ? lang : "fr";
}

function getLanguage() {
  return currentLang;
}

function getLocale() {
  return TRANSLATIONS[currentLang].locale;
}

function t(key, ...args) {
  const value = TRANSLATIONS[currentLang]?.[key] ?? TRANSLATIONS.fr[key] ?? key;
  return typeof value === "function" ? value(...args) : value;
}

/** Applique les traductions à tous les éléments statiques marqués via data-i18n(-*) dans le DOM. */
function applyStaticTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
}

window.i18n = { setLanguage, getLanguage, getLocale, t, applyStaticTranslations };
