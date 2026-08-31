import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Storage } from "../src/storage.js";

describe("Storage", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = new Storage(":memory:");
  });

  afterEach(() => {
    storage.close();
  });

  it("hasBeenConfigured est false tant qu'aucun réglage n'a été écrit, true après", () => {
    expect(storage.hasBeenConfigured()).toBe(false);
    storage.updateSettings({ intervalMinutes: 45 });
    expect(storage.hasBeenConfigured()).toBe(true);
  });

  it("retourne les réglages par défaut si rien n'est configuré", () => {
    const settings = storage.getSettings();
    expect(settings.intervalMinutes).toBe(30);
    expect(settings.mode).toBe("notify");
    expect(settings.activeMascot).toBe("sidequest");
    expect(settings.theme).toBe("dark");
    expect(settings.triggerSource).toBe("both");
    expect(settings.hookEveryN).toBe(1);
    expect(settings.language).toBe("fr");
  });

  it("met à jour la langue", () => {
    storage.updateSettings({ language: "en" });
    expect(storage.getSettings().language).toBe("en");
  });

  it("met à jour le thème", () => {
    storage.updateSettings({ theme: "light" });
    expect(storage.getSettings().theme).toBe("light");
  });

  it("met à jour la source de déclenchement", () => {
    storage.updateSettings({ triggerSource: "hook" });
    expect(storage.getSettings().triggerSource).toBe("hook");
  });

  it("met à jour hookEveryN", () => {
    storage.updateSettings({ hookEveryN: 3 });
    expect(storage.getSettings().hookEveryN).toBe(3);
  });

  it("ne laisse jamais hookEveryN descendre en dessous de 1", () => {
    storage.updateSettings({ hookEveryN: 0 });
    expect(storage.getSettings().hookEveryN).toBe(1);
  });

  it("met à jour partiellement les réglages sans écraser le reste", () => {
    storage.updateSettings({ intervalMinutes: 45, mode: "gate" });
    const settings = storage.getSettings();
    expect(settings.intervalMinutes).toBe(45);
    expect(settings.mode).toBe("gate");
    expect(settings.activeMascot).toBe("sidequest"); // inchangé
  });

  it("enregistre et relit une session", () => {
    storage.recordSession({
      timestamp: new Date().toISOString(),
      exerciseId: "squat-10",
      status: "done",
      triggerType: "timer",
      verified: false,
      mascot: "ronnie-80s",
      mode: "notify",
    });

    const sessions = storage.getSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].exerciseId).toBe("squat-10");
    expect(sessions[0].status).toBe("done");
    expect(sessions[0].verified).toBe(false);
    expect(sessions[0].mascot).toBe("ronnie-80s");
  });

  it("calcule un streak de 1 pour une session faite aujourd'hui", () => {
    storage.recordSession({
      timestamp: new Date().toISOString(),
      exerciseId: "squat-10",
      status: "done",
      triggerType: "timer",
      verified: false,
      mascot: "ronnie-80s",
      mode: "notify",
    });

    expect(storage.getCurrentStreak()).toBe(1);
  });

  it("retourne un streak de 0 sans session", () => {
    expect(storage.getCurrentStreak()).toBe(0);
  });

  it("retourne une dette de 0 sans session", () => {
    expect(storage.getDebt()).toBe(0);
  });

  it("chaque séance 'skipped' augmente la dette de 1", () => {
    storage.recordSession({
      timestamp: new Date().toISOString(),
      exerciseId: "squat-10",
      status: "skipped",
      triggerType: "timer",
      verified: false,
      mascot: "ronnie-80s",
      mode: "notify",
    });
    storage.recordSession({
      timestamp: new Date().toISOString(),
      exerciseId: "squat-10",
      status: "skipped",
      triggerType: "timer",
      verified: false,
      mascot: "ronnie-80s",
      mode: "notify",
    });

    expect(storage.getDebt()).toBe(2);
  });

  it("chaque séance 'done' rembourse la dette d'1, sans jamais devenir négative", () => {
    const record = (status: "done" | "skipped") =>
      storage.recordSession({
        timestamp: new Date().toISOString(),
        exerciseId: "squat-10",
        status,
        triggerType: "timer",
        verified: false,
        mascot: "ronnie-80s",
        mode: "notify",
      });

    record("skipped");
    record("skipped");
    expect(storage.getDebt()).toBe(2);

    record("done");
    expect(storage.getDebt()).toBe(1);

    record("done");
    record("done");
    expect(storage.getDebt()).toBe(0);
  });

  it("un gros historique de séances 'done' passées n'efface pas un skip qui arrive après", () => {
    const record = (status: "done" | "skipped", offsetMs: number) =>
      storage.recordSession({
        timestamp: new Date(Date.now() + offsetMs).toISOString(),
        exerciseId: "squat-10",
        status,
        triggerType: "timer",
        verified: false,
        mascot: "ronnie-80s",
        mode: "notify",
      });

    for (let i = 0; i < 20; i++) record("done", i);
    expect(storage.getDebt()).toBe(0);

    record("skipped", 100);
    expect(storage.getDebt()).toBe(1);
  });

  it("ne compte pas les sessions 'skipped' dans le streak", () => {
    storage.recordSession({
      timestamp: new Date().toISOString(),
      exerciseId: "squat-10",
      status: "skipped",
      triggerType: "timer",
      verified: false,
      mascot: "ronnie-80s",
      mode: "notify",
    });

    expect(storage.getCurrentStreak()).toBe(0);
  });
});

describe("Storage — sides custom", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = new Storage(":memory:");
  });

  afterEach(() => {
    storage.close();
  });

  const exercises = [{ id: "burpee-10", label: "10 burpees", durationSec: 30, category: "cardio" }];

  it("retourne une liste vide sans side créé", () => {
    expect(storage.getSides()).toEqual([]);
  });

  it("crée un side et le relit", () => {
    const created = storage.createSide("Mon side", exercises);
    expect(created.id).toBeTruthy();
    expect(created.name).toBe("Mon side");
    expect(created.exercises).toEqual(exercises);
    expect(created.source).toBe("custom");
    expect(created.mascot).toBeUndefined();

    expect(storage.getSide(created.id)).toEqual(created);
    expect(storage.getSides()).toEqual([created]);
  });

  it("crée un side avec une source, une mascotte et une couleur explicites", () => {
    const mascot = { id: "custom:foo", label: "Foo", imagePath: "/tmp/foo.png" };
    const created = storage.createSide("Side importé", exercises, {
      source: "imported",
      mascot,
      color: "#3ecfd6",
    });

    expect(created.source).toBe("imported");
    expect(created.mascot).toEqual(mascot);
    expect(created.color).toBe("#3ecfd6");
    expect(storage.getSide(created.id)).toEqual(created);
  });

  it("retourne undefined pour un side inconnu", () => {
    expect(storage.getSide("inexistant")).toBeUndefined();
  });

  it("met à jour le nom et les exercices d'un side sans écraser le reste", () => {
    const created = storage.createSide("Mon side", exercises);
    const updated = storage.updateSide(created.id, { name: "Side renommé" });
    expect(updated.name).toBe("Side renommé");
    expect(updated.exercises).toEqual(exercises);

    const newExercises = [{ id: "squat-20", label: "20 squats", durationSec: 40, category: "jambes" }];
    const updated2 = storage.updateSide(created.id, { exercises: newExercises });
    expect(updated2.name).toBe("Side renommé");
    expect(updated2.exercises).toEqual(newExercises);
  });

  it("assigne une mascotte à un side, relue correctement", () => {
    const created = storage.createSide("Mon side", exercises);
    const mascot = { id: "custom:abc", label: "Ma mascotte", imagePath: "/tmp/abc.png" };
    const updated = storage.updateSide(created.id, { mascot });
    expect(updated.mascot).toEqual(mascot);
    expect(storage.getSide(created.id)?.mascot).toEqual(mascot);
  });

  it("mascot: null efface la mascotte du side", () => {
    const created = storage.createSide("Mon side", exercises, {
      mascot: { id: "custom:abc", label: "Ma mascotte", imagePath: "/tmp/abc.png" },
    });
    const updated = storage.updateSide(created.id, { mascot: null });
    expect(updated.mascot).toBeUndefined();
    expect(storage.getSide(created.id)?.mascot).toBeUndefined();
  });

  it("ne pas passer 'mascot' dans le partial laisse la mascotte existante inchangée", () => {
    const mascot = { id: "custom:abc", label: "Ma mascotte", imagePath: "/tmp/abc.png" };
    const created = storage.createSide("Mon side", exercises, { mascot });
    const updated = storage.updateSide(created.id, { name: "Renommé" });
    expect(updated.mascot).toEqual(mascot);
  });

  it("lève une erreur en mettant à jour un side inconnu", () => {
    expect(() => storage.updateSide("inexistant", { name: "x" })).toThrow();
  });

  it("supprime un side", () => {
    const created = storage.createSide("Mon side", exercises);
    storage.deleteSide(created.id);
    expect(storage.getSide(created.id)).toBeUndefined();
    expect(storage.getSides()).toEqual([]);
  });

  it("supprimer le side actif remet activeProgram au side par défaut", () => {
    const created = storage.createSide("Mon side", exercises);
    storage.updateSettings({ activeProgram: created.id });
    expect(storage.getSettings().activeProgram).toBe(created.id);

    storage.deleteSide(created.id);
    expect(storage.getSettings().activeProgram).toBe("sport-basic");
  });

  it("supprimer un side non actif ne touche pas activeProgram", () => {
    const created = storage.createSide("Mon side", exercises);
    storage.updateSettings({ activeProgram: "sport-basic" });

    storage.deleteSide(created.id);
    expect(storage.getSettings().activeProgram).toBe("sport-basic");
  });
});

describe("Storage — progression XP des sides", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = new Storage(":memory:");
  });

  afterEach(() => {
    storage.close();
  });

  it("retourne 0 xp / niveau 1 pour un side sans progression", () => {
    expect(storage.getSideProgress("sport-basic")).toEqual({ xp: 0, level: 1 });
  });

  it("addXp cumule l'xp et recalcule le niveau (palier tous les 100 xp)", () => {
    expect(storage.addXp("sport-basic", 40)).toEqual({ xp: 40, level: 1 });
    expect(storage.addXp("sport-basic", 40)).toEqual({ xp: 80, level: 1 });
    expect(storage.addXp("sport-basic", 40)).toEqual({ xp: 120, level: 2 });
    expect(storage.getSideProgress("sport-basic")).toEqual({ xp: 120, level: 2 });
  });

  it("suit la progression de chaque side indépendamment", () => {
    storage.addXp("sport-basic", 50);
    storage.addXp("sidecat", 10);
    expect(storage.getSideProgress("sport-basic")).toEqual({ xp: 50, level: 1 });
    expect(storage.getSideProgress("sidecat")).toEqual({ xp: 10, level: 1 });
  });

  it("supprimer un side efface sa progression", () => {
    const exercises = [{ id: "burpee-10", label: "10 burpees", durationSec: 30, category: "cardio" }];
    const created = storage.createSide("Mon side", exercises);
    storage.addXp(created.id, 50);
    expect(storage.getSideProgress(created.id)).toEqual({ xp: 50, level: 1 });

    storage.deleteSide(created.id);
    expect(storage.getSideProgress(created.id)).toEqual({ xp: 0, level: 1 });
  });
});
