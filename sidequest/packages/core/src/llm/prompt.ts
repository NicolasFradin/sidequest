import { MAX_PACK_EXERCISES } from "../packs.js";

const MIN_EXERCISES = 4;
const MIN_DURATION_SEC = 10;
const MAX_DURATION_SEC = 120;

/**
 * Prompt unique, partagé par tous les fournisseurs (§ 3.2 du plan) — le texte libre de
 * l'utilisateur est interpolé comme donnée dans un template fixe, jamais concaténé dans une
 * commande shell (ça, c'est le travail des providers CLI eux-mêmes, voir claude-cli.ts/codex-cli.ts,
 * qui passent le prompt en argument de tableau à `execFile`, jamais via une chaîne shell).
 */
export function buildPackPrompt(userRequest: string): string {
  return `You generate a "SideQuest pack": a short list of quick micro-break exercises or activities someone can do in 10-120 seconds while waiting on something (a build, an AI response, etc).

Reply with ONLY a single JSON object, no markdown code fence, no commentary before or after. Exact shape:
{"name": "string", "exercises": [{"label": "string", "durationSec": number, "category": "string"}]}

Constraints:
- ${MIN_EXERCISES} to ${MAX_PACK_EXERCISES} exercises.
- Each "durationSec" between ${MIN_DURATION_SEC} and ${MAX_DURATION_SEC}.
- "name" is short and descriptive (a few words).
- "category" is a short one-or-two-word tag (e.g. "stretch", "breathing", "eyes").
- Write "label" and "category" in the same language as the user's request below.

User request: ${userRequest}`;
}
