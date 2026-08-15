import { createServer } from "node:http";
import type { Server } from "node:http";

/** Port fixe pour le serveur de déclenchement local (hooks Claude Code) — voir plan V0.5. */
export const HOOK_SERVER_PORT = 54321;

export type HookServerOptions = {
  /** Callback appelé à chaque POST /trigger */
  onTrigger: () => void;
  /** Port d'écoute — 0 pour laisser l'OS en assigner un (utile en test). Défaut : HOOK_SERVER_PORT. */
  port?: number;
};

/**
 * Serveur HTTP local minimal, écoute sur 127.0.0.1 uniquement. Reçoit les appels des hooks
 * Claude Code (`curl -X POST http://127.0.0.1:54321/trigger`) pour déclencher un exercice
 * immédiatement, indépendamment du Scheduler à minuteur. Logique pure, testable sans Electron.
 */
export class HookServer {
  readonly port: number;
  private readonly onTrigger: () => void;
  private server: Server | null = null;

  constructor(options: HookServerOptions) {
    this.port = options.port ?? HOOK_SERVER_PORT;
    this.onTrigger = options.onTrigger;
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const server = createServer((req, res) => {
        if (req.method === "POST" && req.url === "/trigger") {
          this.onTrigger();
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
          return;
        }
        res.writeHead(404);
        res.end();
      });

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
