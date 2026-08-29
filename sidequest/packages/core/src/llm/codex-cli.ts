import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { LlmProvider } from "./types.js";

const execFileAsync = promisify(execFile);
const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_BUFFER_BYTES = 2 * 1024 * 1024;

/**
 * `codex exec <prompt>` — non-interactive one-shot invocation of the Codex CLI, mirroring
 * claude-cli.ts's approach. **Unverified**: unlike `claude-cli.ts` (whose `--output-format json`
 * wrapper shape was captured from a live run on 2026-08-27), the `codex` binary isn't installed
 * in this dev environment, so this implementation is based on documented `codex exec` usage,
 * not an observed run. Unlike Claude's `-p --output-format json`, this reads stdout as the
 * candidate text directly (no wrapper-unwrapping) since that convention isn't confirmed here —
 * if `codex exec` turns out to wrap its output too, this needs the same unwrap step
 * `claude-cli.ts` does. **Test against a real `codex` install before relying on this in
 * production** (see the caveat in plan-llm-side-generation.md's Sprint 5 log).
 */
export async function isCodexCliAvailable(): Promise<boolean> {
  try {
    await execFileAsync(process.platform === "win32" ? "where" : "which", ["codex"]);
    return true;
  } catch {
    return false;
  }
}

export const codexCliProvider: LlmProvider = {
  id: "codex-cli",
  async generate(prompt, opts) {
    try {
      // Array args, never a shell string — same command-injection rationale as claude-cli.ts.
      const { stdout } = await execFileAsync("codex", ["exec", prompt], {
        timeout: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        maxBuffer: MAX_BUFFER_BYTES,
      });
      return stdout;
    } catch (err) {
      const killed = typeof err === "object" && err !== null && "killed" in err && (err as { killed?: boolean }).killed;
      throw new Error(killed ? "codex-cli-timeout" : "codex-cli-failed");
    }
  },
};
