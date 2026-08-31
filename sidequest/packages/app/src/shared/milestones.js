/**
 * Badges de palier XP par side — 10 niveaux illustrés (voir docs/branding/xp-badges/), pas d'artwork
 * au-delà donc on plafonne à MAX_BADGE_LEVEL. Chargé en <script> classique par l'overlay ET le
 * dashboard (même pattern que shared/mascots.js) : pas de bundler entre ces deux renderers et le
 * main process, donc pas de module ES partageable tel quel.
 */
const MAX_BADGE_LEVEL = 10;

const XP_BADGE_IMAGES = Array.from(
  { length: MAX_BADGE_LEVEL },
  (_, i) => `../../assets/xp-badges/level-${i + 1}.png`
);

/** Badge du niveau donné, plafonné à MAX_BADGE_LEVEL. */
function getBadgeForLevel(level) {
  const idx = Math.min(Math.max(Math.floor(level), 1), MAX_BADGE_LEVEL) - 1;
  return { level: idx + 1, image: XP_BADGE_IMAGES[idx] };
}

/** Tous les badges déjà débloqués jusqu'à ce niveau (plafonné) — pour la galerie de sides. */
function getBadgesForLevel(level) {
  const count = Math.min(Math.max(Math.floor(level), 0), MAX_BADGE_LEVEL);
  return XP_BADGE_IMAGES.slice(0, count).map((image, i) => ({ level: i + 1, image }));
}

window.sqMilestones = {
  MAX_BADGE_LEVEL,
  getBadgeForLevel,
  getBadgesForLevel,
};
