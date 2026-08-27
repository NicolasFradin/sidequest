import type { LlmProvider } from "./types.js";

const DEFAULT_MODEL = "claude-sonnet-5";
const DEFAULT_TIMEOUT_MS = 30_000;

/** Appel direct à l'API Messages d'Anthropic — pas de SDK, `fetch()` suffit (même logique que le choix de sauter zod, voir plan-marketplace-packs.md § 3.1). */
export const anthropicApiProvider: LlmProvider = {
  id: "anthropic-api",
  async generate(prompt, opts) {
    if (!opts.apiKey) throw new Error("missing-api-key");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": opts.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: opts.model || DEFAULT_MODEL,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`anthropic-http-${res.status}`);

    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = data.content?.find((block) => block.type === "text")?.text;
    if (typeof text !== "string") throw new Error("anthropic-empty-response");
    return text;
  },
};
