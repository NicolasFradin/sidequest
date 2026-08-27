import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";
import { randomUUID } from "node:crypto";
import type { Exercise, Pack, PackSource, PackMascot } from "./packs.js";

export type SessionStatus = "done" | "skipped" | "missed";
export type TriggerType = "timer" | "hook";
export type ScheduleMode = "notify" | "gate" | "mixed";
export type Theme = "dark" | "light";
export type TriggerSource = "timer" | "hook" | "both";
export type VisualTheme = "miami-80s" | "military-camo" | "dragonball" | "roman-empire";
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
 * Fournisseur LLM pour la génération de pack (voir plan-llm-pack-generation.md) — "none" tant
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
  /** Fournisseur LLM actif pour la génération de pack — voir LlmProviderId */
  llmProvider: LlmProviderId;
  anthropicModel: string;
  openaiModel: string;
  /** Local uniquement par défaut (127.0.0.1) — pointer vers un hôte distant est un choix explicite de l'utilisateur, jamais le défaut (même posture que HookServer). */
  ollamaBaseUrl: string;
  ollamaModel: string;
}

/** Un `Plan` est un `Pack` — SQLite (CRUD dashboard) et JSON embarqué partagent désormais la même forme. */
export type Plan = Pack;

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
  activeMascot: "ronnie-coleman",
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

interface PlanRow {
  id: string;
  name: string;
  exercises: string;
  source: PackSource;
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
        mascot TEXT NOT NULL DEFAULT 'ronnie-coleman',
        mode TEXT NOT NULL DEFAULT 'notify'
      );

      CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        exercises TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS pack_progress (
        plan_id TEXT PRIMARY KEY,
        xp INTEGER NOT NULL DEFAULT 0,
        level INTEGER NOT NULL DEFAULT 1
      );
    `);

    // Migrations pour les bases créées avant l'ajout de ces colonnes.
    const sessionColumns = this.db.prepare("PRAGMA table_info(sessions)").all() as { name: string }[];
    if (!sessionColumns.some((c) => c.name === "mascot")) {
      this.db.exec("ALTER TABLE sessions ADD COLUMN mascot TEXT NOT NULL DEFAULT 'ronnie-coleman'");
    }
    if (!sessionColumns.some((c) => c.name === "mode")) {
      this.db.exec("ALTER TABLE sessions ADD COLUMN mode TEXT NOT NULL DEFAULT 'notify'");
    }

    const planColumns = this.db.prepare("PRAGMA table_info(plans)").all() as { name: string }[];
    if (!planColumns.some((c) => c.name === "source")) {
      this.db.exec("ALTER TABLE plans ADD COLUMN source TEXT NOT NULL DEFAULT 'custom'");
    }
    if (!planColumns.some((c) => c.name === "mascot_id")) {
      this.db.exec("ALTER TABLE plans ADD COLUMN mascot_id TEXT");
    }
    if (!planColumns.some((c) => c.name === "mascot_label")) {
      this.db.exec("ALTER TABLE plans ADD COLUMN mascot_label TEXT");
    }
    if (!planColumns.some((c) => c.name === "mascot_image_path")) {
      this.db.exec("ALTER TABLE plans ADD COLUMN mascot_image_path TEXT");
    }
    if (!planColumns.some((c) => c.name === "color")) {
      this.db.exec("ALTER TABLE plans ADD COLUMN color TEXT");
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

  /** Nombre de jours consécutifs (en remontant depuis aujourd'hui) avec au moins un exercice "done" */
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

  private rowToPlan(row: PlanRow): Plan {
    const mascot: PackMascot | undefined = row.mascot_image_path
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

  getPlans(): Plan[] {
    const rows = this.db.prepare("SELECT * FROM plans ORDER BY rowid ASC").all() as PlanRow[];
    return rows.map((r) => this.rowToPlan(r));
  }

  getPlan(id: string): Plan | undefined {
    const row = this.db.prepare("SELECT * FROM plans WHERE id = ?").get(id) as PlanRow | undefined;
    return row ? this.rowToPlan(row) : undefined;
  }

  createPlan(
    name: string,
    exercises: Exercise[],
    opts?: { source?: PackSource; mascot?: PackMascot; color?: string }
  ): Plan {
    const plan: Plan = {
      id: randomUUID(),
      name,
      exercises,
      source: opts?.source ?? "custom",
      mascot: opts?.mascot,
      color: opts?.color,
    };
    this.db
      .prepare(
        `INSERT INTO plans (id, name, exercises, source, mascot_id, mascot_label, mascot_image_path, color)
         VALUES (@id, @name, @exercises, @source, @mascotId, @mascotLabel, @mascotImagePath, @color)`
      )
      .run({
        id: plan.id,
        name: plan.name,
        exercises: JSON.stringify(plan.exercises),
        source: plan.source,
        mascotId: plan.mascot?.id ?? null,
        mascotLabel: plan.mascot?.label ?? null,
        mascotImagePath: plan.mascot?.imagePath ?? null,
        color: plan.color ?? null,
      });
    return plan;
  }

  updatePlan(id: string, partial: { name?: string; exercises?: Exercise[] }): Plan {
    const existing = this.getPlan(id);
    if (!existing) throw new Error(`Plan inconnu : ${id}`);
    const next: Plan = { ...existing, ...partial };
    this.db
      .prepare("UPDATE plans SET name = @name, exercises = @exercises WHERE id = @id")
      .run({ id: next.id, name: next.name, exercises: JSON.stringify(next.exercises) });
    return next;
  }

  /** Si le plan supprimé était actif, `activeProgram` revient au plan par défaut pour ne jamais pointer vers un id inexistant. */
  deletePlan(id: string): void {
    if (this.getSettings().activeProgram === id) {
      this.updateSettings({ activeProgram: DEFAULT_SETTINGS.activeProgram });
    }
    this.db.prepare("DELETE FROM plans WHERE id = ?").run(id);
    this.db.prepare("DELETE FROM pack_progress WHERE plan_id = ?").run(id);
  }

  /**
   * Ajoute de l'XP à un pack et recalcule son niveau (formule volontairement simple pour v1 :
   * un palier tous les 100 XP, pas de courbe par pack). Sert à faire grandir la barre de
   * progression de la galerie, et la mascotte d'un pack qui définit des `stages` (SideCat/SideTama).
   */
  addXp(planId: string, amount: number): { xp: number; level: number } {
    const current = this.getPackProgress(planId);
    const xp = current.xp + amount;
    const level = Math.floor(xp / 100) + 1;
    this.db
      .prepare(
        `INSERT INTO pack_progress (plan_id, xp, level) VALUES (@planId, @xp, @level)
         ON CONFLICT(plan_id) DO UPDATE SET xp = @xp, level = @level`
      )
      .run({ planId, xp, level });
    return { xp, level };
  }

  getPackProgress(planId: string): { xp: number; level: number } {
    const row = this.db.prepare("SELECT xp, level FROM pack_progress WHERE plan_id = ?").get(planId) as
      | { xp: number; level: number }
      | undefined;
    return row ?? { xp: 0, level: 1 };
  }

  close(): void {
    this.db.close();
  }
}
