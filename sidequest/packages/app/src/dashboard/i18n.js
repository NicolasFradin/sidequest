/**
 * Dictionnaire FR/EN de l'UI du dashboard. Clé plate -> chaîne, ou fonction pour les rares cas
 * avec interpolation (pluriel, compteur). Les noms de thèmes visuels (Miami 80's, etc.) et le
 * contenu des sides/quests (données utilisateur) ne sont volontairement pas traduits ici.
 * "Side" et "Quest" restent en anglais dans les deux langues (ce sont les termes du produit).
 */
const TRANSLATIONS = {
  fr: {
    "nav.settings": "Réglages",
    "nav.sides": "Sides",
    "nav.history": "Historique",
    "theme.button": "Thème",
    "theme.toggle.title": "Changer de thème",

    "settings.triggerNow": "🎲 Générer une quest",
    "settings.triggerNow.title": "Générer une quest maintenant",

    "onboarding.title": "Bienvenue sur SideQuest 👋",
    "onboarding.text":
      "Choisis ton intervalle et active le lancement au démarrage si tu veux — tout reste modifiable à tout moment.",
    "onboarding.dismiss": "J'ai compris",

    "interval.label": "Intervalle entre deux quests",

    "mode.label": "Mode",
    "mode.notify": "Notification douce",
    "mode.gate": "Blocage réel",
    "mode.mixed": "Mixte",
    "mode.hint":
      "Notification douce : \"Passer\" toujours possible. Blocage réel : impossible de fermer sans faire la quest. Mixte : \"Passer\" possible normalement, mais devient bloquant dès que tu as trop esquivé (dette &gt; 0, voir l'onglet Historique).",

    "triggerSource.label": "Source de déclenchement",
    "triggerSource.timer": "Minuteur seul",
    "triggerSource.hook": "Hook Claude Code seul",
    "triggerSource.both": "Les deux",
    "triggerSource.hint":
      "Minuteur seul : ignore le hook Claude Code s'il est configuré. Hook seul : le minuteur est en pause, seul le hook déclenche des quests. Les deux (défaut) : minuteur ET hook actifs.",

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

    "llm.label": "Génération de side par IA",
    "llm.hint":
      "Optionnel — décris ce que tu veux dans la galerie de sides et un LLM le génère. Rien n'est envoyé nulle part tant qu'aucun fournisseur n'est choisi ci-dessous.",
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

    "sides.pageTitle": "Galerie de sides",
    "sides.generate": "✨ Générer avec l'IA",
    "sides.generateModal.title": "Générer un side",
    "sides.generateModal.hint": "Décris ce que tu veux en quelques mots — le side généré apparaîtra dans la galerie.",
    "sides.generateModal.placeholder": "Ex : un side de 5 minutes pour se détendre les yeux devant l'écran",
    "sides.generateModal.mascotLabel": "Mascotte (optionnel)",
    "sides.generateModal.mascotHint": "Décris la mascotte que tu imagines — l'IA proposera une idée en texte, à choisir ensuite dans l'éditeur (aucune image n'est générée).",
    "sides.generateModal.mascotPlaceholder": "Ex : un petit robot bricoleur, rond, orange et gris",
    "sides.generateModal.cancel": "Annuler",
    "sides.generateModal.submit": "Générer",
    "sides.generateModal.submitting": "Génération…",
    "sides.toast.generated": "Side généré",
    "sides.badge.generated": "Généré par IA",
    "sides.import": "Importer un side",
    "sides.import.infoTooltip": `Format attendu (fichier JSON) :
<pre>{
  "name": "Mon side",
  "mascot": {
    "label": "Ma mascotte",
    "image": "data:image/png;base64,iVBORw0KGgo..."
  },
  "exercises": [
    { "label": "Ma quest", "durationSec": 30, "category": "détente" }
  ]
}</pre>
La mascotte est optionnelle.`,
    "sides.new": "+ Nouveau side",
    "sides.badge.bundled": "Officiel",
    "sides.badge.imported": "Importé",
    "sides.badge.active": "Actif",
    "sides.level": (n) => `Niveau ${n}`,
    "sides.count": (n) => `${n} quest${n > 1 ? "s" : ""}`,
    "sides.action.open": "Ouvrir",
    "sides.action.duplicate": "Dupliquer",
    "sides.action.activate": "Activer",
    "sides.action.deactivate": "Désactiver",
    "sides.action.export": "Exporter",
    "sides.action.delete": "Supprimer",
    "sides.action.disabledHint": "Ajoute au moins une quest avant d'activer ce side.",
    "sides.confirmDelete": "Supprimer ce side ? Cette action est irréversible.",
    "sides.toast.duplicated": "Side dupliqué",
    "sides.toast.exported": "Side exporté",
    "sides.toast.imported": "Side importé",
    "sides.toast.deleted": "Side supprimé",
    "sides.defaultNewName": "Nouveau side",
    "sides.copySuffix": "copie",
    "sides.noNameFallback": "Side sans nom",

    "sideEditor.backTitle": "Retour",
    "sideEditor.nameLabel": "Nom du side",
    "sideEditor.mascotLabel": "Mascotte",
    "sideEditor.mascotHint": "Propre à ce side — sinon la mascotte SideQuest par défaut s'affiche. Choisis-en une, ou ajoute la tienne.",
    "sideEditor.mascotCustom": "Personnalisée",
    "sideEditor.aiMascotIdea": (idea) => `💡 Idée de mascotte suggérée par l'IA : « ${idea} »`,
    "sideEditor.mascotAdd": "+ Ajouter",
    "sideEditor.toast.mascotUpdated": "Mascotte mise à jour",
    "sideEditor.exercisesLabel": "Quests",
    "sideEditor.durationHint": "Durée en secondes, optionnelle — laisse le champ vide pour une quest sans minuteur dans le popup.",
    "sideEditor.addExercise": "+ Ajouter une quest",
    "sideEditor.labelPlaceholder": "Nom de la quest",
    "sideEditor.categoryPlaceholder": "Catégorie",
    "sideEditor.durationPlaceholder": "sec",
    "sideEditor.removeExerciseTitle": "Supprimer cette quest",
    "sideEditor.emptyHint": "Aucune quest pour l'instant.",

    "history.pageTitle": "Historique",
    "history.refresh.title": "Rafraîchir",
    "history.stat.streak": "🔥 Streak (jours)",
    "history.stat.week": "Séances cette semaine",
    "history.stat.total": "Séances au total",
    "history.stat.debt": "⛓ Dette de séances",
    "history.chart.label": "Volume / semaine (7 derniers jours)",
    "history.table.label": "Séances récentes",
    "history.table.date": "Date",
    "history.table.exercise": "Quest",
    "history.table.mascot": "Mascotte",
    "history.table.mode": "Mode",
    "history.table.status": "Statut",
    "history.empty": "Aucune séance enregistrée pour l'instant.",

    "history.share.label": "Partager mes stats",
    "history.share.hint": "Le texte est copié dans le presse-papiers — colle-le dans ta publication.",
    "history.share.linkedin": "🔗 LinkedIn",
    "history.share.github": "🐙 GitHub",
    "history.share.text": (streak, week, total) =>
      `🔥 ${streak} jour(s) de streak sur SideQuest, ${week} séance(s) cette semaine et ${total} au total ! 💪 #SideQuest`,
    "history.share.toast": "Texte copié dans le presse-papiers, la page de partage s'ouvre.",

    "status.done": "Fait",
    "status.skipped": "Passé",
    "status.missed": "Manqué",

    locale: "fr-FR",
  },
  en: {
    "nav.settings": "Settings",
    "nav.sides": "Sides",
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

    "llm.label": "AI side generation",
    "llm.hint":
      "Optional — describe what you want in the sides gallery and an LLM generates it. Nothing is sent anywhere until you pick a provider below.",
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

    "sides.pageTitle": "Sides gallery",
    "sides.generate": "✨ Generate with AI",
    "sides.generateModal.title": "Generate a side",
    "sides.generateModal.hint": "Describe what you want in a few words — the generated side will show up in the gallery.",
    "sides.generateModal.placeholder": "E.g.: a 5-minute side to rest your eyes from the screen",
    "sides.generateModal.mascotLabel": "Mascot (optional)",
    "sides.generateModal.mascotHint": "Describe the mascot you're picturing — the AI will suggest a text idea, to pick from in the editor afterward (no image is generated).",
    "sides.generateModal.mascotPlaceholder": "E.g.: a small handyman robot, round, orange and grey",
    "sides.generateModal.cancel": "Cancel",
    "sides.generateModal.submit": "Generate",
    "sides.generateModal.submitting": "Generating…",
    "sides.toast.generated": "Side generated",
    "sides.badge.generated": "AI-generated",
    "sides.import": "Import a side",
    "sides.import.infoTooltip": `Expected format (JSON file):
<pre>{
  "name": "My side",
  "mascot": {
    "label": "My mascot",
    "image": "data:image/png;base64,iVBORw0KGgo..."
  },
  "exercises": [
    { "label": "My quest", "durationSec": 30, "category": "relax" }
  ]
}</pre>
The mascot is optional.`,
    "sides.new": "+ New side",
    "sides.badge.bundled": "Official",
    "sides.badge.imported": "Imported",
    "sides.badge.active": "Active",
    "sides.level": (n) => `Level ${n}`,
    "sides.count": (n) => `${n} quest${n > 1 ? "s" : ""}`,
    "sides.action.open": "Open",
    "sides.action.duplicate": "Duplicate",
    "sides.action.activate": "Activate",
    "sides.action.deactivate": "Deactivate",
    "sides.action.export": "Export",
    "sides.action.delete": "Delete",
    "sides.action.disabledHint": "Add at least one quest before activating this side.",
    "sides.confirmDelete": "Delete this side? This action can't be undone.",
    "sides.toast.duplicated": "Side duplicated",
    "sides.toast.exported": "Side exported",
    "sides.toast.imported": "Side imported",
    "sides.toast.deleted": "Side deleted",
    "sides.defaultNewName": "New side",
    "sides.copySuffix": "copy",
    "sides.noNameFallback": "Unnamed side",

    "sideEditor.backTitle": "Back",
    "sideEditor.nameLabel": "Side name",
    "sideEditor.mascotLabel": "Mascot",
    "sideEditor.mascotHint": "Specific to this side — otherwise the default SideQuest mascot shows. Pick one, or add your own.",
    "sideEditor.mascotCustom": "Custom",
    "sideEditor.aiMascotIdea": (idea) => `💡 AI-suggested mascot idea: "${idea}"`,
    "sideEditor.mascotAdd": "+ Add",
    "sideEditor.toast.mascotUpdated": "Mascot updated",
    "sideEditor.exercisesLabel": "Quests",
    "sideEditor.durationHint": "Duration in seconds, optional — leave it empty for a quest with no timer in the popup.",
    "sideEditor.addExercise": "+ Add a quest",
    "sideEditor.labelPlaceholder": "Quest name",
    "sideEditor.categoryPlaceholder": "Category",
    "sideEditor.durationPlaceholder": "sec",
    "sideEditor.removeExerciseTitle": "Remove this quest",
    "sideEditor.emptyHint": "No quests yet.",

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

    "history.share.label": "Share my stats",
    "history.share.hint": "The text is copied to your clipboard — paste it into your post.",
    "history.share.linkedin": "🔗 LinkedIn",
    "history.share.github": "🐙 GitHub",
    "history.share.text": (streak, week, total) =>
      `🔥 ${streak}-day streak on SideQuest, ${week} session(s) this week, ${total} total! 💪 #SideQuest`,
    "history.share.toast": "Text copied to clipboard, opening the share page.",

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
