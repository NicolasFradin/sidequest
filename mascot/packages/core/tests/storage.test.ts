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
  });

  it("met à jour le thème", () => {
    storage.updateSettings({ theme: "light" });
    expect(storage.getSettings().theme).toBe("light");
  });

  it("met à jour la source de déclenchement", () => {
    storage.updateSettings({ triggerSource: "hook" });
    expect(storage.getSettings().triggerSource).toBe("hook");
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
