import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";

export type SessionStatus = "done" | "skipped" | "missed";
export type TriggerType = "timer" | "hook";
export type ScheduleMode = "notify" | "gate" | "mixed";
export type Theme = "dark" | "light";
export type TriggerSource = "timer" | "hook" | "both";
export type VisualTheme = "miami-80s" | "military-camo" | "dragonball" | "roman-empire";

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
  activeMascot: "ronnie-coleman",
  autolaunch: false,
  activeProgram: "sport-basic",
  theme: "dark",
  triggerSource: "both",
  hookEveryN: 1,
  visualTheme: "miami-80s",
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
    `);

    // Migrations pour les bases créées avant l'ajout de ces colonnes.
    const columns = this.db.prepare("PRAGMA table_info(sessions)").all() as { name: string }[];
    if (!columns.some((c) => c.name === "mascot")) {
      this.db.exec("ALTER TABLE sessions ADD COLUMN mascot TEXT NOT NULL DEFAULT 'ronnie-coleman'");
    }
    if (!columns.some((c) => c.name === "mode")) {
      this.db.exec("ALTER TABLE sessions ADD COLUMN mode TEXT NOT NULL DEFAULT 'notify'");
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

  close(): void {
    this.db.close();
  }
}
