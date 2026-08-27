/** Dictionnaire FR/EN pour le process principal (menu tray natif, dialogues natifs, erreurs d'import) — voir aussi dashboard/i18n.js et overlay/i18n.js pour le pendant renderer. */
const TRANSLATIONS = {
  fr: {
    trayOpenDashboard: "Ouvrir le dashboard",
    trayTriggerNow: "Déclencher un exercice maintenant",
    trayPause: "Mettre en pause",
    trayStreak: (n) => `Streak actuel : ${n} jour(s)`,
    trayQuit: "Quitter",
    exportDialogTitle: "Exporter le plan",
    exportFilterName: "Plan SideQuest (JSON)",
    importDialogTitle: "Importer un plan",
    errorInvalidJson: "Ce fichier n'est pas un JSON valide.",
    errorInvalidShape: "Ce fichier n'a pas le format d'un plan SideQuest (nom + exercices attendus).",
    errorInvalidMascot: "L'image de mascotte est invalide ou dépasse 3 Mo.",
    errorEmptyExercises: "Ce pack n'a aucun exercice.",
    errorTooManyExercises: "Ce pack a trop d'exercices (12 maximum).",
    errorLlmInvalidJson: "Le modèle n'a pas répondu avec un JSON valide, même après une nouvelle tentative.",
    errorLlmProviderError: "Le fournisseur IA n'a pas répondu (clé invalide, réseau indisponible, ou service injoignable).",
    errorLlmNotConfigured: "Aucun fournisseur IA n'est configuré dans les réglages.",
  },
  en: {
    trayOpenDashboard: "Open dashboard",
    trayTriggerNow: "Trigger an exercise now",
    trayPause: "Pause",
    trayStreak: (n) => `Current streak: ${n} day${n === 1 ? "" : "s"}`,
    trayQuit: "Quit",
    exportDialogTitle: "Export plan",
    exportFilterName: "SideQuest plan (JSON)",
    importDialogTitle: "Import a plan",
    errorInvalidJson: "This file isn't valid JSON.",
    errorInvalidShape: "This file isn't in the SideQuest plan format (expected a name and exercises).",
    errorInvalidMascot: "The mascot image is invalid or larger than 3 MB.",
    errorEmptyExercises: "This pack has no exercises.",
    errorTooManyExercises: "This pack has too many exercises (12 max).",
    errorLlmInvalidJson: "The model didn't reply with valid JSON, even after a retry.",
    errorLlmProviderError: "The AI provider didn't respond (invalid key, no network, or the service is unreachable).",
    errorLlmNotConfigured: "No AI provider is configured in settings.",
  },
};

export function t(lang, key, ...args) {
  const value = TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.fr[key];
  return typeof value === "function" ? value(...args) : value;
}
