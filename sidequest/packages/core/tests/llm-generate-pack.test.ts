import { describe, it, expect, vi } from "vitest";
import { generatePack } from "../src/llm/generate-pack.js";
import type { LlmProvider } from "../src/llm/types.js";

const VALID_JSON = JSON.stringify({
  name: "Pack généré",
  exercises: [{ label: "Respire", durationSec: 20, category: "souffle" }],
});

function fakeProvider(generate: LlmProvider["generate"]): LlmProvider {
  return { id: "fake", generate };
}

describe("generatePack", () => {
  it("retourne le pack dès le premier essai si la réponse est un JSON valide", async () => {
    const provider = fakeProvider(async () => VALID_JSON);
    const result = await generatePack(provider, "un pack de respiration", {});
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.name).toBe("Pack généré");
  });

  it("tolère une réponse entourée d'un fence ```json", async () => {
    const provider = fakeProvider(async () => "```json\n" + VALID_JSON + "\n```");
    const result = await generatePack(provider, "un pack", {});
    expect("error" in result).toBe(false);
  });

  it("retente une fois si la première réponse n'est pas un JSON valide, puis réussit", async () => {
    let calls = 0;
    const provider = fakeProvider(async () => {
      calls += 1;
      return calls === 1 ? "ceci n'est pas du JSON" : VALID_JSON;
    });
    const result = await generatePack(provider, "un pack", {});
    expect(calls).toBe(2);
    expect("error" in result).toBe(false);
  });

  it("abandonne après un deuxième échec (pas de boucle infinie)", async () => {
    let calls = 0;
    const provider = fakeProvider(async () => {
      calls += 1;
      return "toujours invalide";
    });
    const result = await generatePack(provider, "un pack", {});
    expect(calls).toBe(2);
    expect(result).toEqual({ error: "invalid-json" });
  });

  it("ne retente pas sur une erreur du fournisseur (réseau, clé invalide, etc.)", async () => {
    let calls = 0;
    const provider = fakeProvider(async () => {
      calls += 1;
      throw new Error("missing-api-key");
    });
    const result = await generatePack(provider, "un pack", {});
    expect(calls).toBe(1);
    expect(result).toEqual({ error: "provider-error" });
  });

  it("propage l'erreur de parsePackJson (ex. trop d'exercices)", async () => {
    const tooMany = JSON.stringify({
      name: "Pack",
      exercises: Array.from({ length: 20 }, (_, i) => ({ label: `Ex ${i}` })),
    });
    const provider = fakeProvider(async () => tooMany);
    const result = await generatePack(provider, "un pack", {});
    expect(result).toEqual({ error: "too-many-exercises" });
  });
});
