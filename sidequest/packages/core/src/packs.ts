import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import path from "node:path";

export interface Exercise {
  id: string;
  label: string;
  durationSec: number;
  category: string;
  /** Traduction anglaise optionnelle (packs embarqués uniquement — voir `translatePack()`). `label`/`category` restent la référence en français. */
  labelEn?: string;
  categoryEn?: string;
}

/** Provenance d'un pack : embarqué avec l'app, importé par l'utilisateur (fichier JSON), créé à la main dans le dashboard, ou généré par un LLM (voir plan-llm-pack-generation.md). */
export type PackSource = "bundled" | "imported" | "custom" | "generated";

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
  /** Traduction anglaise optionnelle du nom (packs embarqués uniquement — voir `translatePack()`). */
  nameEn?: string;
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

/**
 * Résout un pack dans la langue de l'UI (`fr` | `en`) : le français des champs `name`/`label`/
 * `category` reste la référence (celle qui vient de l'exercice `sport-basic.json` etc.), l'anglais
 * est une traduction optionnelle (`nameEn`/`labelEn`/`categoryEn`) qui ne remplace que si présente
 * — même logique de repli que `t()` dans les dictionnaires i18n de l'app (défaut fr, override en).
 * Ne concerne que les packs embarqués : un pack importé/custom/généré n'a jamais ces champs `*En`
 * (contenu de l'utilisateur, dans la langue qu'il a choisie), donc cette fonction ne fait rien
 * dessus — sans risque de l'appeler partout, pas besoin de distinguer `source` à l'appel.
 */
export function translatePack(pack: Pack, language: "fr" | "en"): Pack {
  if (language !== "en") return pack;
  return {
    ...pack,
    name: pack.nameEn ?? pack.name,
    exercises: pack.exercises.map((e) => ({
      ...e,
      label: e.labelEn ?? e.label,
      category: e.categoryEn ?? e.category,
    })),
  };
}

/** Nombre max d'exercices accepté par `parsePackJson` — un pack reste une micro-pause, pas un programme complet. */
export const MAX_PACK_EXERCISES = 12;

export type ParsePackJsonError = "invalid-shape" | "empty" | "too-many-exercises";

/**
 * Sanitize un JSON de pack non fiable (import manuel comme génération LLM — voir
 * plan-llm-pack-generation.md § 3.1) vers `{ name, exercises }` : tolérant sur la forme de
 * chaque exercice (id manquant/invalide -> `randomUUID()`, durée manquante/invalide -> 30s),
 * mais rejette un JSON qui n'a pas la forme de base d'un pack. Un seul point de validation pour
 * `dashboard:import-plan` et `dashboard:generate-plan` — mêmes règles, mêmes bornes, dans les
 * deux cas des données non fiables (fichier édité à la main ou texte produit par un LLM).
 */
/** Longueur max retenue pour `mascotIdea` — une suggestion tient en une phrase, pas un roman. */
const MAX_MASCOT_IDEA_LENGTH = 300;

export function parsePackJson(
  data: unknown
): { name: string; exercises: Exercise[]; mascotIdea?: string } | { error: ParsePackJsonError } {
  if (typeof data !== "object" || data === null) return { error: "invalid-shape" };
  const obj = data as Record<string, unknown>;
  if (typeof obj.name !== "string" || !obj.name.trim() || !Array.isArray(obj.exercises)) {
    return { error: "invalid-shape" };
  }
  if (obj.exercises.length === 0) return { error: "empty" };
  if (obj.exercises.length > MAX_PACK_EXERCISES) return { error: "too-many-exercises" };

  const exercises = obj.exercises.map((raw) => {
    const e = raw as Record<string, unknown>;
    return {
      id: typeof e?.id === "string" && e.id ? e.id : randomUUID(),
      label: String(e?.label ?? ""),
      durationSec: Number(e?.durationSec) > 0 ? Number(e.durationSec) : 30,
      category: String(e?.category ?? ""),
    };
  });

  // Suggestion texte d'une mascotte (génération LLM uniquement, voir plan-llm-pack-generation.md)
  // — jamais une image, juste un concept que l'utilisateur peut suivre à la main dans l'éditeur.
  const mascotIdea =
    typeof obj.mascotIdea === "string" && obj.mascotIdea.trim()
      ? obj.mascotIdea.trim().slice(0, MAX_MASCOT_IDEA_LENGTH)
      : undefined;

  return { name: obj.name.trim(), exercises, ...(mascotIdea ? { mascotIdea } : {}) };
}
