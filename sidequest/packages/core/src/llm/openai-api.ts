import type { LlmProvider } from "./types.js";

const DEFAULT_MODEL = "gpt-4.1";
const DEFAULT_TIMEOUT_MS = 30_000;

/** Appel direct à l'API Chat Completions d'OpenAI — pas de SDK, même logique que anthropic-api.ts. */
export const openaiApiProvider: LlmProvider = {
  id: "openai-api",
  async generate(prompt, opts) {
    if (!opts.apiKey) throw new Error("missing-api-key");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify({
        model: opts.model || DEFAULT_MODEL,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`openai-http-${res.status}`);

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content;
    if (typeof text !== "string") throw new Error("openai-empty-response");
    return text;
  },
};
