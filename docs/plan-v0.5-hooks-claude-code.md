# Plan de développement V0.5 — Hooks Claude Code

**Repo local** : `/Users/nicolas/perso/ClaudeCodeGym`
**Prérequis** : MVP (voir [`plan-mvp-mascotte-coach.md`](plan-mvp-mascotte-coach.md)) livré et mergé dans `master`.

## 1. Vision

Le MVP déclenche la mascotte sur un simple minuteur mural (toutes les 30 min par défaut), sans lien avec ce que fait réellement l'utilisateur. La V0.5 remplace/complète ce minuteur par un déclenchement **contextuel** : la mascotte apparaît quand Claude Code termine sa réponse, c'est-à-dire exactement au moment où commence le temps mort — façon `claude-gym` (l'inspiration citée dans le plan MVP, section 1).

Codex est mentionné dans la vision long terme du plan MVP, mais son système de hooks n'a pas été vérifié — cette version se concentre sur Claude Code, Codex reste une extension possible si son mécanisme s'y prête (à valider en sprint 4 de cette version).

## 2. Décisions de cadrage

- **Mécanisme** : les [hooks Claude Code](https://docs.claude.com/en/docs/claude-code/hooks) (commandes shell configurées dans `settings.json`, exécutées automatiquement à certains évènements du cycle de vie d'une session). Pas de lecture/tail de logs locaux (contrairement à ce que le plan MVP envisageait dans `core/hooks/`) — les hooks poussent l'info activement, plus fiable qu'un lecteur de logs qui doit deviner le format/l'emplacement des logs.
- **Hook principal** : `Stop` — se déclenche quand Claude Code termine sa réponse et rend la main, exactement le début du temps mort qu'on veut occuper.
- **Transport** : un petit serveur HTTP local (`127.0.0.1` uniquement, port fixe ou découvert via un fichier dans `userData`) exposé par le process principal Electron déjà en tray. Le hook appelle juste `curl` — pas besoin de publier de CLI ni de dépendance Node côté hook, la commande shell suffit.
- **Sécurité** : liaison loopback uniquement, aucune authentification au MVP de cette version (outil 100% local, même modèle de confiance qu'un `Stop` hook qui peut déjà exécuter n'importe quelle commande shell sur la machine — le risque additionnel d'un endpoint HTTP local non authentifié est négligeable en comparaison).
- **Cohabitation avec le timer** : le timer classique (`Scheduler`) reste actif par défaut ; le hook vient s'ajouter comme déclenchement supplémentaire, pas un remplacement forcé. Réglage dashboard pour choisir : timer seul / hook seul / les deux (comportement par défaut).

## 3. Architecture technique

### 3.1 Nouveau module dans `core`

```
packages/core/src/
└── hook-server.ts   # serveur HTTP local (node:http natif, pas de dépendance externe)
```

`hook-server.ts` expose une classe `HookServer` (même esprit que `Scheduler` — logique pure, testable, aucune dépendance Electron) :
- `start()` : écoute sur `127.0.0.1`, port choisi dynamiquement (`0` → OS assigne un port libre), écrit le port choisi dans `<userData>/hook-server.port` pour que la commande hook puisse le retrouver.
- `POST /trigger` → appelle un callback `onTrigger` (branché sur `scheduler.triggerNow()` côté `app`).
- `stop()`.

### 3.2 Câblage côté `app`

- `main/index.js` instancie `HookServer` à côté du `Scheduler` existant, démarré/arrêté en même temps que l'app.
- Nouveau réglage `settings.triggerSource` (`"timer"` / `"hook"` / `"both"`, défaut `"both"`) : quand `"hook"` seul, le `Scheduler` classique est mis en pause (`scheduler.stop()`) et seul `/trigger` déclenche des exercices.
- Dashboard (onglet Réglages) : nouveau sélecteur pour ce réglage, même style que le sélecteur de mode existant.

### 3.3 Configuration côté utilisateur

Un nouvel onglet ou une carte dédiée dans le dashboard ("Intégration Claude Code") affiche :
- Le port actif du serveur local (lecture seule, pour debug).
- Le snippet à copier-coller dans `~/.claude/settings.json` :

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "curl -s -X POST http://127.0.0.1:<port>/trigger"
          }
        ]
      }
    ]
  }
}
```

- Un bouton "Copier la config" (le port réel injecté automatiquement).

## 4. Périmètre fonctionnel

**Inclus**
- Serveur HTTP local dans `core`, démarré avec l'app
- Déclenchement d'un exercice via hook `Stop` de Claude Code
- Réglage timer / hook / les deux
- Carte dashboard avec instructions + config prête à copier

**Exclus (à revoir plus tard si pertinent)**
- Support Codex (mécanisme de hooks à vérifier — pas encore fait)
- Pause automatique pendant une session active (hook `UserPromptSubmit`/`SessionStart` pour ne pas interrompre en pleine frappe) — voir sprint 4, optionnel
- Authentification/sécurisation du endpoint local (non nécessaire tant que c'est loopback-only)

## 5. Sprints de développement

1. **Sprint 1 — Serveur IPC local** : `HookServer` dans `core` (`node:http` natif), tests unitaires (démarrage, `/trigger` déclenche le callback, port découvrable). Testable en isolation sans Electron.
2. **Sprint 2 — Câblage app + réglage timer/hook/both** : instanciation dans `main/index.js`, nouveau réglage `triggerSource` dans `Storage`/dashboard, pause du `Scheduler` quand `"hook"` seul.
3. **Sprint 3 — Carte dashboard "Intégration Claude Code"** : affichage du port, snippet de config copiable, doc utilisateur (README).
4. **Sprint 4 (optionnel)** — Pause intelligente pendant une session active + investigation support Codex.

## 6. Suite

Une fois cette version livrée, retour à la roadmap générale du plan MVP (section 6) — prochaine étape naturelle : **V0.5+** (mascottes animées) ou **V1** (génération d'exercices via API Claude), selon la priorité du moment.
