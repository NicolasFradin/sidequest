import { describe, it, expect } from "vitest";
import { loadPack, pickRandomExercise, listBundledPacks, parsePackJson, MAX_PACK_EXERCISES } from "../src/packs.js";

describe("packs", () => {
  it("charge le pack sport-basic avec au moins 10 exercices", () => {
    const pack = loadPack("sport-basic");
    expect(pack.id).toBe("sport-basic");
    expect(pack.exercises.length).toBeGreaterThanOrEqual(10);
  });

  it("tague un pack chargé via loadPack comme 'bundled'", () => {
    expect(loadPack("sport-basic").source).toBe("bundled");
  });

  it("listBundledPacks retourne tous les packs du dossier exercises, y compris sport-basic", () => {
    const packs = listBundledPacks();
    expect(packs.length).toBeGreaterThanOrEqual(1);
    expect(packs.every((p) => p.source === "bundled")).toBe(true);
    expect(packs.map((p) => p.id)).toContain("sport-basic");
  });

  it("chaque exercice a les champs requis", () => {
    const pack = loadPack("sport-basic");
    for (const exercise of pack.exercises) {
      expect(exercise.id).toBeTruthy();
      expect(exercise.label).toBeTruthy();
      expect(exercise.durationSec).toBeGreaterThan(0);
      expect(exercise.category).toBeTruthy();
    }
  });

  it("pickRandomExercise retourne un exercice appartenant au pack", () => {
    const pack = loadPack("sport-basic");
    const exercise = pickRandomExercise(pack);
    expect(pack.exercises.map((e) => e.id)).toContain(exercise.id);
  });

  it("lève une erreur pour un pack inconnu", () => {
    expect(() => loadPack("pack-inexistant")).toThrow();
  });
});

describe("parsePackJson", () => {
  it("accepte un pack valide et complète les champs manquants d'un exercice", () => {
    const result = parsePackJson({
      name: "Mon pack",
      exercises: [{ label: "Squats", durationSec: 30, category: "jambes" }],
    });
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.name).toBe("Mon pack");
    expect(result.exercises).toHaveLength(1);
    expect(result.exercises[0].id).toBeTruthy();
    expect(result.exercises[0].label).toBe("Squats");
  });

  it("retombe sur un id générés et une durée de 30s si absents/invalides", () => {
    const result = parsePackJson({
      name: "Pack",
      exercises: [{ label: "X" }, { id: "", label: "Y", durationSec: -5 }],
    });
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.exercises[0].id).toBeTruthy();
    expect(result.exercises[0].durationSec).toBe(30);
    expect(result.exercises[1].id).toBeTruthy();
    expect(result.exercises[1].durationSec).toBe(30);
  });

  it("rejette un nom manquant ou vide", () => {
    expect(parsePackJson({ exercises: [{ label: "X" }] })).toEqual({ error: "invalid-shape" });
    expect(parsePackJson({ name: "   ", exercises: [{ label: "X" }] })).toEqual({ error: "invalid-shape" });
  });

  it("rejette des exercices absents ou non-tableau", () => {
    expect(parsePackJson({ name: "Pack" })).toEqual({ error: "invalid-shape" });
    expect(parsePackJson({ name: "Pack", exercises: "pas un tableau" })).toEqual({ error: "invalid-shape" });
  });

  it("rejette un tableau d'exercices vide", () => {
    expect(parsePackJson({ name: "Pack", exercises: [] })).toEqual({ error: "empty" });
  });

  it("rejette un pack avec plus de MAX_PACK_EXERCISES exercices", () => {
    const exercises = Array.from({ length: MAX_PACK_EXERCISES + 1 }, (_, i) => ({ label: `Ex ${i}` }));
    expect(parsePackJson({ name: "Pack", exercises })).toEqual({ error: "too-many-exercises" });
  });

  it("rejette une valeur qui n'est pas un objet", () => {
    expect(parsePackJson(null)).toEqual({ error: "invalid-shape" });
    expect(parsePackJson("pas un objet")).toEqual({ error: "invalid-shape" });
    expect(parsePackJson(42)).toEqual({ error: "invalid-shape" });
  });
});
