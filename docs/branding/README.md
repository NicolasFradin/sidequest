# Branding & Charte graphique

Ce dossier centralise les assets visuels de référence pour le projet, **organisés par thème global (skin)** — voir [`docs/plan-theme-global.md`](../plan-theme-global.md) pour le plan de la feature, et `docs/plan-mvp-mascotte-coach.md` section 9 pour le détail des tokens de base (palette, typographies, composants).

## Structure

Les 4 thèmes ont désormais leurs couleurs **et** leur(s) mascotte(s) intégrées dans l'app (`app/assets/mascots/`, sélectionnées dynamiquement selon le thème actif dans le dashboard — `MASCOTS_BY_THEME` dans `app/src/dashboard/renderer.js`).

- `miami-80s/` — thème par défaut, style Miami Vice / GTA Vice City.
  - `style-guide-dark.png` / `style-guide-light.png` — charte graphique de référence, variantes sombre/claire.
  - `mascot-ronnie-coleman.png`, `mascot-miami-80s.png`, `mascot-arnold-80s.png` — 3 mascottes intégrées dans l'app.
- `military-camo/` — thème "1980s Military". Seul thème avec une déclinaison claire/sombre distincte pour l'instant (pilote du sprint 5, voir `plan-theme-global.md`) : sombre = camo forêt, clair = camo désertique ("Desert Ops").
  - `style-guide-dark.png` (camo forêt) / `style-guide-light.png` (camo désertique) — chartes graphiques de référence.
  - `mascot-sergeant.png` (forêt) et `mascot-sergeant-desert.png` (désert) — 2 images pour la même mascotte logique (`sergeant`), affichage résolu automatiquement selon le mode clair/sombre (`MASCOT_LIGHT_VARIANTS` dans `renderer.js`), pas un choix séparé dans le sélecteur.
- `roman-empire/` — thème "Roman Empire".
  - `style-guide.png` — charte graphique de référence.
  - `mascot-roman_empire.png` — mascotte intégrée dans l'app.
- `dragonball/` — thème "Dragonball".
  - `style-guide.png` — charte graphique de référence.
  - `mascot-dragonball.png` — mascotte intégrée dans l'app.

## Utilisation prévue

Ces images servent de source pour :
- Les couleurs d'accent du dashboard par thème (`app/src/dashboard/style.css`, sélecteur `[data-visual-theme]`)
- La sélection de mascotte dans le dashboard, filtrée par thème actif (`app/src/dashboard/renderer.js`)
- Les sprites affichés dans l'overlay mascotte (`app/src/overlay/renderer.js`)
- Les icônes de tray et d'app (déclinaisons redimensionnées à prévoir : 16x16, 32x32, 256x256 pour le packaging Electron) — pas encore fait, toutes les mascottes n'ont qu'une seule résolution source pour l'instant

Toute nouvelle mascotte ajoutée à un thème doit respecter le style pixel art 8-bit/16-bit et la palette de couleurs de la charte graphique correspondante.
