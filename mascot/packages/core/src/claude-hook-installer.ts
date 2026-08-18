import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { HOOK_SERVER_PORT } from "./hook-server.js";
import type { HookTriggerMode } from "./storage.js";

const CURL = (route: string) => `curl -s -X POST http://127.0.0.1:${HOOK_SERVER_PORT}${route}`;

/** Commande du déclenchement immédiat — modes "stop" (hook Stop) et "start" (hook UserPromptSubmit). */
export const CLAUDE_HOOK_COMMAND = CURL("/trigger");
/** Commandes du mode "thinking" — début/fin de tour, pour le débounce côté HookServer. */
export const CLAUDE_HOOK_TURN_START_COMMAND = CURL("/turn-start");
export const CLAUDE_HOOK_TURN_END_COMMAND = CURL("/turn-end");

/** Toutes les commandes qu'on a pu installer, tous modes confondus — sert à les reconnaître/retirer. */
const OUR_COMMANDS = new Set([CLAUDE_HOOK_COMMAND, CLAUDE_HOOK_TURN_START_COMMAND, CLAUDE_HOOK_TURN_END_COMMAND]);

/** Évènements Claude Code sur lesquels on est susceptible d'avoir installé un hook, tous modes confondus. */
const OUR_EVENTS = ["Stop", "UserPromptSubmit"] as const;

/**
 * Timeout (secondes) du hook `/trigger` (modes "stop"/"start") — le serveur local peut retenir sa
 * réponse tant qu'un exercice bloquant déclenché n'est pas marqué fait (voir hook-server.ts),
 * donc le hook Claude Code doit avoir le temps d'attendre au lieu d'être tué après le défaut
 * (60s). Pas nécessaire pour /turn-start /turn-end (mode "thinking") qui répondent toujours
 * immédiatement, jamais bloquants.
 */
export const HOOK_TIMEOUT_SECONDS = 600;

/** Pour un mode donné, la liste des (évènement, commande, timeout éventuel) à installer. */
function entriesForMode(
  mode: HookTriggerMode
): { event: (typeof OUR_EVENTS)[number]; command: string; timeout?: number }[] {
  switch (mode) {
    case "stop":
      return [{ event: "Stop", command: CLAUDE_HOOK_COMMAND, timeout: HOOK_TIMEOUT_SECONDS }];
    case "start":
      return [{ event: "UserPromptSubmit", command: CLAUDE_HOOK_COMMAND, timeout: HOOK_TIMEOUT_SECONDS }];
    case "thinking":
      return [
        { event: "UserPromptSubmit", command: CLAUDE_HOOK_TURN_START_COMMAND },
        { event: "Stop", command: CLAUDE_HOOK_TURN_END_COMMAND },
      ];
  }
}

interface HookCommandEntry {
  type: string;
  command: string;
  [key: string]: unknown;
}

interface HookGroup {
  hooks: HookCommandEntry[];
  [key: string]: unknown;
}

interface ClaudeSettings {
  hooks?: {
    [event: string]: HookGroup[] | undefined;
  };
  [key: string]: unknown;
}

function readSettings(settingsPath: string): ClaudeSettings {
  if (!existsSync(settingsPath)) return {};
  const raw = readFileSync(settingsPath, "utf-8").trim();
  return raw ? (JSON.parse(raw) as ClaudeSettings) : {};
}

function writeSettings(settingsPath: string, settings: ClaudeSettings): void {
  mkdirSync(dirname(settingsPath), { recursive: true });
  writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf-8");
}

function isOurCommand(entry: HookCommandEntry): boolean {
  return entry.type === "command" && OUR_COMMANDS.has(entry.command);
}

/** Vrai si un de nos hooks (n'importe quel mode) est déjà présent dans `settingsPath`. */
export function isInstalled(settingsPath: string): boolean {
  const settings = readSettings(settingsPath);
  return OUR_EVENTS.some((event) => (settings.hooks?.[event] ?? []).some((group) => group.hooks.some(isOurCommand)));
}

/**
 * Retire tous nos hooks (n'importe quel mode) de `settingsPath` — no-op si le fichier n'existe
 * pas ou si aucun de nos hooks n'y est présent. Préserve tous les autres hooks/groupes déjà
 * présents. Retourne les settings modifiés (à réécrire par l'appelant) ou `null` si rien à faire.
 */
function withoutOurHooks(settings: ClaudeSettings): { settings: ClaudeSettings; changed: boolean } {
  let changed = false;
  if (!settings.hooks) return { settings, changed };

  for (const event of OUR_EVENTS) {
    const groups = settings.hooks[event];
    if (!groups) continue;

    const filtered: HookGroup[] = [];
    for (const group of groups) {
      const keptHooks = group.hooks.filter((entry) => {
        const isOurs = isOurCommand(entry);
        if (isOurs) changed = true;
        return !isOurs;
      });
      if (keptHooks.length > 0) filtered.push({ ...group, hooks: keptHooks });
    }
    settings.hooks[event] = filtered;
  }

  return { settings, changed };
}

/**
 * Installe les hooks Claude Code correspondant à `mode` dans `settingsPath` (créé si absent).
 * Idempotent — retire d'abord nos éventuels hooks d'un mode précédent avant d'installer ceux du
 * nouveau mode, pour permettre de changer de mode proprement. Ne touche à aucun autre réglage ou
 * hook déjà configuré par l'utilisateur.
 */
export function install(settingsPath: string, mode: HookTriggerMode = "stop"): void {
  const { settings } = withoutOurHooks(readSettings(settingsPath));
  settings.hooks ??= {};

  for (const { event, command, timeout } of entriesForMode(mode)) {
    settings.hooks[event] ??= [];
    const entry: HookCommandEntry = { type: "command", command };
    if (timeout !== undefined) entry.timeout = timeout;
    settings.hooks[event]!.push({ hooks: [entry] });
  }

  writeSettings(settingsPath, settings);
}

/**
 * Retire tous nos hooks (n'importe quel mode) de `settingsPath`. Idempotent — no-op si le
 * fichier n'existe pas ou si aucun de nos hooks n'y est présent — et préserve tous les autres
 * hooks/groupes déjà présents.
 */
export function uninstall(settingsPath: string): void {
  if (!existsSync(settingsPath)) return;

  const { settings, changed } = withoutOurHooks(readSettings(settingsPath));
  if (!changed) return;
  writeSettings(settingsPath, settings);
}
