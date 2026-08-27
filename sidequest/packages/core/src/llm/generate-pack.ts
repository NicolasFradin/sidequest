import { parsePackJson, type Exercise, type ParsePackJsonError } from "../packs.js";
import { buildPackPrompt } from "./prompt.js";
import type { LlmGenerateOptions, LlmProvider } from "./types.js";

export type GeneratePackError = "invalid-json" | ParsePackJsonError | "provider-error";

/** Tolère un modèle qui entoure sa réponse de ```json ... ``` ou de texte malgré la consigne — ne garde que le premier objet `{...}` trouvé. */
function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return text;
  return text.slice(start, end + 1);
}

async function attemptOnce(
  provider: LlmProvider,
  prompt: string,
  opts: LlmGenerateOptions
): Promise<
  { name: string; exercises: Exercise[]; mascotIdea?: string } | { error: GeneratePackError }
> {
  let text: string;
  try {
    text = await provider.generate(prompt, opts);
  } catch {
    return { error: "provider-error" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonObject(text));
  } catch {
    return { error: "invalid-json" };
  }

  return parsePackJson(parsed);
}

/**
 * Génère un pack via un fournisseur LLM (§ 3.2/3.4 du plan) : construit le prompt, tente une
 * fois, et si la réponse n'est pas un JSON valide (ou pas la forme attendue), retente une fois
 * avec une consigne renforcée avant d'abandonner — jamais de boucle. Passe systématiquement par
 * `parsePackJson`, le même chemin de validation que l'import manuel (`dashboard:import-plan`).
 */
export async function generatePack(
  provider: LlmProvider,
  userRequest: string,
  opts: LlmGenerateOptions,
  mascotDescription?: string
): Promise<
  { name: string; exercises: Exercise[]; mascotIdea?: string } | { error: GeneratePackError }
> {
  const prompt = buildPackPrompt(userRequest, mascotDescription);
  const first = await attemptOnce(provider, prompt, opts);
  if (!("error" in first)) return first;
  if (first.error === "provider-error") return first; // pas la peine de retenter un fournisseur en échec (clé invalide, réseau down, etc.)

  const retryPrompt = `${prompt}\n\nYour previous reply was not valid JSON matching the required shape. Reply again with ONLY the JSON object, nothing else.`;
  return attemptOnce(provider, retryPrompt, opts);
}
