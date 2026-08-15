import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { HOOK_SERVER_PORT } from "./hook-server.js";

/** Commande installée dans le hook Stop de Claude Code — sert aussi de signature pour la retrouver. */
export const CLAUDE_HOOK_COMMAND = `curl -s -X POST http://127.0.0.1:${HOOK_SERVER_PORT}/trigger`;

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
    Stop?: HookGroup[];
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
  return entry.type === "command" && entry.command === CLAUDE_HOOK_COMMAND;
}

/** Vrai si notre hook Stop est déjà présent dans `settingsPath`. */
export function isInstalled(settingsPath: string): boolean {
  const settings = readSettings(settingsPath);
  const stopGroups = settings.hooks?.Stop ?? [];
  return stopGroups.some((group) => group.hooks.some(isOurCommand));
}

/**
 * Ajoute notre hook Stop dans `settingsPath` (créé si absent). Idempotent — n'ajoute rien si
 * déjà présent — et ne touche à aucun autre réglage ou hook déjà configuré par l'utilisateur.
 */
export function install(settingsPath: string): void {
  if (isInstalled(settingsPath)) return;

  const settings = readSettings(settingsPath);
  settings.hooks ??= {};
  settings.hooks.Stop ??= [];
  settings.hooks.Stop.push({ hooks: [{ type: "command", command: CLAUDE_HOOK_COMMAND }] });

  writeSettings(settingsPath, settings);
}

/**
 * Retire notre hook Stop de `settingsPath`. Idempotent — no-op si le fichier n'existe pas ou
 * si notre hook n'y est pas — et préserve tous les autres hooks/groupes déjà présents.
 */
export function uninstall(settingsPath: string): void {
  if (!existsSync(settingsPath)) return;

  const settings = readSettings(settingsPath);
  const stopGroups = settings.hooks?.Stop;
  if (!stopGroups) return;

  let changed = false;
  const filtered: HookGroup[] = [];
  for (const group of stopGroups) {
    const keptHooks = group.hooks.filter((entry) => {
      const isOurs = isOurCommand(entry);
      if (isOurs) changed = true;
      return !isOurs;
    });
    if (keptHooks.length > 0) filtered.push({ ...group, hooks: keptHooks });
  }

  if (!changed) return;
  settings.hooks!.Stop = filtered;
  writeSettings(settingsPath, settings);
}
