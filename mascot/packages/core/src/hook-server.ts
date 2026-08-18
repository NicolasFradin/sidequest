import { createServer } from "node:http";
import type { Server } from "node:http";

/** Port fixe pour le serveur de déclenchement local (hooks Claude Code) — voir plan V0.5. */
export const HOOK_SERVER_PORT = 54321;

export type HookServerOptions = {
  /**
   * Callback appelé à chaque POST /trigger (modes "stop" et "start"), reçoit `respond()` à
   * appeler pour renvoyer la réponse HTTP — permet à l'appelant de la retenir (donc de retenir
   * `curl`, donc le hook Claude Code, donc la main de l'utilisateur) tant qu'un exercice
   * bloquant qu'il vient de déclencher n'est pas marqué fait, plutôt que de répondre tout de
   * suite. Pour un déclenchement non bloquant, l'appelant doit juste appeler `respond()` de suite.
   */
  onTrigger: (respond: () => void) => void;
  /**
   * Callback appelé à chaque POST /turn-start (début de tour Claude, mode "thinking") — à
   * l'appelant de gérer le débounce (proposer l'exercice seulement si le tour dure encore après
   * un délai, annulé par onTurnEnd). Répond toujours immédiatement (pas de blocage en mode
   * "thinking", volontairement — voir plan-v0.5-hooks-claude-code.md). Optionnel, no-op par défaut.
   */
  onTurnStart?: () => void;
  /**
   * Callback appelé à chaque POST /turn-end (fin de tour Claude, mode "thinking") — sert à
   * annuler le débounce démarré par onTurnStart. Reçoit aussi `respond()`, comme onTrigger : si
   * le débounce a déjà déclenché un exercice bloquant encore en attente au moment où Claude a
   * fini, l'appelant peut retenir la réponse jusqu'à ce qu'il soit fait, plutôt que de répondre
   * tout de suite. Répond automatiquement si non fourni (comportement historique).
   */
  onTurnEnd?: (respond: () => void) => void;
  /** Port d'écoute — 0 pour laisser l'OS en assigner un (utile en test). Défaut : HOOK_SERVER_PORT. */
  port?: number;
};

/**
 * Serveur HTTP local minimal, écoute sur 127.0.0.1 uniquement. Reçoit les appels des hooks
 * Claude Code (`curl -X POST http://127.0.0.1:54321/trigger`, `/turn-start`, `/turn-end`) pour
 * déclencher un exercice indépendamment du Scheduler à minuteur. Logique pure, testable sans
 * Electron.
 */
export class HookServer {
  readonly port: number;
  private readonly onTrigger: (respond: () => void) => void;
  private readonly onTurnStart: () => void;
  private readonly onTurnEnd: (respond: () => void) => void;
  private server: Server | null = null;

  constructor(options: HookServerOptions) {
    this.port = options.port ?? HOOK_SERVER_PORT;
    this.onTrigger = options.onTrigger;
    this.onTurnStart = options.onTurnStart ?? (() => {});
    this.onTurnEnd = options.onTurnEnd ?? ((respond) => respond());
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const server = createServer((req, res) => {
        if (req.method !== "POST") {
          res.writeHead(404);
          res.end();
          return;
        }

        const respondOk = () => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
        };

        if (req.url === "/trigger") {
          this.onTrigger(respondOk);
          return;
        }
        if (req.url === "/turn-start") {
          this.onTurnStart();
          respondOk();
          return;
        }
        if (req.url === "/turn-end") {
          this.onTurnEnd(respondOk);
          return;
        }

        res.writeHead(404);
        res.end();
      });

      // Un exercice bloquant peut retenir la réponse à /trigger de nombreuses minutes (le temps
      // que l'utilisateur le fasse) — désactive les timeouts par défaut de Node qui couperaient
      // la connexion prématurément. Le vrai garde-fou est le champ `timeout` du hook Claude Code
      // lui-même (voir claude-hook-installer.ts).
      server.timeout = 0;
      server.requestTimeout = 0;

      server.once("error", reject);
      server.listen(this.port, "127.0.0.1", () => {
        server.off("error", reject);
        this.server = server;
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    const server = this.server;
    if (!server) return Promise.resolve();
    return new Promise((resolve) => {
      server.close(() => {
        this.server = null;
        resolve();
      });
    });
  }

  isRunning(): boolean {
    return this.server !== null;
  }

  /** Port réellement lié (utile quand `port: 0` a été passé pour laisser l'OS choisir) */
  getPort(): number | null {
    if (!this.server) return null;
    const address = this.server.address();
    return address && typeof address === "object" ? address.port : null;
  }
}
