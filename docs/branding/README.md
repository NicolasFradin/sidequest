# Branding & Charte graphique

Ce dossier centralise les assets visuels de référence pour le projet, **organisés par thème global (skin)** — voir [`docs/plan-theme-global.md`](../plan-theme-global.md) pour le plan de la feature, et `docs/plan-mvp-mascotte-coach.md` section 9 pour le détail des tokens de base (palette, typographies, composants).

## Structure

- `miami-80s/` — thème par défaut, style Miami Vice / GTA Vice City. Déjà entièrement implémenté (couleurs dans `app/src/dashboard/style.css`, mascottes dans `app/assets/mascots/`).
  - `style-guide-dark.png` / `style-guide-light.png` — charte graphique de référence (couleurs, typographies, composants), variantes sombre/claire.
  - `mascot-ronnie-coleman.png`, `mascot-miami-80s.png` — mascottes actuellement intégrées dans l'app.
  - `mascot-arnold-80s.png` — mascotte candidate supplémentaire pour ce thème, pas encore intégrée dans l'app.
- `military-camo/` — thème "1980s Military". Palette de couleurs intégrée dans le dashboard ; mascotte pas encore intégrée.
  - `style-guide.png` — charte graphique de référence.
  - `mascot-sergeant.png` — mascotte candidate, pas encore intégrée.
- `roman-empire/` — thème "Roman Empire". Palette de couleurs intégrée dans le dashboard ; pas encore de mascotte fournie.
  - `style-guide.png` — charte graphique de référence.
- `dragonball/` — thème "Dragonball". Palette de couleurs intégrée dans le dashboard ; mascotte pas encore intégrée.
  - `style-guide.png` — charte graphique de référence.
  - `mascot-dragonball.png` — mascotte candidate, pas encore intégrée dans l'app.

## Utilisation prévue

Ces images servent de source pour :
- Les couleurs d'accent du dashboard par thème (`app/src/dashboard/style.css`, sélecteur `[data-visual-theme]`)
- Les sprites affichés dans l'overlay mascotte (`app/src/overlay/`), une fois les mascottes candidates intégrées
- Les icônes de tray et d'app (déclinaisons redimensionnées à prévoir : 16x16, 32x32, 256x256 pour le packaging Electron)
- La sélection de mascotte dans le dashboard (réglages)

Toute nouvelle mascotte ajoutée à un thème doit respecter le style pixel art 8-bit/16-bit et la palette de couleurs de la charte graphique correspondante.
