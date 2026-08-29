import { describe, it, expect } from "vitest";
import {
  loadSide,
  pickRandomExercise,
  listBundledSides,
  parseSideJson,
  translateSide,
  MAX_SIDE_EXERCISES,
} from "../src/sides.js";

describe("sides", () => {
  it("charge le side sport-basic avec au moins 10 exercices", () => {
    const side = loadSide("sport-basic");
    expect(side.id).toBe("sport-basic");
    expect(side.exercises.length).toBeGreaterThanOrEqual(10);
  });

  it("tague un side chargé via loadSide comme 'bundled'", () => {
    expect(loadSide("sport-basic").source).toBe("bundled");
  });

  it("listBundledSides retourne tous les sides du dossier exercises, y compris sport-basic", () => {
    const sides = listBundledSides();
    expect(sides.length).toBeGreaterThanOrEqual(1);
    expect(sides.every((p) => p.source === "bundled")).toBe(true);
    expect(sides.map((p) => p.id)).toContain("sport-basic");
  });

  it("chaque exercice a les champs requis", () => {
    const side = loadSide("sport-basic");
    for (const exercise of side.exercises) {
      expect(exercise.id).toBeTruthy();
      expect(exercise.label).toBeTruthy();
      expect(exercise.durationSec).toBeGreaterThan(0);
      expect(exercise.category).toBeTruthy();
    }
  });

  it("pickRandomExercise retourne un exercice appartenant au side", () => {
    const side = loadSide("sport-basic");
    const exercise = pickRandomExercise(side);
    expect(side.exercises.map((e) => e.id)).toContain(exercise.id);
  });

  it("lève une erreur pour un side inconnu", () => {
    expect(() => loadSide("side-inexistant")).toThrow();
  });
});

describe("parseSideJson", () => {
  it("accepte un side valide et complète les champs manquants d'un exercice", () => {
    const result = parseSideJson({
      name: "Mon side",
      exercises: [{ label: "Squats", durationSec: 30, category: "jambes" }],
    });
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.name).toBe("Mon side");
    expect(result.exercises).toHaveLength(1);
    expect(result.exercises[0].id).toBeTruthy();
    expect(result.exercises[0].label).toBe("Squats");
  });

  it("retombe sur un id générés et une durée de 30s si absents/invalides", () => {
    const result = parseSideJson({
      name: "Side",
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
    expect(parseSideJson({ exercises: [{ label: "X" }] })).toEqual({ error: "invalid-shape" });
    expect(parseSideJson({ name: "   ", exercises: [{ label: "X" }] })).toEqual({ error: "invalid-shape" });
  });

  it("rejette des exercices absents ou non-tableau", () => {
    expect(parseSideJson({ name: "Side" })).toEqual({ error: "invalid-shape" });
    expect(parseSideJson({ name: "Side", exercises: "pas un tableau" })).toEqual({ error: "invalid-shape" });
  });

  it("rejette un tableau d'exercices vide", () => {
    expect(parseSideJson({ name: "Side", exercises: [] })).toEqual({ error: "empty" });
  });

  it("rejette un side avec plus de MAX_SIDE_EXERCISES exercices", () => {
    const exercises = Array.from({ length: MAX_SIDE_EXERCISES + 1 }, (_, i) => ({ label: `Ex ${i}` }));
    expect(parseSideJson({ name: "Side", exercises })).toEqual({ error: "too-many-exercises" });
  });

  it("récupère mascotIdea quand présent et le rogne à 300 caractères", () => {
    const result = parseSideJson({
      name: "Side",
      exercises: [{ label: "X" }],
      mascotIdea: "  Un petit robot orange et rond  ",
    });
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.mascotIdea).toBe("Un petit robot orange et rond");

    const long = parseSideJson({
      name: "Side",
      exercises: [{ label: "X" }],
      mascotIdea: "a".repeat(400),
    });
    expect("error" in long).toBe(false);
    if ("error" in long) return;
    expect(long.mascotIdea).toHaveLength(300);
  });

  it("omet mascotIdea quand absent, vide, ou pas une string", () => {
    const withoutField = parseSideJson({ name: "Side", exercises: [{ label: "X" }] });
    if ("error" in withoutField) throw new Error("unexpected error");
    expect(withoutField.mascotIdea).toBeUndefined();

    const blank = parseSideJson({ name: "Side", exercises: [{ label: "X" }], mascotIdea: "   " });
    if ("error" in blank) throw new Error("unexpected error");
    expect(blank.mascotIdea).toBeUndefined();

    const wrongType = parseSideJson({ name: "Side", exercises: [{ label: "X" }], mascotIdea: 42 });
    if ("error" in wrongType) throw new Error("unexpected error");
    expect(wrongType.mascotIdea).toBeUndefined();
  });

  it("rejette une valeur qui n'est pas un objet", () => {
    expect(parseSideJson(null)).toEqual({ error: "invalid-shape" });
    expect(parseSideJson("pas un objet")).toEqual({ error: "invalid-shape" });
    expect(parseSideJson(42)).toEqual({ error: "invalid-shape" });
  });
});

describe("translateSide", () => {
  it("retourne le side tel quel en français (référence)", () => {
    const side = loadSide("sport-basic");
    expect(translateSide(side, "fr")).toEqual(side);
  });

  it("traduit le nom et les exercices en anglais pour un side embarqué", () => {
    const side = loadSide("sport-basic");
    const translated = translateSide(side, "en");
    expect(translated.name).toBe("SideGym - Basic Program");
    // "10 pompes" -> "10 push-ups" : contrairement à "10 squats" (index 0), identique en fr/en,
    // celui-ci diffère réellement — vérifie qu'une vraie traduction a bien été appliquée.
    const pushups = translated.exercises.find((e) => e.id === "pushup-10");
    expect(pushups?.label).toBe("10 push-ups");
    expect(pushups?.category).toBe("arms");
    expect(translated.exercises.every((e) => e.label && e.category)).toBe(true);
  });

  it("ne modifie pas le nombre ni les id des exercices", () => {
    const side = loadSide("sport-basic");
    const translated = translateSide(side, "en");
    expect(translated.exercises.map((e) => e.id)).toEqual(side.exercises.map((e) => e.id));
  });

  it("ne fait rien sur un side sans traductions (custom/importé/généré)", () => {
    const side = {
      id: "custom-1",
      name: "Mon side perso",
      source: "custom" as const,
      exercises: [{ id: "x", label: "Fais un truc", durationSec: 20, category: "perso" }],
    };
    expect(translateSide(side, "en")).toEqual(side);
  });
});
