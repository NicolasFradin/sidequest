import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Scheduler } from "../src/scheduler.js";

describe("Scheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("déclenche onTrigger après l'intervalle configuré", () => {
    const onTrigger = vi.fn();
    const scheduler = new Scheduler({ intervalMinutes: 5, onTrigger });

    scheduler.start();
    expect(onTrigger).not.toHaveBeenCalled();

    vi.advanceTimersByTime(5 * 60 * 1000);
    expect(onTrigger).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(5 * 60 * 1000);
    expect(onTrigger).toHaveBeenCalledTimes(2);

    scheduler.stop();
  });

  it("ne déclenche rien si stop() est appelé avant l'intervalle", () => {
    const onTrigger = vi.fn();
    const scheduler = new Scheduler({ intervalMinutes: 10, onTrigger });

    scheduler.start();
    vi.advanceTimersByTime(5 * 60 * 1000);
    scheduler.stop();
    vi.advanceTimersByTime(10 * 60 * 1000);

    expect(onTrigger).not.toHaveBeenCalled();
  });

  it("updateInterval() applique le nouvel intervalle", () => {
    const onTrigger = vi.fn();
    const scheduler = new Scheduler({ intervalMinutes: 10, onTrigger });

    scheduler.start();
    scheduler.updateInterval(2);

    vi.advanceTimersByTime(2 * 60 * 1000);
    expect(onTrigger).toHaveBeenCalledTimes(1);

    scheduler.stop();
  });

  it("triggerNow() déclenche immédiatement sans attendre le timer", () => {
    const onTrigger = vi.fn();
    const scheduler = new Scheduler({ intervalMinutes: 30, onTrigger });

    scheduler.triggerNow();
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it("rejette un intervalle <= 0", () => {
    expect(
      () => new Scheduler({ intervalMinutes: 0, onTrigger: () => {} })
    ).toThrow();
  });

  it("isRunning() reflète l'état start/stop", () => {
    const scheduler = new Scheduler({ intervalMinutes: 5, onTrigger: () => {} });
    expect(scheduler.isRunning()).toBe(false);
    scheduler.start();
    expect(scheduler.isRunning()).toBe(true);
    scheduler.stop();
    expect(scheduler.isRunning()).toBe(false);
  });
});
