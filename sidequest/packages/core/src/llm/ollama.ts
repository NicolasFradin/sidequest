import type { LlmProvider } from "./types.js";

const DEFAULT_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_MODEL = "llama3.1";
const DEFAULT_TIMEOUT_MS = 60_000; // les modèles locaux sont souvent plus lents qu'une API distante

/** Fournisseur 100% local, aucune clé — voir plan-llm-pack-generation.md § 1 (3 façons d'atteindre un LLM). */
export const ollamaProvider: LlmProvider = {
  id: "ollama",
  async generate(prompt, opts) {
    const baseUrl = opts.baseUrl || DEFAULT_BASE_URL;
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: opts.model || DEFAULT_MODEL,
        prompt,
        format: "json",
        stream: false,
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`ollama-http-${res.status}`);

    const data = (await res.json()) as { response?: string };
    if (typeof data.response !== "string") throw new Error("ollama-empty-response");
    return data.response;
  },
};

/** Alimente le sélecteur de modèle dans les réglages (§ 3.5 du plan) — probe rapide, timeout court. */
export async function listOllamaModels(baseUrl: string = DEFAULT_BASE_URL): Promise<string[]> {
  const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(5_000) });
  if (!res.ok) throw new Error(`ollama-http-${res.status}`);
  const data = (await res.json()) as { models?: { name: string }[] };
  return (data.models ?? []).map((m) => m.name);
}
