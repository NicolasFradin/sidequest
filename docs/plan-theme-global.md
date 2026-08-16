# Plan de développement — Thèmes globaux (skins)

**Repo local** : `/Users/nicolas/perso/ClaudeCodeGym`
**Statut** : feature non planifiée initialement dans la roadmap (voir [`plan-mvp-mascotte-coach.md`](plan-mvp-mascotte-coach.md), section 6) — démarrée directement le 2026-08-16 à la demande de l'utilisateur, documentée après coup.

## 1. Vision

Le MVP propose 2 mascottes indépendantes du thème clair/foncé du dashboard. Cette feature introduit une notion de **thème global** ("skin") : une identité visuelle complète associant une palette de couleurs pour le dashboard et une ou plusieurs mascottes dédiées, que l'utilisateur peut choisir. Différent du thème clair/foncé existant (`theme: "dark" | "light"`), qui reste et cohabite (orthogonal — un thème global peut être affiché en variante claire ou foncée).

## 2. Décisions de cadrage

- **4 thèmes au lancement** : Miami 80's (esprit GTA Vice City), Military camo (esprit Military 80's), Dragonball, Roman Empire.
- **Sélecteur** : bulles rondes alignées horizontalement dans la sidebar, juste au-dessus du bouton "Thème" (clair/foncé) existant. Chaque bulle a un fond texturé/dégradé représentatif de l'univers du thème (couleurs uniquement, pas de logo ni pictogramme dedans).
- **Portée de cette première itération** : uniquement l'UI de sélection (bulles + état actif + persistance du choix via un nouveau réglage `visualTheme`). Le reskin réel des couleurs du reste du dashboard et les mascottes dédiées par thème sont **hors scope** pour l'instant.
- **Mascottes** : en attendant les mascottes dédiées par thème (à fournir plus tard par l'utilisateur), les 4 thèmes réutilisent tels quels les 2 mascottes déjà disponibles (`ronnie-coleman`, `miami-80s`) — aucun changement du sélecteur de mascotte existant.

## 3. Architecture technique

- **`core/src/storage.ts`** : nouveau type `VisualTheme = "miami-80s" | "military-camo" | "dragonball" | "roman-empire"`, nouveau champ `Settings.visualTheme` (défaut `"miami-80s"`), persisté comme les autres réglages (table `settings` clé/valeur, aucune migration de schéma nécessaire).
- **Dashboard** (`app/src/dashboard/`) :
  - `index.html` : nouveau `<div class="visual-theme-row">` avec 4 boutons `.visual-theme-bubble`, placé entre la nav et `#theme-toggle` dans la `<aside class="sidebar">`.
  - `style.css` : une classe par thème (`.visual-theme-miami-80s`, `.visual-theme-military-camo`, `.visual-theme-dragonball`, `.visual-theme-roman-empire`) définissant un `background` (gradient/couches de `radial-gradient` pour l'effet camo) — couleurs seules, aucune image. État `.active` avec anneau `box-shadow`.
  - `renderer.js` : suit le même pattern que `mascotButtons`/`modeButtons` — `visualThemeButtons`, toggle `.active` dans `applySettingsToUI()`, `save({ visualTheme })` au clic.
- Pas de câblage IPC supplémentaire : `dashboard:update-settings` est déjà générique (`Partial<Settings>`).
- **`docs/branding/`** réorganisé en un sous-dossier par thème (`miami-80s/`, `military-camo/`, `roman-empire/`, `dragonball/`) — voir `docs/branding/README.md` pour le détail de ce que contient chaque sous-dossier et ce qui reste à intégrer.

## 4. Périmètre fonctionnel

**Inclus (au fil des sprints 1 à 3, tous faits)**
- 4 bulles de sélection dans la sidebar, fond texturé par thème (couleurs uniquement)
- Réglage `visualTheme` persisté en base et reflété par l'état `.active` de la bulle sélectionnée
- Reskin des couleurs d'accent du dashboard par thème (`--accent-*` via `[data-visual-theme]`)
- Mascottes dédiées par thème, sélecteur du dashboard filtré selon le thème global actif

**Exclus (à faire plus tard, sprint 4)**
- Overlay mascotte adapté visuellement au thème choisi (aujourd'hui seul le dashboard est reskinné)

## 5. Sprints de développement

1. **Sprint 1 (fait, 2026-08-16)** — Réglage `visualTheme` dans `core`, bulles de sélection dans le dashboard (UI + persistance uniquement, sans reskin).
2. **Sprint 2 (fait, 2026-08-16)** — Palette de couleurs dédiée par thème appliquée au dashboard. L'utilisateur a fourni des templates de charte graphique (`docs/branding/<theme>/style-guide*.png`) pour les 4 thèmes (Miami 80's, Military camo, Roman Empire, puis Dragonball ajouté après coup) — voir section 3.1 pour le détail des couleurs extraites. Portée : uniquement les 4 tokens d'accent (`--accent-teal`, `--accent-magenta`, `--accent-gold`, `--accent-blue`), surchargés via `[data-visual-theme]` dans `style.css`, indépendamment du clair/foncé (`--bg-*`/`--text-*` restent pilotés par `[data-theme]`).
3. **Sprint 3 (fait, 2026-08-16)** — Intégration des mascottes dédiées par thème. Les 4 candidates (`mascot-sergeant.png`, `mascot-arnold-80s.png`, `mascot-dragonball.png`, et `mascot-roman_empire.png` fournie entre-temps) sont copiées dans `app/assets/mascots/` (`sergeant`, `arnold-80s`, `goku`, `centurion`). Le sélecteur de mascotte du dashboard (`renderer.js`, `MASCOTS_BY_THEME`) est désormais rendu dynamiquement selon le `visualTheme` actif — miami-80s en propose 3 (Ronnie Coleman, Miami 80s, Arnold 80s), les 3 autres thèmes en ont 1 chacun pour l'instant. Changer de thème réassigne automatiquement `activeMascot` sur la première mascotte du nouveau thème si l'actuelle n'y appartient pas. L'overlay (`overlay/renderer.js`) connaît toutes les mascottes, indépendamment du thème actif au moment de l'affichage.
4. **Sprint 4 (à venir)** — Reskin de l'overlay mascotte (`app/src/overlay/`) par thème, aujourd'hui non concerné par le sprint 2 (dashboard uniquement).
5. **Sprint 2.1 (fait, 2026-08-16)** — Ajustement du reskin du sprint 2, jugé pas assez marqué à l'usage : les bordures de carte (`--border-card`, `--border-option`) restaient toujours teintées teal quel que soit le thème (seuls 4 tokens d'accent changeaient, noyés dans un chrome resté générique) — elles sont désormais dérivées du thème actif via `color-mix()`. Nouvelle variable `--btn-primary-text` (remplace le texte codé en dur `#0b0e1a` sur les CTA/nav actifs) pour permettre à un thème d'utiliser un dégradé de bouton plus sombre et saturé avec un texte clair, plutôt que de se limiter à des teintes pastel avec texte sombre comme les 4 thèmes en avaient tous jusque-là. Palette Military camo recalibrée sur cette base (vert/marron/quasi-noir avec texte crème, au lieu de vert/rouge/tan pastel) suite à un retour direct sur cet exemple précis.
6. **Sprint 5 (idée, pas encore validée)** — Variantes clair/sombre par thème. Aujourd'hui un thème (`visualTheme`) a une seule palette d'accent, valable qu'on soit en mode clair ou sombre (seuls `--bg-*`/`--text-*` changent avec `[data-theme]`, indépendamment du thème visuel). Idée : donner à chaque thème deux identités distinctes selon le mode clair/sombre plutôt qu'une seule réutilisée telle quelle — exemple donné par l'utilisateur : Military camo clair = camo désertique (sable/beige/marron clair), Military camo sombre = camo forêt (vert/marron/quasi-noir, ce qui vient d'être fait au sprint 2.1). À trancher avant d'implémenter :
   - Techniquement : dédoubler chaque bloc `[data-visual-theme="..."]` en deux, combinés avec `[data-theme="light"]`/`[data-theme="dark"]` (sélecteurs `:root[data-visual-theme="military-camo"][data-theme="light"]` etc.), pas un changement d'architecture majeur vu que les deux attributs existent déjà sur `<html>`.
   - Est-ce que les 4 thèmes ont chacun une déclinaison claire/sombre qui a du sens (Military → désert/forêt est un cas naturel ; Roman Empire clair marbre blanc vs sombre nuit impériale ? Dragonball jour vs Super Saiyan nocturne ? à définir thème par thème plutôt que d'appliquer une règle uniforme).
   - Est-ce que les mascottes elles-mêmes doivent aussi avoir une variante claire/sombre (asset supplémentaire par thème), ou seulement la palette de couleurs — probablement juste la palette dans un premier temps, pour rester dans la portée du sprint 2/2.1.

### 3.1 Couleurs extraites des templates (sprint 2)

| Thème | accent-teal (rôle principal) | accent-magenta (CTA) | accent-gold (CTA, paire) | accent-blue (nav, secondaire) | Source |
|---|---|---|---|---|---|
| Miami 80's | `#00e5d4` | `#ff2d95` | `#ffd23f` | `#1e90ff` | palette déjà en place (`style-guide-dark.png` / `style-guide-light.png`) |
| Military camo | `#2e8b57` (vert) | `#c0392b` (rouge) | `#d7cda6` (kaki) | `#4b5e3a` (olive) | `military-camo/style-guide.png` |
| Roman Empire | `#1e88e5` (bleu) | `#e53935` (rouge) | `#fbc02d` (or) | `#00c853` (vert) | `roman-empire/style-guide.png` |
| Dragonball | `#00c2ff` (cyan) | `#e6391b` (rouge) | `#fdc82e` (or) | `#1e3a8a` (bleu marine) | `dragonball/style-guide.png` |

## 6. Suite

Une fois les sprints 3 et 4 réalisés, cette feature rejoint la roadmap générale du plan MVP (section 6) comme item à part entière (voir la ligne ajoutée dans le tableau).
