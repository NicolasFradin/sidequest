import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";
import { randomUUID } from "node:crypto";
import type { Exercise, Side, SideSource, SideMascot } from "./sides.js";

export type SessionStatus = "done" | "skipped" | "missed";
export type TriggerType = "timer" | "hook";
export type ScheduleMode = "notify" | "gate" | "mixed";
export type Theme = "dark" | "light";
export type TriggerSource = "timer" | "hook" | "both";
export type VisualTheme = "miami-80s" | "military-camo" | "manga" | "roman-empire";
/** Langue de l'interface (dashboard + overlay + menu tray) — indépendante du thème clair/sombre et du skin visuel. */
export type Language = "fr" | "en";
/**
 * Quel évènement du cycle de vie Claude Code déclenche l'exercice :
 * "stop" = fin de réponse (comportement historique), "start" = début du tour (dès la soumission
 * du prompt), "thinking" = comme "start" mais seulement si Claude travaille encore après un
 * court délai (évite de proposer l'exercice sur des échanges rapides) — voir plan V0.5 sprint 6.
 */
export type HookTriggerMode = "stop" | "start" | "thinking";
/**
 * Fournisseur LLM pour la génération de side (voir plan-llm-side-generation.md) — "none" tant
 * que rien n'est configuré. La clé API elle-même n'est jamais stockée ici (ni en SQLite) : voir
 * packages/app/src/main/llm-credentials.js (chiffrement OS via safeStorage, hors de core).
 */
export type LlmProviderId = "none" | "anthropic-api" | "openai-api" | "claude-cli" | "codex-cli" | "ollama";

export interface Settings {
  intervalMinutes: number;
  mode: ScheduleMode;
  activeMascot: string;
  autolaunch: boolean;
  activeProgram: string;
  theme: Theme;
  /** Origine des déclenchements d'exercice : minuteur seul, hook Claude Code seul, ou les deux */
  triggerSource: TriggerSource;
  /** Ne déclencher qu'un hook Claude Code sur N (ex. 3 = une réponse sur trois) — défaut 1 (à chaque fois) */
  hookEveryN: number;
  /** Skin global (palette dashboard + mascottes associées) — indépendant du thème clair/foncé */
  visualTheme: VisualTheme;
  /** Point de déclenchement du hook Claude Code installé — voir HookTriggerMode */
  hookTriggerMode: HookTriggerMode;
  /** Langue de l'interface — voir Language */
  language: Language;
  /** Fournisseur LLM actif pour la génération de side — voir LlmProviderId */
  llmProvider: LlmProviderId;
  anthropicModel: string;
  openaiModel: string;
  /** Local uniquement par défaut (127.0.0.1) — pointer vers un hôte distant est un choix explicite de l'utilisateur, jamais le défaut (même posture que HookServer). */
  ollamaBaseUrl: string;
  ollamaModel: string;
}

export interface SessionRecord {
  id?: number;
  timestamp: string; // ISO 8601
  exerciseId: string;
  status: SessionStatus;
  triggerType: TriggerType;
  /** Prêt pour l'anti-triche future (webcam) — toujours false au MVP */
  verified: boolean;
  /** Mascotte active au moment de la séance */
  mascot: string;
  /** Mode actif au moment de la séance */
  mode: ScheduleMode;
}

const DEFAULT_SETTINGS: Settings = {
  intervalMinutes: 30,
  mode: "notify",
  activeMascot: "sidequest",
  autolaunch: false,
  activeProgram: "sport-basic",
  theme: "dark",
  triggerSource: "both",
  hookEveryN: 1,
  visualTheme: "miami-80s",
  hookTriggerMode: "stop",
  language: "fr",
  llmProvider: "none",
  anthropicModel: "claude-sonnet-5",
  openaiModel: "gpt-4.1",
  ollamaBaseUrl: "http://127.0.0.1:11434",
  ollamaModel: "llama3.1",
};

interface SettingsRow {
  key: string;
  value: string;
}

interface SessionRow {
  id: number;
  timestamp: string;
  exercise_id: string;
  status: string;
  trigger_type: string;
  verified: number;
  mascot: string;
  mode: string;
}

interface SideRow {
  id: string;
  name: string;
  exercises: string;
  source: SideSource;
  mascot_id: string | null;
  mascot_label: string | null;
  mascot_image_path: string | null;
  color: string | null;
}

export class Storage {
  private readonly db: DatabaseType;

  constructor(dbPath: string = ":memory:") {
    this.db = new Database(dbPath);
    this.migrate();
  }

  private migrate(): void {
    this.renameLegacyPackTables();

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        exercise_id TEXT NOT NULL,
        status TEXT NOT NULL,
        trigger_type TEXT NOT NULL,
        verified INTEGER NOT NULL DEFAULT 0,
        mascot TEXT NOT NULL DEFAULT 'sidequest',
        mode TEXT NOT NULL DEFAULT 'notify'
      );

      CREATE TABLE IF NOT EXISTS sides (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        exercises TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS side_progress (
        side_id TEXT PRIMARY KEY,
        xp INTEGER NOT NULL DEFAULT 0,
        level INTEGER NOT NULL DEFAULT 1
      );
    `);

    // Migrations pour les bases créées avant l'ajout de ces colonnes.
    const sessionColumns = this.db.prepare("PRAGMA table_info(sessions)").all() as { name: string }[];
    if (!sessionColumns.some((c) => c.name === "mascot")) {
      this.db.exec("ALTER TABLE sessions ADD COLUMN mascot TEXT NOT NULL DEFAULT 'sidequest'");
    }
    if (!sessionColumns.some((c) => c.name === "mode")) {
      this.db.exec("ALTER TABLE sessions ADD COLUMN mode TEXT NOT NULL DEFAULT 'notify'");
    }

    const sideColumns = this.db.prepare("PRAGMA table_info(sides)").all() as { name: string }[];
    if (!sideColumns.some((c) => c.name === "source")) {
      this.db.exec("ALTER TABLE sides ADD COLUMN source TEXT NOT NULL DEFAULT 'custom'");
    }
    if (!sideColumns.some((c) => c.name === "mascot_id")) {
      this.db.exec("ALTER TABLE sides ADD COLUMN mascot_id TEXT");
    }
    if (!sideColumns.some((c) => c.name === "mascot_label")) {
      this.db.exec("ALTER TABLE sides ADD COLUMN mascot_label TEXT");
    }
    if (!sideColumns.some((c) => c.name === "mascot_image_path")) {
      this.db.exec("ALTER TABLE sides ADD COLUMN mascot_image_path TEXT");
    }
    if (!sideColumns.some((c) => c.name === "color")) {
      this.db.exec("ALTER TABLE sides ADD COLUMN color TEXT");
    }
  }

  /**
   * Bases créées avant le rename pack/plan → side : `plans`/`pack_progress` (et sa colonne
   * `plan_id`) deviennent `sides`/`side_progress`/`side_id` en place, sans perte de données
   * (parcours/XP existants). No-op sur une base fraîche (tables absentes) ou déjà migrée.
   */
  private renameLegacyPackTables(): void {
    const tables = new Set(
      (this.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map(
        (t) => t.name
      )
    );
    if (tables.has("plans") && !tables.has("sides")) {
      this.db.exec("ALTER TABLE plans RENAME TO sides");
    }
    if (tables.has("pack_progress") && !tables.has("side_progress")) {
      this.db.exec("ALTER TABLE pack_progress RENAME TO side_progress");
    }
    // Tables inexistantes : PRAGMA table_info() renvoie simplement 0 ligne, pas d'erreur.
    const progressColumns = this.db.prepare("PRAGMA table_info(side_progress)").all() as { name: string }[];
    if (progressColumns.some((c) => c.name === "plan_id") && !progressColumns.some((c) => c.name === "side_id")) {
      this.db.exec("ALTER TABLE side_progress RENAME COLUMN plan_id TO side_id");
    }
  }

  /** false tant qu'aucun réglage n'a jamais été écrit — sert à déclencher l'onboarding au premier lancement */
  hasBeenConfigured(): boolean {
    const row = this.db.prepare("SELECT 1 FROM settings LIMIT 1").get();
    return row !== undefined;
  }

  getSettings(): Settings {
    const rows = this.db
      .prepare("SELECT key, value FROM settings")
      .all() as SettingsRow[];
    const stored: Record<string, string> = {};
    for (const row of rows) stored[row.key] = row.value;

    return {
      intervalMinutes: stored.intervalMinutes
        ? Number(stored.intervalMinutes)
        : DEFAULT_SETTINGS.intervalMinutes,
      mode: (stored.mode as ScheduleMode) ?? DEFAULT_SETTINGS.mode,
      activeMascot: stored.activeMascot ?? DEFAULT_SETTINGS.activeMascot,
      autolaunch: stored.autolaunch
        ? stored.autolaunch === "true"
        : DEFAULT_SETTINGS.autolaunch,
      activeProgram: stored.activeProgram ?? DEFAULT_SETTINGS.activeProgram,
      theme: (stored.theme as Theme) ?? DEFAULT_SETTINGS.theme,
      triggerSource: (stored.triggerSource as TriggerSource) ?? DEFAULT_SETTINGS.triggerSource,
      hookEveryN: stored.hookEveryN ? Math.max(1, Number(stored.hookEveryN)) : DEFAULT_SETTINGS.hookEveryN,
      visualTheme: (stored.visualTheme as VisualTheme) ?? DEFAULT_SETTINGS.visualTheme,
      hookTriggerMode: (stored.hookTriggerMode as HookTriggerMode) ?? DEFAULT_SETTINGS.hookTriggerMode,
      language: (stored.language as Language) ?? DEFAULT_SETTINGS.language,
      llmProvider: (stored.llmProvider as LlmProviderId) ?? DEFAULT_SETTINGS.llmProvider,
      anthropicModel: stored.anthropicModel ?? DEFAULT_SETTINGS.anthropicModel,
      openaiModel: stored.openaiModel ?? DEFAULT_SETTINGS.openaiModel,
      ollamaBaseUrl: stored.ollamaBaseUrl ?? DEFAULT_SETTINGS.ollamaBaseUrl,
      ollamaModel: stored.ollamaModel ?? DEFAULT_SETTINGS.ollamaModel,
    };
  }

  updateSettings(partial: Partial<Settings>): Settings {
    const next = { ...this.getSettings(), ...partial };
    const stmt = this.db.prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    );
    const insertAll = this.db.transaction((entries: [string, string][]) => {
      for (const [key, value] of entries) stmt.run(key, value);
    });
    insertAll(
      Object.entries(next).map(([k, v]) => [k, String(v)]) as [
        string,
        string
      ][]
    );
    return next;
  }

  recordSession(session: Omit<SessionRecord, "id">): SessionRecord {
    const stmt = this.db.prepare(
      `INSERT INTO sessions (timestamp, exercise_id, status, trigger_type, verified, mascot, mode)
       VALUES (@timestamp, @exerciseId, @status, @triggerType, @verified, @mascot, @mode)`
    );
    const info = stmt.run({
      timestamp: session.timestamp,
      exerciseId: session.exerciseId,
      status: session.status,
      triggerType: session.triggerType,
      verified: session.verified ? 1 : 0,
      mascot: session.mascot,
      mode: session.mode,
    });
    return { ...session, id: Number(info.lastInsertRowid) };
  }

  getSessions(): SessionRecord[] {
    const rows = this.db
      .prepare("SELECT * FROM sessions ORDER BY timestamp DESC, id DESC")
      .all() as SessionRow[];
    return rows.map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      exerciseId: r.exercise_id,
      status: r.status as SessionStatus,
      triggerType: r.trigger_type as TriggerType,
      verified: Boolean(r.verified),
      mascot: r.mascot,
      mode: r.mode as ScheduleMode,
    }));
  }

  /**
   * Dette de séances non faites (honor system) : chaque séance "skipped"/"missed" ajoute 1,
   * chaque séance "done" en rembourse 1 (jamais en dessous de 0). Rejouée chronologiquement
   * (pas juste une soustraction des totaux) pour qu'un ancien excédent de séances "done" ne
   * puisse pas servir de crédit qui absorberait silencieusement de futurs skips.
   */
  getDebt(): number {
    const chronological = [...this.getSessions()].reverse(); // getSessions() est du + récent au + ancien
    let debt = 0;
    for (const session of chronological) {
      if (session.status === "skipped" || session.status === "missed") {
        debt += 1;
      } else if (session.status === "done") {
        debt = Math.max(0, debt - 1);
      }
    }
    return debt;
  }

  /** Nombre de jours consécutifs (en remontant depuis aujourd'hui) avec au moins une quête "done" */
  getCurrentStreak(): number {
    const doneDays = new Set(
      this.getSessions()
        .filter((s) => s.status === "done")
        .map((s) => s.timestamp.slice(0, 10)) // YYYY-MM-DD
    );
    if (doneDays.size === 0) return 0;

    let streak = 0;
    const cursor = new Date();
    while (doneDays.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  private rowToSide(row: SideRow): Side {
    const mascot: SideMascot | undefined = row.mascot_image_path
      ? { id: row.mascot_id ?? row.id, label: row.mascot_label ?? row.name, imagePath: row.mascot_image_path }
      : undefined;
    return {
      id: row.id,
      name: row.name,
      exercises: JSON.parse(row.exercises) as Exercise[],
      source: row.source,
      mascot,
      color: row.color ?? undefined,
    };
  }

  getSides(): Side[] {
    const rows = this.db.prepare("SELECT * FROM sides ORDER BY rowid ASC").all() as SideRow[];
    return rows.map((r) => this.rowToSide(r));
  }

  getSide(id: string): Side | undefined {
    const row = this.db.prepare("SELECT * FROM sides WHERE id = ?").get(id) as SideRow | undefined;
    return row ? this.rowToSide(row) : undefined;
  }

  createSide(
    name: string,
    exercises: Exercise[],
    opts?: { source?: SideSource; mascot?: SideMascot; color?: string }
  ): Side {
    const side: Side = {
      id: randomUUID(),
      name,
      exercises,
      source: opts?.source ?? "custom",
      mascot: opts?.mascot,
      color: opts?.color,
    };
    this.db
      .prepare(
        `INSERT INTO sides (id, name, exercises, source, mascot_id, mascot_label, mascot_image_path, color)
         VALUES (@id, @name, @exercises, @source, @mascotId, @mascotLabel, @mascotImagePath, @color)`
      )
      .run({
        id: side.id,
        name: side.name,
        exercises: JSON.stringify(side.exercises),
        source: side.source,
        mascotId: side.mascot?.id ?? null,
        mascotLabel: side.mascot?.label ?? null,
        mascotImagePath: side.mascot?.imagePath ?? null,
        color: side.color ?? null,
      });
    return side;
  }

  /**
   * `mascot: null` efface la mascotte propre au side (il retombe sur la mascotte globale) ;
   * `mascot` absent du `partial` laisse la mascotte actuelle inchangée ; un `SideMascot` la
   * remplace. Distinct de `undefined` volontairement — `"mascot" in partial` est la seule façon
   * fiable de distinguer "pas touché" de "explicitement effacé" une fois passé par spread.
   */
  updateSide(id: string, partial: { name?: string; exercises?: Exercise[]; mascot?: SideMascot | null }): Side {
    const existing = this.getSide(id);
    if (!existing) throw new Error(`Side inconnu : ${id}`);
    const mascot = "mascot" in partial ? (partial.mascot ?? undefined) : existing.mascot;
    const next: Side = {
      ...existing,
      name: partial.name ?? existing.name,
      exercises: partial.exercises ?? existing.exercises,
      mascot,
    };
    this.db
      .prepare(
        `UPDATE sides SET name = @name, exercises = @exercises,
           mascot_id = @mascotId, mascot_label = @mascotLabel, mascot_image_path = @mascotImagePath
         WHERE id = @id`
      )
      .run({
        id: next.id,
        name: next.name,
        exercises: JSON.stringify(next.exercises),
        mascotId: mascot?.id ?? null,
        mascotLabel: mascot?.label ?? null,
        mascotImagePath: mascot?.imagePath ?? null,
      });
    return next;
  }

  /** Si le side supprimé était actif, `activeProgram` revient au side par défaut pour ne jamais pointer vers un id inexistant. */
  deleteSide(id: string): void {
    if (this.getSettings().activeProgram === id) {
      this.updateSettings({ activeProgram: DEFAULT_SETTINGS.activeProgram });
    }
    this.db.prepare("DELETE FROM sides WHERE id = ?").run(id);
    this.db.prepare("DELETE FROM side_progress WHERE side_id = ?").run(id);
  }

  /**
   * Ajoute de l'XP à un side et recalcule son niveau (formule volontairement simple pour v1 :
   * un palier tous les 100 XP, pas de courbe par side). Sert à faire grandir la barre de
   * progression de la galerie, et la mascotte d'un side qui définit des `stages` (SideCat/SidePet).
   */
  addXp(sideId: string, amount: number): { xp: number; level: number } {
    const current = this.getSideProgress(sideId);
    const xp = current.xp + amount;
    const level = Math.floor(xp / 100) + 1;
    this.db
      .prepare(
        `INSERT INTO side_progress (side_id, xp, level) VALUES (@sideId, @xp, @level)
         ON CONFLICT(side_id) DO UPDATE SET xp = @xp, level = @level`
      )
      .run({ sideId, xp, level });
    return { xp, level };
  }

  getSideProgress(sideId: string): { xp: number; level: number } {
    const row = this.db.prepare("SELECT xp, level FROM side_progress WHERE side_id = ?").get(sideId) as
      | { xp: number; level: number }
      | undefined;
    return row ?? { xp: 0, level: 1 };
  }

  /**
   * Efface l'historique de séances et remet à zéro l'XP/niveau de tous les sides (donc les
   * badges de palier, purement dérivés du niveau — voir sqMilestones.getBadgesForLevel). Ne
   * touche ni aux réglages ni aux sides eux-mêmes (bundled/custom).
   */
  clearHistory(): void {
    this.db.exec("DELETE FROM sessions");
    this.db.exec("DELETE FROM side_progress");
  }

  close(): void {
    this.db.close();
  }
}
