import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import path from "node:path";

export interface Exercise {
  id: string;
  label: string;
  durationSec: number;
  category: string;
  /** Traduction anglaise optionnelle (sides embarqués uniquement — voir `translateSide()`). `label`/`category` restent la référence en français. */
  labelEn?: string;
  categoryEn?: string;
}

/** Provenance d'un side : embarqué avec l'app, importé par l'utilisateur (fichier JSON), créé à la main dans le dashboard, ou généré par un LLM (voir plan-llm-side-generation.md). */
export type SideSource = "bundled" | "imported" | "custom" | "generated";

export interface SideStage {
  /** Niveau (XP) à partir duquel cette image de mascotte remplace la précédente. */
  minLevel: number;
  imagePath: string;
}

export interface SideMascot {
  id: string;
  label: string;
  /** Chemin fichier absolu vers l'image décodée sur disque — jamais de base64 stocké tel quel. */
  imagePath: string;
  /** Paliers de croissance optionnels (ex. sides SideCat/SideTama) — si absent, `imagePath` sert pour tous les niveaux. */
  stages?: SideStage[];
}

export interface Side {
  id: string;
  name: string;
  /** Traduction anglaise optionnelle du nom (sides embarqués uniquement — voir `translateSide()`). */
  nameEn?: string;
  exercises: Exercise[];
  source: SideSource;
  mascot?: SideMascot;
  /** Couleur d'accent du side (hex), utilisée dans la galerie, la barre d'XP et l'overlay. */
  color?: string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXERCISES_DIR = path.join(__dirname, "exercises");

/**
 * Charge un side de quêtes depuis son fichier JSON (données déclaratives uniquement,
 * jamais de code exécutable — ce qui permettra plus tard d'ouvrir la création de sides
 * à des créateurs tiers sans risque de sécurité).
 */
export function loadSide(sideId: string): Side {
  const filePath = path.join(EXERCISES_DIR, `${sideId}.json`);
  const raw = readFileSync(filePath, "utf-8");
  return { ...(JSON.parse(raw) as Omit<Side, "source">), source: "bundled" };
}

/**
 * Liste tous les sides embarqués avec l'app (un fichier JSON par side dans `src/exercises/`).
 * Remplace le lookup fichier unique de `loadSide` pour permettre plusieurs sides embarqués
 * (SideGym + futurs sides communautaires mergés via PR) sans changement de code.
 */
export function listBundledSides(): Side[] {
  return readdirSync(EXERCISES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => loadSide(f.replace(/\.json$/, "")));
}

export function pickRandomExercise(side: Side): Exercise {
  const idx = Math.floor(Math.random() * side.exercises.length);
  return side.exercises[idx];
}

/**
 * Résout un side dans la langue de l'UI (`fr` | `en`) : le français des champs `name`/`label`/
 * `category` reste la référence (celle qui vient de la quête `sport-basic.json` etc.), l'anglais
 * est une traduction optionnelle (`nameEn`/`labelEn`/`categoryEn`) qui ne remplace que si présente
 * — même logique de repli que `t()` dans les dictionnaires i18n de l'app (défaut fr, override en).
 * Ne concerne que les sides embarqués : un side importé/custom/généré n'a jamais ces champs `*En`
 * (contenu de l'utilisateur, dans la langue qu'il a choisie), donc cette fonction ne fait rien
 * dessus — sans risque de l'appeler partout, pas besoin de distinguer `source` à l'appel.
 */
export function translateSide(side: Side, language: "fr" | "en"): Side {
  if (language !== "en") return side;
  return {
    ...side,
    name: side.nameEn ?? side.name,
    exercises: side.exercises.map((e) => ({
      ...e,
      label: e.labelEn ?? e.label,
      category: e.categoryEn ?? e.category,
    })),
  };
}

/** Nombre max de quêtes accepté par `parseSideJson` — un side reste une micro-pause, pas un programme complet. */
export const MAX_SIDE_EXERCISES = 12;

export type ParseSideJsonError = "invalid-shape" | "empty" | "too-many-exercises";

/**
 * Sanitize un JSON de side non fiable (import manuel comme génération LLM — voir
 * plan-llm-side-generation.md § 3.1) vers `{ name, exercises }` : tolérant sur la forme de
 * chaque quête (id manquant/invalide -> `randomUUID()`, durée manquante/invalide -> 30s),
 * mais rejette un JSON qui n'a pas la forme de base d'un side. Un seul point de validation pour
 * `dashboard:import-side` et `dashboard:generate-side` — mêmes règles, mêmes bornes, dans les
 * deux cas des données non fiables (fichier édité à la main ou texte produit par un LLM).
 */
/** Longueur max retenue pour `mascotIdea` — une suggestion tient en une phrase, pas un roman. */
const MAX_MASCOT_IDEA_LENGTH = 300;

export function parseSideJson(
  data: unknown
): { name: string; exercises: Exercise[]; mascotIdea?: string } | { error: ParseSideJsonError } {
  if (typeof data !== "object" || data === null) return { error: "invalid-shape" };
  const obj = data as Record<string, unknown>;
  if (typeof obj.name !== "string" || !obj.name.trim() || !Array.isArray(obj.exercises)) {
    return { error: "invalid-shape" };
  }
  if (obj.exercises.length === 0) return { error: "empty" };
  if (obj.exercises.length > MAX_SIDE_EXERCISES) return { error: "too-many-exercises" };

  const exercises = obj.exercises.map((raw) => {
    const e = raw as Record<string, unknown>;
    return {
      id: typeof e?.id === "string" && e.id ? e.id : randomUUID(),
      label: String(e?.label ?? ""),
      durationSec: Number(e?.durationSec) > 0 ? Number(e.durationSec) : 30,
      category: String(e?.category ?? ""),
    };
  });

  // Suggestion texte d'une mascotte (génération LLM uniquement, voir plan-llm-side-generation.md)
  // — jamais une image, juste un concept que l'utilisateur peut suivre à la main dans l'éditeur.
  const mascotIdea =
    typeof obj.mascotIdea === "string" && obj.mascotIdea.trim()
      ? obj.mascotIdea.trim().slice(0, MAX_MASCOT_IDEA_LENGTH)
      : undefined;

  return { name: obj.name.trim(), exercises, ...(mascotIdea ? { mascotIdea } : {}) };
}
