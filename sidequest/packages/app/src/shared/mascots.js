/**
 * Source unique de résolution des mascottes, partagée entre le dashboard et l'overlay (deux
 * documents/fenêtres Electron distincts, chacun charge ce script en classique avant son propre
 * renderer.js — voir dashboard/index.html et overlay/index.html). Remplace les deux copies qui
 * existaient avant (une par renderer), qui dérivaient déjà l'une de l'autre.
 */
const MASCOT_LABELS = {
  sidequest: "SideQuest",
  "ronnie-80s": "Ronnie",
  "miami-80s": "Miami 80s",
  "arnold-80s": "Arnold 80s",
  sergeant: "Sergent",
  "sergeant-desert": "Sergent (désert)",
  centurion: "Centurion",
};
const MASCOT_IMAGES = {
  sidequest: "../../assets/mascots/sidequest.png",
  "ronnie-80s": "../../assets/mascots/ronnie-80s.png",
  "miami-80s": "../../assets/mascots/miami-80s.png",
  "arnold-80s": "../../assets/mascots/arnold-80s.png",
  sergeant: "../../assets/mascots/sergeant.png",
  "sergeant-desert": "../../assets/mascots/sergeant-desert.png",
  centurion: "../../assets/mascots/centurion.png",
};
/** Mascottes disponibles selon le thème global (skin) actif — voir docs/plan-theme-global.md sprint 3.
 * "manga" (ex-"dragonball") retombe sur la mascotte SideQuest par défaut — pas de mascotte dédiée
 * pour ce thème depuis le retrait de Goku (contenu sous licence, incompatible avec un projet open
 * source). */
const MASCOTS_BY_THEME = {
  "miami-80s": ["ronnie-80s", "miami-80s", "arnold-80s"],
  "military-camo": ["sergeant"],
  manga: ["sidequest"],
  "roman-empire": ["centurion"],
};
/**
 * Variante d'une mascotte à afficher en mode clair, si elle existe (sinon la mascotte normale
 * sert pour les deux modes) — sert de base à resolveMascotImage(). Mécanisme générique, pas
 * limité à Military camo, voir plan-theme-global.md sprint 5.
 */
const MASCOT_LIGHT_VARIANTS = { sergeant: "sergeant-desert" };

/**
 * Mascotte par défaut d'un side custom/importé/généré par IA qui n'a pas la sienne — remplace le
 * repli sur la mascotte globale active pour ces sources-là (un side fabriqué par l'utilisateur ou
 * une IA ne devrait pas hériter du skin visuel en cours, ex. le sergent en mode Military camo).
 * Les sides bundled (SideGym...) gardent l'ancien comportement (repli sur la mascotte globale) —
 * voir sideCardMascotImage() côté dashboard et showExercise() côté main (packages/app/src/main).
 */
const DEFAULT_SIDE_MASCOT_IMAGE = "../../assets/mascots/sidequest.png";

/**
 * @param {string} mascotId
 * @param {"dark" | "light"} theme
 * @param {string | null} [overrideImageUrl] Image déjà résolue côté main (mascotte propre à un
 *   side importé, `file://...` — voir dashboard:import-side et showExercise()) : prioritaire sur
 *   la table statique ci-dessus quand fournie.
 */
function resolveMascotImage(mascotId, theme, overrideImageUrl) {
  if (overrideImageUrl) return overrideImageUrl;
  const variantId = theme === "light" ? MASCOT_LIGHT_VARIANTS[mascotId] : null;
  return MASCOT_IMAGES[variantId ?? mascotId] ?? MASCOT_IMAGES["ronnie-80s"];
}

/**
 * Résout le chemin d'image d'une mascotte de side selon le niveau XP atteint (paliers de
 * croissance optionnels, ex. SideCat/SideTama — `mascot.stages: [{minLevel, imagePath}]`).
 * Sans `stages`, `mascot.imagePath` sert pour tous les niveaux. Miroir de la fonction équivalente
 * côté main process (packages/app/src/main/index.js) — celle-ci sert la galerie du dashboard,
 * l'autre construit le payload envoyé à l'overlay ; même logique, deux contextes JS séparés
 * (Node vs. renderer), pas de module partagé possible entre les deux.
 */
function resolveSideMascotStage(mascot, level) {
  if (!mascot) return null;
  if (!mascot.stages?.length) return mascot.imagePath;
  const eligible = mascot.stages.filter((s) => s.minLevel <= level).sort((a, b) => b.minLevel - a.minLevel);
  return eligible[0]?.imagePath ?? mascot.imagePath;
}

/**
 * Couleur d'accent d'un side : celle définie dans son JSON (`side.color`) si présente, sinon une
 * teinte stable dérivée d'un hash de son id (même side -> même couleur à chaque relance de
 * l'app, pas de tirage aléatoire) — évite d'imposer un sélecteur de couleur à l'import (v1).
 * Miroir de la fonction équivalente côté main process (packages/app/src/main/index.js), même
 * raison de duplication que resolveSideMascotStage ci-dessus.
 */
function resolveSideColor(side) {
  if (side.color) return side.color;
  let hash = 0;
  for (let i = 0; i < side.id.length; i++) hash = (hash * 31 + side.id.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

window.sqMascots = {
  MASCOT_LABELS,
  MASCOT_IMAGES,
  MASCOTS_BY_THEME,
  MASCOT_LIGHT_VARIANTS,
  DEFAULT_SIDE_MASCOT_IMAGE,
  resolveMascotImage,
  resolveSideMascotStage,
  resolveSideColor,
};
