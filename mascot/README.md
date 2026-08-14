# Mascot Coach — MVP

Application desktop qui affiche une mascotte coach pendant les temps morts (idle time), pour proposer des micro-exercices de sport.

## Structure

- `packages/core` — logique métier pure (scheduler, storage SQLite, packs d'exercices), sans dépendance à Electron.
- `packages/app` — app Electron : tray (barre de menu macOS) + overlay mascotte.

## Prérequis (macOS)

- Node.js 22+ (vérifier avec `node --version`)
- Xcode Command Line Tools (nécessaire pour compiler `better-sqlite3`) : `xcode-select --install` si pas déjà installé

## Installation

```bash
corepack enable
pnpm install
pnpm approve-builds --all   # autorise la compilation native de better-sqlite3 et le téléchargement d'Electron
```

## Tester `core` (logique métier)

```bash
# Suite de tests unitaires (scheduler, storage, packs)
pnpm test

# Voir le scheduler tourner en conditions réelles (1 exercice toutes les 3s, Ctrl+C pour arrêter)
cd packages/core && pnpm demo

# Compiler en JS (vérifie qu'il n'y a pas d'erreur de typage) — nécessaire avant de lancer l'app
pnpm build
```

## Tester l'app Electron (tray + overlay)

```bash
cd packages/app
pnpm start
```

Tu dois voir une icône apparaître dans la barre de menu macOS (en haut à droite). Clique dessus pour ouvrir le menu :
- **"Déclencher un exercice maintenant"** → fait apparaître l'overlay mascotte immédiatement (pas besoin d'attendre l'intervalle par défaut de 30 minutes).
- L'overlay affiche la mascotte, un exercice, et deux boutons ("C'est fait" / "Passer").
- **"Quitter"** ferme réellement l'app (fermer juste l'overlay ne quitte pas l'app, elle reste active en tray).

## ⚠️ Point d'attention : module natif partagé (better-sqlite3)

`core` (testé sous Node) et `app` (tourne sous Electron) partagent la même dépendance `better-sqlite3`, mais Electron utilise une version de Node différente en interne (ABI différente). Lancer l'app (`pnpm start` dans `packages/app`) recompile ce module pour Electron — ce qui peut ensuite faire échouer `pnpm test` dans `core` avec une erreur `NODE_MODULE_VERSION`.

**Si ça arrive**, depuis la racine du repo :

```bash
pnpm run fix:native-modules
```

Ça réinstalle proprement les dépendances natives pour Node. Tu peux ensuite relancer `pnpm test` normalement. C'est un aller-retour à faire uniquement si tu alternes entre tester `core` et lancer l'app — pas à chaque fois.

## Sprints réalisés

- [x] Sprint 1 — Squelette du monorepo + `core` (scheduler, storage, pack sport-basic, tests)
- [x] Sprint 2 — App Electron minimale (tray + overlay, mascotte + exercice + boutons fait/passer)
- [ ] Sprint 3 — Dashboard (réglages, historique, graphes)
- [ ] Sprint 4 — Mode blocage (gate)
- [ ] Sprint 5 — Packaging & distribution (electron-builder, releases GitHub)
