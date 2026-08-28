import { Scheduler } from "../src/scheduler.js";
import { Storage } from "../src/storage.js";
import { loadSide, pickRandomExercise } from "../src/sides.js";

const storage = new Storage(":memory:");
const side = loadSide("sport-basic");

console.log("Démo mascot-core — un exercice toutes les 3 secondes (Ctrl+C pour arrêter)\n");

const scheduler = new Scheduler({
  intervalMinutes: 3 / 60, // 3 secondes — pour la démo uniquement, en vrai ce sera 15-60 min
  onTrigger: () => {
    const exercise = pickRandomExercise(side);
    storage.recordSession({
      timestamp: new Date().toISOString(),
      exerciseId: exercise.id,
      status: "done",
      triggerType: "timer",
      verified: false,
    });
    console.log(
      `🏋️  Exercice proposé : ${exercise.label} (${exercise.durationSec}s) — streak: ${storage.getCurrentStreak()} jour(s), total séances: ${storage.getSessions().length}`
    );
  },
});

scheduler.start();

process.on("SIGINT", () => {
  scheduler.stop();
  storage.close();
  console.log("\nDémo arrêtée proprement.");
  process.exit(0);
});
