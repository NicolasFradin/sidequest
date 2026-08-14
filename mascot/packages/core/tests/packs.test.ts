import { describe, it, expect } from "vitest";
import { loadPack, pickRandomExercise } from "../src/packs.js";

describe("packs", () => {
  it("charge le pack sport-basic avec au moins 10 exercices", () => {
    const pack = loadPack("sport-basic");
    expect(pack.id).toBe("sport-basic");
    expect(pack.exercises.length).toBeGreaterThanOrEqual(10);
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
