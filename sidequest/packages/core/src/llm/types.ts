/**
 * Options passées à `LlmProvider.generate()` — jamais persistées telles quelles (voir
 * packages/app/src/main/llm-credentials.js pour `apiKey`, jamais stocké en SQLite).
 */
export interface LlmGenerateOptions {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
}

/**
 * Un fournisseur LLM. `generate()` retourne du texte brut (la meilleure tentative de JSON du
 * modèle), jamais un `Pack` déjà validé — le parsing/sanitizing est le travail de
 * `parsePackJson` (packages/core/src/packs.ts), un seul chemin de validation pour tous les
 * fournisseurs et pour l'import manuel. Lève une erreur (message court, stable, jamais affiché
 * tel quel — l'app le traduit) plutôt que de retourner une valeur d'échec.
 */
export interface LlmProvider {
  id: string;
  generate(prompt: string, opts: LlmGenerateOptions): Promise<string>;
}
