import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export interface Exercise {
  id: string;
  label: string;
  durationSec: number;
  category: string;
}

/** Provenance d'un pack : embarqué avec l'app, importé par l'utilisateur (fichier JSON), ou créé à la main dans le dashboard. */
export type PackSource = "bundled" | "imported" | "custom";

export interface PackStage {
  /** Niveau (XP) à partir duquel cette image de mascotte remplace la précédente. */
  minLevel: number;
  imagePath: string;
}

export interface PackMascot {
  id: string;
  label: string;
  /** Chemin fichier absolu vers l'image décodée sur disque — jamais de base64 stocké tel quel. */
  imagePath: string;
  /** Paliers de croissance optionnels (ex. packs SideCat/SideTama) — si absent, `imagePath` sert pour tous les niveaux. */
  stages?: PackStage[];
}

export interface Pack {
  id: string;
  name: string;
  exercises: Exercise[];
  source: PackSource;
  mascot?: PackMascot;
  /** Couleur d'accent du pack (hex), utilisée dans la galerie, la barre d'XP et l'overlay. */
  color?: string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXERCISES_DIR = path.join(__dirname, "exercises");

/**
 * Charge un pack d'exercices depuis son fichier JSON (données déclaratives uniquement,
 * jamais de code exécutable — ce qui permettra plus tard d'ouvrir la création de packs
 * à des créateurs tiers sans risque de sécurité).
 */
export function loadPack(packId: string): Pack {
  const filePath = path.join(EXERCISES_DIR, `${packId}.json`);
  const raw = readFileSync(filePath, "utf-8");
  return { ...(JSON.parse(raw) as Omit<Pack, "source">), source: "bundled" };
}

/**
 * Liste tous les packs embarqués avec l'app (un fichier JSON par pack dans `src/exercises/`).
 * Remplace le lookup fichier unique de `loadPack` pour permettre plusieurs packs embarqués
 * (SideGym + futurs packs communautaires mergés via PR) sans changement de code.
 */
export function listBundledPacks(): Pack[] {
  return readdirSync(EXERCISES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => loadPack(f.replace(/\.json$/, "")));
}

export function pickRandomExercise(pack: Pack): Exercise {
  const idx = Math.floor(Math.random() * pack.exercises.length);
  return pack.exercises[idx];
}
