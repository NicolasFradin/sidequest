# Plan de développement V0.5 — Hooks Claude Code

**Repo local** : `/Users/nicolas/perso/ClaudeCodeGym`
**Prérequis** : MVP (voir [`plan-mvp-mascotte-coach.md`](plan-mvp-mascotte-coach.md)) livré et mergé dans `master`.

## 1. Vision

Le MVP déclenche la mascotte sur un simple minuteur mural (toutes les 30 min par défaut), sans lien avec ce que fait réellement l'utilisateur. La V0.5 remplace/complète ce minuteur par un déclenchement **contextuel** : la mascotte apparaît quand Claude Code termine sa réponse, c'est-à-dire exactement au moment où commence le temps mort — façon `claude-gym` (l'inspiration citée dans le plan MVP, section 1).

Codex est mentionné dans la vision long terme du plan MVP, mais son système de hooks n'a pas été vérifié — cette version se concentre sur Claude Code, Codex reste une extension possible si son mécanisme s'y prête (à valider en sprint 5 de cette version).

## 2. Décisions de cadrage

- **Mécanisme** : les [hooks Claude Code](https://docs.claude.com/en/docs/claude-code/hooks) (commandes shell configurées dans `settings.json`, exécutées automatiquement à certains évènements du cycle de vie d'une session). Pas de lecture/tail de logs locaux (contrairement à ce que le plan MVP envisageait dans `core/hooks/`) — les hooks poussent l'info activement, plus fiable qu'un lecteur de logs qui doit deviner le format/l'emplacement des logs.
- **Hook principal** : `Stop` — se déclenche quand Claude Code termine sa réponse et rend la main, exactement le début du temps mort qu'on veut occuper.
- **Transport** : un petit serveur HTTP local (`127.0.0.1:54321`, port fixe codé en dur) exposé par le process principal Electron déjà en tray. Le hook appelle juste `curl` — pas besoin de publier de CLI ni de dépendance Node côté hook, la commande shell suffit. Port fixe plutôt que dynamique+fichier de découverte (option envisagée puis écartée) : élimine toute la complexité de lecture de fichier côté hook pour un risque de collision négligeable sur un outil desktop perso.
- **Sécurité** : liaison loopback uniquement, aucune authentification au MVP de cette version (outil 100% local, même modèle de confiance qu'un `Stop` hook qui peut déjà exécuter n'importe quelle commande shell sur la machine — le risque additionnel d'un endpoint HTTP local non authentifié est négligeable en comparaison).
- **Cohabitation avec le timer** : le timer classique (`Scheduler`) reste actif par défaut ; le hook vient s'ajouter comme déclenchement supplémentaire, pas un remplacement forcé. Réglage dashboard pour choisir : timer seul / hook seul / les deux (comportement par défaut).
- **Installation du hook** : automatique plutôt que manuelle (option "copier-coller le JSON" envisagée puis écartée, inspirée de la manière dont [graphify](https://github.com/Graphify-Labs/graphify) s'auto-enregistre dans les CLIs détectées) — un bouton dans le dashboard édite directement `~/.claude/settings.json` (fusion idempotente, sans écraser les hooks existants de l'utilisateur).

## 3. Architecture technique

### 3.1 Nouveau module dans `core`

```
packages/core/src/
├── hook-server.ts            # serveur HTTP local (node:http natif, pas de dépendance externe)
└── claude-hook-installer.ts  # lit/écrit ~/.claude/settings.json (fusion idempotente)
```

`hook-server.ts` expose une classe `HookServer` (même esprit que `Scheduler` — logique pure, testable, aucune dépendance Electron) :
- `start()` : écoute sur `127.0.0.1:54321` (port fixe exporté en constante).
- `POST /trigger` → appelle un callback `onTrigger` (déclenchement immédiat, modes `stop`/`start`).
- `POST /turn-start` / `POST /turn-end` → callbacks `onTurnStart`/`onTurnEnd` (mode `thinking`, débounce géré côté `app`, voir sprint 6).
- `stop()`.

`claude-hook-installer.ts` expose des fonctions pures (testables sans toucher au vrai fichier utilisateur — chemin injecté en paramètre) :
- `isInstalled(settingsPath)` : vérifie si un de nos hooks (n'importe quel `hookTriggerMode`) est déjà présent.
- `install(settingsPath, mode)` / `uninstall(settingsPath)` : lit le JSON existant (le crée s'il n'existe pas), installe la combinaison de hooks propre au `mode` demandé (`Stop` pour `stop`, `UserPromptSubmit` pour `start`, les deux pour `thinking`) en retirant d'abord proprement ceux d'un mode précédent, sans toucher aux autres hooks déjà configurés par l'utilisateur.

### 3.2 Câblage côté `app`

- `main/index.js` instancie `HookServer` à côté du `Scheduler` existant, démarré/arrêté en même temps que l'app.
- Nouveau réglage `settings.triggerSource` (`"timer"` / `"hook"` / `"both"`, défaut `"both"`) : quand `"hook"` seul, le `Scheduler` classique est mis en pause (`scheduler.stop()`) et seul `/trigger` déclenche des exercices.
- Dashboard (onglet Réglages) : nouveau sélecteur pour ce réglage, même style que le sélecteur de mode existant.

### 3.3 Configuration côté utilisateur

Une carte dédiée dans le dashboard ("Intégration Claude Code") affiche :
- Un statut ("Activé" / "Non activé", déterminé via `isInstalled()`).
- Un sélecteur `hookTriggerMode` (fin de réponse / début de réponse / pendant que Claude réfléchit, voir sprint 6) — persisté même si l'intégration n'est pas encore activée ; si elle l'est déjà, changer le mode réinstalle automatiquement les bons hooks.
- Un bouton unique qui bascule : "Activer l'intégration" → appelle `install(path, hookTriggerMode)` côté main process via IPC ; "Désactiver" → `uninstall()`.
- Un lien vers la doc des [hooks Claude Code](https://docs.claude.com/en/docs/claude-code/hooks) pour les curieux, mais aucune manipulation JSON requise pour l'usage normal.

## 4. Périmètre fonctionnel

**Inclus**
- Serveur HTTP local dans `core`, démarré avec l'app
- Déclenchement d'un exercice via hook Claude Code, point de déclenchement au choix (`hookTriggerMode` : fin de réponse / début de réponse / pendant que Claude réfléchit — sprint 6)
- Réglage timer / hook / les deux
- Carte dashboard avec activation/désactivation automatique du hook (édition directe de `settings.json`)

**Exclus (à revoir plus tard si pertinent)**
- Support Codex (mécanisme de hooks à vérifier — pas encore fait)
- Pause automatique pendant une session active (hook `UserPromptSubmit`/`SessionStart` pour ne pas interrompre en pleine frappe) — voir sprint 4, optionnel
- Authentification/sécurisation du endpoint local (non nécessaire tant que c'est loopback-only)
- Blocage réel de la session Claude Code (pas juste l'UI de la mascotte) tant que l'exercice n'est pas marqué fait, en mode bloquant : le hook `Stop` renverrait une décision de blocage (`{"decision": "block", ...}`) tant que `/trigger` n'a pas reçu de confirmation `done`, forçant Claude Code à ne pas rendre la main. À valider : impact UX si l'utilisateur veut juste terminer un tour rapide, et fiabilité du polling/callback entre le hook (qui timeout probablement) et l'état de l'overlay.

## 5. Sprints de développement

1. **Sprint 1 — Serveur IPC local** : `HookServer` dans `core` (`node:http` natif, port fixe), tests unitaires (démarrage, `/trigger` déclenche le callback). Testable en isolation sans Electron.
2. **Sprint 2 — Installeur automatique** : `claude-hook-installer.ts` (`isInstalled`/`install`/`uninstall`), tests unitaires sur fichier temporaire (fusion idempotente, préserve les hooks existants de l'utilisateur).
3. **Sprint 3 — Câblage app + réglage timer/hook/both** : instanciation de `HookServer` dans `main/index.js`, nouveau réglage `triggerSource` dans `Storage`/dashboard, pause du `Scheduler` quand `"hook"` seul.
4. **Sprint 4 — Carte dashboard "Intégration Claude Code"** : statut + bouton activer/désactiver branché sur l'installeur, doc utilisateur (README).
5. **Sprint 5 (optionnel)** — Pause intelligente pendant une session active + investigation support Codex + blocage réel de la session Claude Code en mode bloquant (voir section 4).
6. **Sprint 6 (fait, 2026-08-16)** — Déclenchement pendant que Claude "réfléchit". Nouveau réglage dashboard `hookTriggerMode` (dans la carte "Intégration Claude Code") pour choisir le point de déclenchement :
   - **`stop`** (défaut, comportement historique) — hook `Stop` installé, déclenchement à la fin de la réponse de Claude.
   - **`start`** — hook `UserPromptSubmit` installé, déclenchement immédiat dès que l'utilisateur soumet son message (début du tour de Claude).
   - **`thinking`** — hook `UserPromptSubmit` **et** `Stop` installés ensemble : `UserPromptSubmit` démarre un débounce de 8s (`THINKING_DEBOUNCE_MS` dans `main/index.js`) avant de proposer l'exercice, `Stop` l'annule si Claude a répondu avant ce délai. Répond à la question ouverte du point précédent ("éviter de spammer sur des échanges courts") sans avoir besoin de `PreToolUse`/`PostToolUse`.
   - **Architecture** : `claude-hook-installer.ts` installe la combinaison de hooks propre à chaque mode (retire proprement les hooks du mode précédent avant d'installer le nouveau, sans toucher aux hooks tiers) ; `HookServer` (core) expose deux nouvelles routes `/turn-start` et `/turn-end` en plus de `/trigger` ; `main/index.js` porte la logique de débounce (`pendingThinkingTimer`) et réinstalle automatiquement les hooks si le mode change alors que l'intégration est déjà active.
   - **Non traité pour l'instant** (repris tel quel du point précédent) : combinaison avec `PreToolUse`/`PostToolUse` pour distinguer un vrai travail long d'un aller-retour rapide (le débounce fixe de 8s suffit en première approche) ; cohabitation fine avec l'idée inverse du sprint 5 (pause pendant la frappe active) — les deux utilisent `UserPromptSubmit` mais à des fins différentes, pas encore réconciliées.

## 6. Suite

Une fois cette version livrée, retour à la roadmap générale du plan MVP (section 6) — prochaine étape naturelle : **V0.5+** (mascottes animées) ou **V1** (génération d'exercices via API Claude), selon la priorité du moment.
