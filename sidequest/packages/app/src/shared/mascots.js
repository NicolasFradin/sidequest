/**
 * Source unique de résolution des mascottes, partagée entre le dashboard et l'overlay (deux
 * documents/fenêtres Electron distincts, chacun charge ce script en classique avant son propre
 * renderer.js — voir dashboard/index.html et overlay/index.html). Remplace les deux copies qui
 * existaient avant (une par renderer), qui dérivaient déjà l'une de l'autre.
 */
const MASCOT_LABELS = {
  "ronnie-coleman": "Ronnie Coleman",
  "miami-80s": "Miami 80s",
  "arnold-80s": "Arnold 80s",
  sergeant: "Sergent",
  "sergeant-desert": "Sergent (désert)",
  goku: "Goku",
  centurion: "Centurion",
};
const MASCOT_IMAGES = {
  "ronnie-coleman": "../../assets/mascots/ronnie-coleman.png",
  "miami-80s": "../../assets/mascots/miami-80s.png",
  "arnold-80s": "../../assets/mascots/arnold-80s.png",
  sergeant: "../../assets/mascots/sergeant.png",
  "sergeant-desert": "../../assets/mascots/sergeant-desert.png",
  goku: "../../assets/mascots/goku.png",
  centurion: "../../assets/mascots/centurion.png",
};
/** Mascottes disponibles selon le thème global (skin) actif — voir docs/plan-theme-global.md sprint 3. */
const MASCOTS_BY_THEME = {
  "miami-80s": ["ronnie-coleman", "miami-80s", "arnold-80s"],
  "military-camo": ["sergeant"],
  dragonball: ["goku"],
  "roman-empire": ["centurion"],
};
/**
 * Variante d'une mascotte à afficher en mode clair, si elle existe (sinon la mascotte normale
 * sert pour les deux modes) — sert de base à resolveMascotImage(). Mécanisme générique, pas
 * limité à Military camo, voir plan-theme-global.md sprint 5.
 */
const MASCOT_LIGHT_VARIANTS = { sergeant: "sergeant-desert" };

/**
 * @param {string} mascotId
 * @param {"dark" | "light"} theme
 * @param {string | null} [overrideImageUrl] Image déjà résolue côté main (mascotte propre à un
 *   pack importé, `file://...` — voir dashboard:import-plan et showExercise()) : prioritaire sur
 *   la table statique ci-dessus quand fournie.
 */
function resolveMascotImage(mascotId, theme, overrideImageUrl) {
  if (overrideImageUrl) return overrideImageUrl;
  const variantId = theme === "light" ? MASCOT_LIGHT_VARIANTS[mascotId] : null;
  return MASCOT_IMAGES[variantId ?? mascotId] ?? MASCOT_IMAGES["ronnie-coleman"];
}

/**
 * Résout le chemin d'image d'une mascotte de pack selon le niveau XP atteint (paliers de
 * croissance optionnels, ex. SideCat/SideTama — `mascot.stages: [{minLevel, imagePath}]`).
 * Sans `stages`, `mascot.imagePath` sert pour tous les niveaux. Miroir de la fonction équivalente
 * côté main process (packages/app/src/main/index.js) — celle-ci sert la galerie du dashboard,
 * l'autre construit le payload envoyé à l'overlay ; même logique, deux contextes JS séparés
 * (Node vs. renderer), pas de module partagé possible entre les deux.
 */
function resolvePackMascotStage(mascot, level) {
  if (!mascot) return null;
  if (!mascot.stages?.length) return mascot.imagePath;
  const eligible = mascot.stages.filter((s) => s.minLevel <= level).sort((a, b) => b.minLevel - a.minLevel);
  return eligible[0]?.imagePath ?? mascot.imagePath;
}

window.sqMascots = {
  MASCOT_LABELS,
  MASCOT_IMAGES,
  MASCOTS_BY_THEME,
  MASCOT_LIGHT_VARIANTS,
  resolveMascotImage,
  resolvePackMascotStage,
};
