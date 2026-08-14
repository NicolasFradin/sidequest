import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export interface Exercise {
  id: string;
  label: string;
  durationSec: number;
  category: string;
}

export interface Pack {
  id: string;
  name: string;
  exercises: Exercise[];
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Charge un pack d'exercices depuis son fichier JSON (données déclaratives uniquement,
 * jamais de code exécutable — ce qui permettra plus tard d'ouvrir la création de packs
 * à des créateurs tiers sans risque de sécurité).
 */
export function loadPack(packId: string): Pack {
  const filePath = path.join(__dirname, "exercises", `${packId}.json`);
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as Pack;
}

export function pickRandomExercise(pack: Pack): Exercise {
  const idx = Math.floor(Math.random() * pack.exercises.length);
  return pack.exercises[idx];
}
