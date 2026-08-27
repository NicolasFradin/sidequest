/**
 * Dictionnaire FR/EN de l'UI du dashboard. Clé plate -> chaîne, ou fonction pour les rares cas
 * avec interpolation (pluriel, compteur). Les noms de thèmes visuels (Miami 80's, etc.) et le
 * contenu des quêtes/plans (données utilisateur) ne sont volontairement pas traduits ici.
 */
const TRANSLATIONS = {
  fr: {
    "nav.settings": "Réglages",
    "nav.plans": "Packs",
    "nav.history": "Historique",
    "theme.button": "Thème",
    "theme.toggle.title": "Changer de thème",

    "settings.triggerNow": "🎲 Générer une quête",
    "settings.triggerNow.title": "Générer une quête maintenant",

    "onboarding.title": "Bienvenue sur SideQuest 👋",
    "onboarding.text":
      "Choisis ton intervalle et active le lancement au démarrage si tu veux — tout reste modifiable à tout moment.",
    "onboarding.dismiss": "J'ai compris",

    "interval.label": "Intervalle entre deux quêtes",

    "mode.label": "Mode",
    "mode.notify": "Notification douce",
    "mode.gate": "Blocage réel",
    "mode.mixed": "Mixte",
    "mode.hint":
      "Notification douce : \"Passer\" toujours possible. Blocage réel : impossible de fermer sans faire la quête. Mixte : \"Passer\" possible normalement, mais devient bloquant dès que tu as trop esquivé (dette &gt; 0, voir l'onglet Historique).",

    "triggerSource.label": "Source de déclenchement",
    "triggerSource.timer": "Minuteur seul",
    "triggerSource.hook": "Hook Claude Code seul",
    "triggerSource.both": "Les deux",
    "triggerSource.hint":
      "Minuteur seul : ignore le hook Claude Code s'il est configuré. Hook seul : le minuteur est en pause, seul le hook déclenche des quêtes. Les deux (défaut) : minuteur ET hook actifs.",

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

    "llm.label": "Génération de pack par IA",
    "llm.hint":
      "Optionnel — décris ce que tu veux dans la galerie de packs et un LLM le génère. Rien n'est envoyé nulle part tant qu'aucun fournisseur n'est choisi ci-dessous.",
    "llm.provider.none": "Désactivé",
    "llm.provider.anthropicApi": "Clé API Anthropic",
    "llm.provider.openaiApi": "Clé API OpenAI",
    "llm.provider.claudeCli": "Claude Code (CLI)",
    "llm.provider.codexCli": "Codex (CLI)",
    "llm.provider.ollama": "Ollama (local)",
    "llm.apiKeyPlaceholder": "sk-…",
    "llm.saveKey": "Enregistrer",
    "llm.keyStored": "Clé enregistrée (chiffrée localement).",
    "llm.keyMissing": "Aucune clé enregistrée.",
    "llm.model": "Modèle",
    "llm.baseUrl": "Adresse du serveur",
    "llm.cli.available": "CLI détectée sur cette machine.",
    "llm.cli.unavailable": "CLI introuvable — installe-la et assure-toi qu'elle est dans le PATH.",
    "llm.testConnection": "Tester la connexion",
    "llm.testing": "Test…",
    "llm.testOk": "OK",
    "llm.testFailed": "Échec",
    "llm.toast.keySaved": "Clé enregistrée",
    "llm.toast.keyStorageFailed": "Impossible d'enregistrer la clé (chiffrement indisponible sur cette machine).",
    "llm.toast.configureFirst": "Choisis d'abord un fournisseur IA dans les réglages.",

    "autolaunch.label": "Lancer au démarrage",
    "autolaunch.hint": "Ouvre SideQuest automatiquement à la connexion.",

    "hook.status.installed": "Activé",
    "hook.status.notInstalled": "Non activé",
    "hook.toggle.enable": "Activer l'intégration",
    "hook.toggle.disable": "Désactiver",
    "toast.hookEnabled": "Intégration Claude Code activée",
    "toast.hookDisabled": "Intégration Claude Code désactivée",

    "toast.saved": "Enregistré",

    "plans.pageTitle": "Galerie de packs",
    "plans.generate": "✨ Générer avec l'IA",
    "plans.generateModal.title": "Générer un pack",
    "plans.generateModal.hint": "Décris ce que tu veux en quelques mots — le pack généré apparaîtra dans la galerie.",
    "plans.generateModal.placeholder": "Ex : un pack de 5 minutes pour se détendre les yeux devant l'écran",
    "plans.generateModal.cancel": "Annuler",
    "plans.generateModal.submit": "Générer",
    "plans.generateModal.submitting": "Génération…",
    "plans.toast.generated": "Pack généré",
    "plans.badge.generated": "Généré par IA",
    "plans.import": "Importer un pack",
    "plans.import.infoTooltip": `Format attendu (fichier JSON) :
<pre>{
  "name": "Mon pack",
  "mascot": {
    "label": "Ma mascotte",
    "image": "data:image/png;base64,iVBORw0KGgo..."
  },
  "exercises": [
    { "label": "Ma quête", "durationSec": 30, "category": "détente" }
  ]
}</pre>
La mascotte est optionnelle.`,
    "plans.new": "+ Nouveau pack",
    "plans.badge.bundled": "Officiel",
    "plans.badge.imported": "Importé",
    "plans.badge.active": "Actif",
    "plans.level": (n) => `Niveau ${n}`,
    "plans.count": (n) => `${n} quête${n > 1 ? "s" : ""}`,
    "plans.action.open": "Ouvrir",
    "plans.action.duplicate": "Dupliquer",
    "plans.action.activate": "Activer",
    "plans.action.deactivate": "Désactiver",
    "plans.action.export": "Exporter",
    "plans.action.delete": "Supprimer",
    "plans.action.disabledHint": "Ajoute au moins une quête avant d'activer ce plan.",
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
    "planEditor.mascotLabel": "Mascotte",
    "planEditor.mascotHint": "Propre à ce pack — sinon la mascotte SideQuest par défaut s'affiche. Choisis-en une, ou ajoute la tienne.",
    "planEditor.mascotCustom": "Personnalisée",
    "planEditor.mascotAdd": "+ Ajouter",
    "planEditor.toast.mascotUpdated": "Mascotte mise à jour",
    "planEditor.exercisesLabel": "Quêtes",
    "planEditor.addExercise": "+ Ajouter une quête",
    "planEditor.labelPlaceholder": "Nom de la quête",
    "planEditor.categoryPlaceholder": "Catégorie",
    "planEditor.removeExerciseTitle": "Supprimer cette quête",
    "planEditor.emptyHint": "Aucune quête pour l'instant.",

    "history.pageTitle": "Historique",
    "history.refresh.title": "Rafraîchir",
    "history.stat.streak": "🔥 Streak (jours)",
    "history.stat.week": "Séances cette semaine",
    "history.stat.total": "Séances au total",
    "history.stat.debt": "⛓ Dette de séances",
    "history.chart.label": "Volume / semaine (7 derniers jours)",
    "history.table.label": "Séances récentes",
    "history.table.date": "Date",
    "history.table.exercise": "Quête",
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
    "nav.plans": "Packs",
    "nav.history": "History",
    "theme.button": "Theme",
    "theme.toggle.title": "Switch theme",

    "settings.triggerNow": "🎲 Generate a quest",
    "settings.triggerNow.title": "Generate a quest now",

    "onboarding.title": "Welcome to SideQuest 👋",
    "onboarding.text":
      "Pick your interval, and turn on launch at startup if you'd like — everything stays editable anytime.",
    "onboarding.dismiss": "Got it",

    "interval.label": "Interval between quests",

    "mode.label": "Mode",
    "mode.notify": "Soft notification",
    "mode.gate": "Hard gate",
    "mode.mixed": "Mixed",
    "mode.hint":
      "Soft notification: \"Skip\" always available. Hard gate: can't dismiss without doing the quest. Mixed: \"Skip\" works normally, but becomes gated once you've skipped too much (debt &gt; 0, see the History tab).",

    "triggerSource.label": "Trigger source",
    "triggerSource.timer": "Timer only",
    "triggerSource.hook": "Claude Code hook only",
    "triggerSource.both": "Both",
    "triggerSource.hint":
      "Timer only: ignores the Claude Code hook if configured. Hook only: the timer is paused, only the hook triggers quests. Both (default): timer AND hook active.",

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

    "llm.label": "AI pack generation",
    "llm.hint":
      "Optional — describe what you want in the packs gallery and an LLM generates it. Nothing is sent anywhere until you pick a provider below.",
    "llm.provider.none": "Off",
    "llm.provider.anthropicApi": "Anthropic API key",
    "llm.provider.openaiApi": "OpenAI API key",
    "llm.provider.claudeCli": "Claude Code (CLI)",
    "llm.provider.codexCli": "Codex (CLI)",
    "llm.provider.ollama": "Ollama (local)",
    "llm.apiKeyPlaceholder": "sk-…",
    "llm.saveKey": "Save",
    "llm.keyStored": "Key saved (encrypted locally).",
    "llm.keyMissing": "No key saved.",
    "llm.model": "Model",
    "llm.baseUrl": "Server address",
    "llm.cli.available": "CLI detected on this machine.",
    "llm.cli.unavailable": "CLI not found — install it and make sure it's on your PATH.",
    "llm.testConnection": "Test connection",
    "llm.testing": "Testing…",
    "llm.testOk": "OK",
    "llm.testFailed": "Failed",
    "llm.toast.keySaved": "Key saved",
    "llm.toast.keyStorageFailed": "Couldn't save the key (encryption unavailable on this machine).",
    "llm.toast.configureFirst": "Pick an AI provider in settings first.",

    "autolaunch.label": "Launch at startup",
    "autolaunch.hint": "Opens SideQuest automatically when you log in.",

    "hook.status.installed": "Enabled",
    "hook.status.notInstalled": "Not enabled",
    "hook.toggle.enable": "Enable integration",
    "hook.toggle.disable": "Disable",
    "toast.hookEnabled": "Claude Code integration enabled",
    "toast.hookDisabled": "Claude Code integration disabled",

    "toast.saved": "Saved",

    "plans.pageTitle": "Packs gallery",
    "plans.generate": "✨ Generate with AI",
    "plans.generateModal.title": "Generate a pack",
    "plans.generateModal.hint": "Describe what you want in a few words — the generated pack will show up in the gallery.",
    "plans.generateModal.placeholder": "E.g.: a 5-minute pack to rest your eyes from the screen",
    "plans.generateModal.cancel": "Cancel",
    "plans.generateModal.submit": "Generate",
    "plans.generateModal.submitting": "Generating…",
    "plans.toast.generated": "Pack generated",
    "plans.badge.generated": "AI-generated",
    "plans.import": "Import a pack",
    "plans.import.infoTooltip": `Expected format (JSON file):
<pre>{
  "name": "My pack",
  "mascot": {
    "label": "My mascot",
    "image": "data:image/png;base64,iVBORw0KGgo..."
  },
  "exercises": [
    { "label": "My quest", "durationSec": 30, "category": "relax" }
  ]
}</pre>
The mascot is optional.`,
    "plans.new": "+ New pack",
    "plans.badge.bundled": "Official",
    "plans.badge.imported": "Imported",
    "plans.badge.active": "Active",
    "plans.level": (n) => `Level ${n}`,
    "plans.count": (n) => `${n} quest${n > 1 ? "s" : ""}`,
    "plans.action.open": "Open",
    "plans.action.duplicate": "Duplicate",
    "plans.action.activate": "Activate",
    "plans.action.deactivate": "Deactivate",
    "plans.action.export": "Export",
    "plans.action.delete": "Delete",
    "plans.action.disabledHint": "Add at least one quest before activating this plan.",
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
    "planEditor.mascotLabel": "Mascot",
    "planEditor.mascotHint": "Specific to this pack — otherwise the default SideQuest mascot shows. Pick one, or add your own.",
    "planEditor.mascotCustom": "Custom",
    "planEditor.mascotAdd": "+ Add",
    "planEditor.toast.mascotUpdated": "Mascot updated",
    "planEditor.exercisesLabel": "Quests",
    "planEditor.addExercise": "+ Add a quest",
    "planEditor.labelPlaceholder": "Quest name",
    "planEditor.categoryPlaceholder": "Category",
    "planEditor.removeExerciseTitle": "Remove this quest",
    "planEditor.emptyHint": "No quests yet.",

    "history.pageTitle": "History",
    "history.refresh.title": "Refresh",
    "history.stat.streak": "🔥 Streak (days)",
    "history.stat.week": "Sessions this week",
    "history.stat.total": "Total sessions",
    "history.stat.debt": "⛓ Session debt",
    "history.chart.label": "Volume / week (last 7 days)",
    "history.table.label": "Recent sessions",
    "history.table.date": "Date",
    "history.table.exercise": "Quest",
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
