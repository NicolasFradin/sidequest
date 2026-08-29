export type { LlmProvider, LlmGenerateOptions } from "./types.js";
export { buildSidePrompt } from "./prompt.js";
export { generateSide, type GenerateSideError } from "./generate-side.js";
export { anthropicApiProvider } from "./anthropic-api.js";
export { openaiApiProvider } from "./openai-api.js";
export { ollamaProvider, listOllamaModels } from "./ollama.js";
export { claudeCliProvider, isClaudeCliAvailable } from "./claude-cli.js";
export { codexCliProvider, isCodexCliAvailable } from "./codex-cli.js";

import type { LlmProvider as LlmProviderType } from "./types.js";
import { anthropicApiProvider } from "./anthropic-api.js";
import { openaiApiProvider } from "./openai-api.js";
import { ollamaProvider } from "./ollama.js";
import { claudeCliProvider } from "./claude-cli.js";
import { codexCliProvider } from "./codex-cli.js";

const PROVIDERS: Record<string, LlmProviderType> = {
  "anthropic-api": anthropicApiProvider,
  "openai-api": openaiApiProvider,
  "claude-cli": claudeCliProvider,
  "codex-cli": codexCliProvider,
  ollama: ollamaProvider,
};

/** Résout un id de `Settings.llmProvider` vers son implémentation — `null` pour `"none"` ou un id inconnu. */
export function resolveProvider(id: string): LlmProviderType | null {
  return PROVIDERS[id] ?? null;
}
