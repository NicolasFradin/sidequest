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
    expect(settings.activeMascot).toBe("ronnie-coleman");
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
    expect(settings.activeMascot).toBe("ronnie-coleman"); // inchangé
  });

  it("enregistre et relit une session", () => {
    storage.recordSession({
      timestamp: new Date().toISOString(),
      exerciseId: "squat-10",
      status: "done",
      triggerType: "timer",
      verified: false,
      mascot: "ronnie-coleman",
      mode: "notify",
    });

    const sessions = storage.getSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].exerciseId).toBe("squat-10");
    expect(sessions[0].status).toBe("done");
    expect(sessions[0].verified).toBe(false);
    expect(sessions[0].mascot).toBe("ronnie-coleman");
  });

  it("calcule un streak de 1 pour une session faite aujourd'hui", () => {
    storage.recordSession({
      timestamp: new Date().toISOString(),
      exerciseId: "squat-10",
      status: "done",
      triggerType: "timer",
      verified: false,
      mascot: "ronnie-coleman",
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
      mascot: "ronnie-coleman",
      mode: "notify",
    });
    storage.recordSession({
      timestamp: new Date().toISOString(),
      exerciseId: "squat-10",
      status: "skipped",
      triggerType: "timer",
      verified: false,
      mascot: "ronnie-coleman",
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
        mascot: "ronnie-coleman",
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
        mascot: "ronnie-coleman",
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
      mascot: "ronnie-coleman",
      mode: "notify",
    });

    expect(storage.getCurrentStreak()).toBe(0);
  });
});

describe("Storage — plans custom", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = new Storage(":memory:");
  });

  afterEach(() => {
    storage.close();
  });

  const exercises = [{ id: "burpee-10", label: "10 burpees", durationSec: 30, category: "cardio" }];

  it("retourne une liste vide sans plan créé", () => {
    expect(storage.getPlans()).toEqual([]);
  });

  it("crée un plan et le relit", () => {
    const created = storage.createPlan("Mon plan", exercises);
    expect(created.id).toBeTruthy();
    expect(created.name).toBe("Mon plan");
    expect(created.exercises).toEqual(exercises);

    expect(storage.getPlan(created.id)).toEqual(created);
    expect(storage.getPlans()).toEqual([created]);
  });

  it("retourne undefined pour un plan inconnu", () => {
    expect(storage.getPlan("inexistant")).toBeUndefined();
  });

  it("met à jour le nom et les exercices d'un plan sans écraser le reste", () => {
    const created = storage.createPlan("Mon plan", exercises);
    const updated = storage.updatePlan(created.id, { name: "Plan renommé" });
    expect(updated.name).toBe("Plan renommé");
    expect(updated.exercises).toEqual(exercises);

    const newExercises = [{ id: "squat-20", label: "20 squats", durationSec: 40, category: "jambes" }];
    const updated2 = storage.updatePlan(created.id, { exercises: newExercises });
    expect(updated2.name).toBe("Plan renommé");
    expect(updated2.exercises).toEqual(newExercises);
  });

  it("lève une erreur en mettant à jour un plan inconnu", () => {
    expect(() => storage.updatePlan("inexistant", { name: "x" })).toThrow();
  });

  it("supprime un plan", () => {
    const created = storage.createPlan("Mon plan", exercises);
    storage.deletePlan(created.id);
    expect(storage.getPlan(created.id)).toBeUndefined();
    expect(storage.getPlans()).toEqual([]);
  });

  it("supprimer le plan actif remet activeProgram au plan par défaut", () => {
    const created = storage.createPlan("Mon plan", exercises);
    storage.updateSettings({ activeProgram: created.id });
    expect(storage.getSettings().activeProgram).toBe(created.id);

    storage.deletePlan(created.id);
    expect(storage.getSettings().activeProgram).toBe("sport-basic");
  });

  it("supprimer un plan non actif ne touche pas activeProgram", () => {
    const created = storage.createPlan("Mon plan", exercises);
    storage.updateSettings({ activeProgram: "sport-basic" });

    storage.deletePlan(created.id);
    expect(storage.getSettings().activeProgram).toBe("sport-basic");
  });
});
