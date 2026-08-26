export type SchedulerOptions = {
  /** Intervalle entre deux déclenchements, en minutes (peut être décimal, ex: 0.5 = 30s) */
  intervalMinutes: number;
  /** Callback appelé à chaque déclenchement */
  onTrigger: () => void;
};

/**
 * Scheduler simple : déclenche onTrigger() à intervalle régulier.
 * Ne connaît rien de l'UI, d'Electron ou du stockage — logique pure, testable.
 */
export class Scheduler {
  private intervalMs: number;
  private readonly onTrigger: () => void;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(options: SchedulerOptions) {
    this.intervalMs = Scheduler.minutesToMs(options.intervalMinutes);
    this.onTrigger = options.onTrigger;
  }

  static minutesToMs(minutes: number): number {
    if (minutes <= 0) {
      throw new Error("intervalMinutes doit être > 0");
    }
    return minutes * 60 * 1000;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.timer = setInterval(() => {
      this.onTrigger();
    }, this.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  /** Change l'intervalle à chaud (redémarre le timer sous-jacent si actif) */
  updateInterval(minutes: number): void {
    this.intervalMs = Scheduler.minutesToMs(minutes);
    if (this.running) {
      this.stop();
      this.start();
    }
  }

  /** Force un déclenchement immédiat, sans attendre le timer (utile pour un bouton "tester") */
  triggerNow(): void {
    this.onTrigger();
  }
}
