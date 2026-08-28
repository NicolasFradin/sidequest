/** Dictionnaire FR/EN pour le process principal (menu tray natif, dialogues natifs, erreurs d'import) — voir aussi dashboard/i18n.js et overlay/i18n.js pour le pendant renderer. */
const TRANSLATIONS = {
  fr: {
    trayOpenDashboard: "Ouvrir le dashboard",
    trayTriggerNow: "Déclencher une quest maintenant",
    trayPause: "Mettre en pause",
    trayStreak: (n) => `Streak actuel : ${n} jour(s)`,
    trayQuit: "Quitter",
    exportDialogTitle: "Exporter le side",
    exportFilterName: "Side SideQuest (JSON)",
    importDialogTitle: "Importer un side",
    chooseMascotDialogTitle: "Choisir une image de mascotte",
    imageFilterName: "Image (PNG, JPEG, WebP)",
    errorInvalidJson: "Ce fichier n'est pas un JSON valide.",
    errorInvalidShape: "Ce fichier n'a pas le format d'un side SideQuest (nom + quests attendues).",
    errorInvalidMascot: "L'image de mascotte est invalide ou dépasse 3 Mo.",
    errorEmptyExercises: "Ce side n'a aucune quest.",
    errorTooManyExercises: "Ce side a trop de quests (12 maximum).",
    errorLlmInvalidJson: "Le modèle n'a pas répondu avec un JSON valide, même après une nouvelle tentative.",
    errorLlmProviderError: "Le fournisseur IA n'a pas répondu (clé invalide, réseau indisponible, ou service injoignable).",
    errorLlmNotConfigured: "Aucun fournisseur IA n'est configuré dans les réglages.",
  },
  en: {
    trayOpenDashboard: "Open dashboard",
    trayTriggerNow: "Trigger a quest now",
    trayPause: "Pause",
    trayStreak: (n) => `Current streak: ${n} day${n === 1 ? "" : "s"}`,
    trayQuit: "Quit",
    exportDialogTitle: "Export side",
    exportFilterName: "SideQuest side (JSON)",
    importDialogTitle: "Import a side",
    chooseMascotDialogTitle: "Choose a mascot image",
    imageFilterName: "Image (PNG, JPEG, WebP)",
    errorInvalidJson: "This file isn't valid JSON.",
    errorInvalidShape: "This file isn't in the SideQuest side format (expected a name and quests).",
    errorInvalidMascot: "The mascot image is invalid or larger than 3 MB.",
    errorEmptyExercises: "This side has no quests.",
    errorTooManyExercises: "This side has too many quests (12 max).",
    errorLlmInvalidJson: "The model didn't reply with valid JSON, even after a retry.",
    errorLlmProviderError: "The AI provider didn't respond (invalid key, no network, or the service is unreachable).",
    errorLlmNotConfigured: "No AI provider is configured in settings.",
  },
};

export function t(lang, key, ...args) {
  const value = TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.fr[key];
  return typeof value === "function" ? value(...args) : value;
}
