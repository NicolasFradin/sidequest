# Plan de développement MVP — Mascotte Coach (idle time companion)

**Repo local** : `/Users/nicolas/perso/ClaudeCodeGym`

## 1. Vision produit

Une application desktop cross-platform qui affiche une mascotte à l'écran (façon Clippy) pendant les temps morts de l'utilisateur (ex. attente de réponse de Claude Code / Codex / Copilot), pour proposer des micro-exercices de sport. Positionnement long terme : marketplace de "idle time" (sport, yoga, formations...), avec une couche premium (leaderboard, skins, réglages avancés, IA).

Inspirations : `claude-gym` (notification douce, lecture de logs locaux) et `workout-gate` (blocage réel de session, webcam anti-triche).

## 2. Décisions de cadrage validées

- **Friction** : les deux modes dispo dès le MVP, réglables dans les settings (notification douce **et** blocage réel).
- **Plateformes** : macOS, Windows, Linux dès le MVP.
- **Stack** : Electron (écosystème npm), stack définitivement tranchée après comparaison avec Neutralino.js, Tauri et des alternatives 100% Python (PySide6, pywebview) — Electron retenu pour la maturité de l'écosystème (tray, autolaunch, fenêtres transparentes) et la vitesse de développement en solo. Pas de webcam/anti-triche au MVP mais schéma de données prêt pour ça.
- **Mascottes** : les 2 mascottes fournies (Ronnie Coleman, Miami 80s) intégrées dès le MVP, thème Miami Vice 80s.
- **Licence** : MIT/Apache 2.0 sur le repo public dès maintenant — les features premium futures ne seront jamais publiées dans ce repo (voir section 7).

## 3. Architecture technique

### 3.1 Monorepo (pnpm workspaces)

```
mascot/
├── packages/
│   ├── core/                # package npm pur, sans dépendance Electron
│   │   ├── scheduler.ts     # timer + triggers (idle time)
│   │   ├── hooks/           # lecteurs de logs Claude Code / Codex (v0.5)
│   │   ├── exercises/       # data fixe des exercices (JSON packs)
│   │   ├── storage.ts       # SQLite (better-sqlite3) : historique + settings
│   │   └── gate.ts          # logique de blocage de session
│   └── app/                 # app Electron
│       ├── main/            # process principal : tray, fenêtres, autolaunch
│       ├── overlay/         # fenêtre mascotte (HTML/CSS/JS vanilla, transparente, always-on-top)
│       └── dashboard/       # fenêtre réglages/historique (HTML/CSS/JS vanilla, graphes canvas/SVG faits main — décision Sprint 3 : cohérence avec l'overlay, pas de bundler au MVP)
├── assets/mascots/          # sprites (Ronnie Coleman, Miami 80s)
└── package.json
```

`core` est réutilisable indépendamment de l'app graphique (ex. via `npx`), et deviendra la base du futur système de "packs" marketplace.

### 3.2 Modèle de données (SQLite local)

**`settings`**
- `interval_minutes`, `mode` (`notify` / `gate` / `mixed`), `active_mascot`, `autolaunch` (bool), `active_program`

**`sessions`**
- `id`, `timestamp`, `exercise_id`, `status` (`done` / `skipped` / `missed`), `trigger_type` (`timer` / `hook`), `verified` (bool, `false` par défaut — prêt pour anti-triche future)

**`exercises`** (packs, format déclaratif JSON — jamais de code exécutable, voir 3.3)

Les graphes du dashboard (streak, volume/semaine) se calculent à la volée depuis `sessions`, pas de champ score agrégé stocké — ça évite toute migration le jour où la formule de score change.

### 3.3 Format des packs (extensible dès le MVP)

Un pack = un fichier JSON déclaratif (jamais de JS exécuté), ex :

```json
{
  "id": "sport-basic",
  "name": "Sport - Programme de base",
  "exercises": [
    { "id": "squat-10", "label": "10 squats", "duration_sec": 30, "category": "jambes" },
    { "id": "pushup-10", "label": "10 pompes", "duration_sec": 30, "category": "bras" }
  ]
}
```

Ce choix (données déclaratives, pas de code) est ce qui permettra plus tard d'ouvrir la création de packs à des créateurs tiers sans risque de sécurité (pas de sandboxing de JS à gérer).

### 3.4 Lancement au démarrage

`app.setLoginItemSettings({ openAtLogin: true })` (macOS/Windows) + génération d'un fichier `.desktop` dans `~/.config/autostart/` pour Linux. Toggle exposé dans le dashboard.

### 3.5 Accès au dashboard

L'app tourne en arrière-plan comme une "menu bar app" (pas de fenêtre ouverte par défaut, juste une icône dans la barre des tâches/menu bar) :

- **Clic sur l'icône tray** (gauche ou droit, pas de distinction sur macOS) → affiche le menu contextuel : "Ouvrir le dashboard", "Mettre en pause", "Quitter". Le dashboard ne s'ouvre jamais automatiquement au clic, seulement via "Ouvrir le dashboard" (décision revue en cours de Sprint 5 — le plan prévoyait initialement un clic simple = toggle direct).
- **Raccourci clavier global configurable** (ex. `Cmd/Ctrl+Shift+M`) pour ouvrir le dashboard depuis n'importe où sans toucher la souris.
- **Depuis l'overlay mascotte** : une icône réglages discrète (⚙) ouvre directement le dashboard sur l'onglet concerné.
- **Premier lancement** : le dashboard s'ouvre automatiquement (onboarding : choix de la mascotte, intervalle, autolaunch).
- Techniquement : une seule instance de `BrowserWindow` créée puis réutilisée (masquée/affichée, jamais recréée), avec `app.requestSingleInstanceLock()` pour éviter les doublons si l'app est relancée alors qu'elle tourne déjà.
- Fermer la fenêtre (croix) ne quitte pas l'app — elle repasse en tray, seul "Quitter" dans le menu tray termine le process. Comportement standard des apps menu bar (Spotify, Docker Desktop, etc.).

Pas de serveur web local nécessaire pour le MVP (le dashboard est chargé directement en local dans la `BrowserWindow`) — ça ne deviendra pertinent que si une version web/SaaS voit le jour plus tard (V2+).

## 4. Périmètre fonctionnel du MVP

**Inclus**
- Mascotte overlay déclenchée par un timer configurable (2 mascottes au choix)
- Mode notification douce **et** mode blocage réel, réglables
- Dashboard : réglages (intervalle, mode, mascotte, autolaunch), historique de séances, 1-2 graphes (volume/semaine, streak)
- Stockage 100% local (SQLite)
- Packaging cross-platform (macOS/Windows/Linux) via `electron-builder`

**Exclus du MVP (roadmap ultérieure)**
- Vérification webcam / anti-triche
- Génération d'exercices par LLM
- Hooks spécifiques Claude Code / Codex (lecture de logs)
- Leaderboard, comptes utilisateurs, skins premium, backend

## 5. Sprints de développement

1. **Sprint 1 — Squelette du monorepo** : setup pnpm workspaces, `core` avec scheduler + storage SQLite + 1 pack "sport" (10-15 exercices). Tests unitaires du scheduler.
2. **Sprint 2 — App Electron minimale** : tray icon, overlay transparent always-on-top affichant un exercice au déclenchement du timer, intégration des 2 sprites.
3. **Sprint 3 — Dashboard** : fenêtre réglages complète, écran historique + graphes Recharts.
4. **Sprint 4 — Mode blocage** : overlay bloquant + logique de dette de sessions non faites (honor system, champ `verified` toujours à `false`).
5. **Sprint 5 — Packaging & distribution** : `electron-builder` pour les 3 OS, releases GitHub, README d'installation, licence MIT/Apache 2.0.

## 6. Roadmap post-MVP

| Version | Contenu |
|---|---|
| V0.5 | Hooks Claude Code / Codex (déclenchement contextuel, façon claude-gym) — voir [`plan-v0.5-hooks-claude-code.md`](plan-v0.5-hooks-claude-code.md) |
| V0.5+ | Mascottes animées dans l'overlay (au repos + pendant l'exercice) — à trancher entre GIF simple (rapide, cohérent avec le pixel art actuel) et animation plus poussée (spritesheet, squelette) selon le temps dispo |
| V1 | Génération d'exercices via API Claude, programmes personnalisés |
| V1.5 | Registre de packs installable (`mascot install pack-yoga`), encore gratuit |
| V2 | Backend : comptes, leaderboard FR/monde (score composite, champ `verified` activé), skins premium |
| V2.5 | Affinage post-lancement V2 sur données d'usage réelles : formule exacte du score composite, activation de la vérification anti-triche webcam (schéma déjà prêt, `verified: bool`), détail final du split Free/Premium |
| V3 | Marketplace ouverte à des créateurs tiers (commission), abonnement IA |

## 7. Stratégie licence & monétisation future

- Repo public actuel : licence **MIT ou Apache 2.0**, jamais modifiée rétroactivement.
- Toutes les futures features premium (backend leaderboard, sync compte, vérification, logique de licence) sont développées dans du code **jamais publié** (repo privé séparé), qui communique avec le client open-source via API.
- Le client open-source reste complet et fonctionnel sans le backend premium — seules les features premium (participation leaderboard, skins, IA) nécessitent une licence/API key vérifiée côté serveur.
- Alternative à évaluer plus tard si le risque de fork concurrent devient réel : passer les futures parties sensibles en **AGPL** plutôt que MIT.

## 8. Problèmes connus (à ré-investiguer)

- **Icône Dock macOS peu fiable** : en dev (`electron .`) comme sur l'app packagée non signée, l'icône custom du Dock apparaît de façon intermittente puis peut disparaître après quelques secondes (`app.dock.setIcon()` en dev, mais aussi le `.icns` natif du bundle packagé). Hypothèse la plus probable : comportement connu de macOS Icon Services/LaunchServices avec les apps **non signées** (`mac.identity: null` dans la config electron-builder, faute de compte Apple Developer payant) — à revérifier une fois l'app réellement signée/notariée. Non bloquant : la tray icon (menu bar) fonctionne de façon fiable dans tous les cas, c'est le point d'accès principal de l'app.

## 9. Charte graphique (adaptée du template fourni)

Basée sur la charte "Ronnie Coleman App" fournie (pensée pour mobile), adaptée ici pour une app desktop (overlay + dashboard).

### Palette de couleurs

| Usage | Couleur | Hex |
|---|---|---|
| Fond principal | Noir bleuté | `#0B0E1A` |
| Fond secondaire (cards) | Bleu nuit | `#15182B` |
| Accent bleu | Bleu électrique | `#1E90FF` |
| Accent cyan | Turquoise néon | `#00E5D4` |
| Accent primaire (CTA) | Rose magenta | `#FF2D95` |
| Accent doré | Jaune/or | `#FFD23F` |
| Texte clair | Blanc | `#FFFFFF` |
| Texte secondaire | Gris clair | `#A1A1AA` |

Dégradés : cyan → violet (logo, headers), rose → orange (CTA alternatifs, badges).

### Typographies

- **Titres/headlines** : Bebas Neue
- **Accents/punchlines** (façon "YEAH BUDDY!") : Permanent Marker
- **Texte courant** (dashboard, labels, données) : Inter

Les trois sont disponibles gratuitement sur Google Fonts, utilisables sans restriction en usage commercial.

### Composants UI repris pour le dashboard Electron

- **Bouton primaire** : fond dégradé rose, texte blanc, coins arrondis
- **Bouton secondaire** : contour cyan/blanc, fond transparent
- **Bouton tertiaire** : lien texte + chevron
- **Card** : fond `#15182B`, coins arrondis, avatar mascotte + titre + barre de progression
- **Progress bar** : fond sombre, remplissage dégradé cyan → rose
- **Badge** : contour rose, texte majuscules, fond transparent
- **Icônes** : style outline simple (haltère, flamme, graphique, cloche, réglages...)

### Adaptation mobile → desktop

- Le template original utilise une bottom nav bar mobile → sur desktop, elle devient une **sidebar de navigation** (Accueil / Programme / Historique / Réglages / Profil).
- L'**overlay mascotte** reprend le style "card" du template en version compacte : fond sombre à contour néon, sprite pixel-art + texte de l'exercice + boutons primaire/secondaire (fait/passer).
- Le fond dégradé néon avec skyline (present sur les écrans d'exemple) peut habiller l'arrière-plan du dashboard, en version subtile pour ne pas nuire à la lisibilité des graphes et données.

### Illustrations

Style pixel art 8-bit/16-bit, ambiance néon Miami 80s, contraste élevé — cohérent avec les deux mascottes déjà intégrées (Ronnie Coleman, Miami 80s) et à conserver pour toute mascotte additionnelle future.

Mascottes statiques (PNG) au MVP. Animation prévue post-MVP (voir roadmap V0.5+) : à conserver en tête pour le format des futurs assets, sans bloquer le MVP sur ce point.
