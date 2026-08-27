import { describe, it, expect, vi, afterEach } from "vitest";
import { anthropicApiProvider } from "../src/llm/anthropic-api.js";
import { openaiApiProvider } from "../src/llm/openai-api.js";
import { ollamaProvider, listOllamaModels } from "../src/llm/ollama.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("anthropicApiProvider", () => {
  it("lève une erreur si aucune clé API n'est fournie", async () => {
    await expect(anthropicApiProvider.generate("prompt", {})).rejects.toThrow("missing-api-key");
  });

  it("envoie la requête attendue et extrait le texte de la réponse", async () => {
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe("https://api.anthropic.com/v1/messages");
      expect((init.headers as Record<string, string>)["x-api-key"]).toBe("sk-test");
      const body = JSON.parse(init.body as string);
      expect(body.messages).toEqual([{ role: "user", content: "prompt" }]);
      return new Response(JSON.stringify({ content: [{ type: "text", text: '{"ok":true}' }] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const text = await anthropicApiProvider.generate("prompt", { apiKey: "sk-test" });
    expect(text).toBe('{"ok":true}');
  });

  it("lève une erreur sur une réponse HTTP non-ok", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 401 })));
    await expect(anthropicApiProvider.generate("prompt", { apiKey: "sk-bad" })).rejects.toThrow("anthropic-http-401");
  });
});

describe("openaiApiProvider", () => {
  it("lève une erreur si aucune clé API n'est fournie", async () => {
    await expect(openaiApiProvider.generate("prompt", {})).rejects.toThrow("missing-api-key");
  });

  it("envoie la requête attendue et extrait le texte de la réponse", async () => {
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe("https://api.openai.com/v1/chat/completions");
      expect((init.headers as Record<string, string>).authorization).toBe("Bearer sk-test");
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const text = await openaiApiProvider.generate("prompt", { apiKey: "sk-test" });
    expect(text).toBe('{"ok":true}');
  });
});

describe("ollamaProvider", () => {
  it("appelle /api/generate avec format json et extrait la réponse", async () => {
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe("http://127.0.0.1:11434/api/generate");
      const body = JSON.parse(init.body as string);
      expect(body.format).toBe("json");
      expect(body.stream).toBe(false);
      return new Response(JSON.stringify({ response: '{"ok":true}' }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const text = await ollamaProvider.generate("prompt", {});
    expect(text).toBe('{"ok":true}');
  });

  it("utilise le baseUrl fourni plutôt que le défaut", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toBe("http://192.168.1.50:11434/api/generate");
      return new Response(JSON.stringify({ response: "{}" }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await ollamaProvider.generate("prompt", { baseUrl: "http://192.168.1.50:11434" });
  });

  it("lève une erreur sur une réponse HTTP non-ok", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));
    await expect(ollamaProvider.generate("prompt", {})).rejects.toThrow("ollama-http-500");
  });
});

describe("listOllamaModels", () => {
  it("retourne la liste des noms de modèles depuis /api/tags", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toBe("http://127.0.0.1:11434/api/tags");
      return new Response(JSON.stringify({ models: [{ name: "llama3.1" }, { name: "mistral" }] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    expect(await listOllamaModels()).toEqual(["llama3.1", "mistral"]);
  });
});
