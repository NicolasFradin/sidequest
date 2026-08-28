import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { LlmProvider } from "./types.js";

const execFileAsync = promisify(execFile);
const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_BUFFER_BYTES = 2 * 1024 * 1024;

/**
 * `claude -p <prompt> --output-format json` runs the Claude Code CLI non-interactively and
 * reuses whatever subscription/login is already set up on the machine — SideQuest never sees a
 * token (same pattern as `claude-hook-installer.ts`, which shells out to install a hook rather
 * than talking to any API directly). Verified live 2026-08-27:
 *   `claude -p 'Reply with exactly this JSON and nothing else: {"ok":true}' --output-format json`
 * returns a wrapper object, not raw model text — `{"type":"result","is_error":false,"result":"{\"ok\":true}",...}`.
 * The actual model reply is the `result` string, which is what this provider returns (still just
 * text — `generateSide()` is the one that JSON.parses/validates it, same as every other provider).
 */
export async function isClaudeCliAvailable(): Promise<boolean> {
  try {
    await execFileAsync(process.platform === "win32" ? "where" : "which", ["claude"]);
    return true;
  } catch {
    return false;
  }
}

export const claudeCliProvider: LlmProvider = {
  id: "claude-cli",
  async generate(prompt, opts) {
    let stdout: string;
    try {
      // Array args, never a shell string: `prompt` is free-form user text, interpolating it into
      // a shell command would be a command-injection hole (execFile bypasses the shell entirely).
      const result = await execFileAsync("claude", ["-p", prompt, "--output-format", "json"], {
        timeout: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        maxBuffer: MAX_BUFFER_BYTES,
      });
      stdout = result.stdout;
    } catch (err) {
      const killed = typeof err === "object" && err !== null && "killed" in err && (err as { killed?: boolean }).killed;
      throw new Error(killed ? "claude-cli-timeout" : "claude-cli-failed");
    }

    let wrapper: { is_error?: boolean; result?: string };
    try {
      wrapper = JSON.parse(stdout);
    } catch {
      throw new Error("claude-cli-invalid-output");
    }
    if (wrapper.is_error || typeof wrapper.result !== "string") {
      throw new Error("claude-cli-invalid-output");
    }
    return wrapper.result;
  },
};
