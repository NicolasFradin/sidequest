import { describe, it, expect, vi, beforeEach } from "vitest";

const execFileMock = vi.hoisted(() => vi.fn());
vi.mock("node:child_process", () => ({ execFile: execFileMock }));

// Fixture capturée sur une vraie invocation le 2026-08-27 :
// `claude -p 'Reply with exactly this JSON and nothing else: {"ok":true}' --output-format json`
const REAL_WRAPPER_SAMPLE = {
  type: "result",
  subtype: "success",
  is_error: false,
  result: '{"ok":true}',
  stop_reason: "end_turn",
};

function mockExecFileOnce(impl: (cmd: string, args: string[], opts: unknown, cb: (...a: unknown[]) => void) => void) {
  execFileMock.mockImplementationOnce(impl as never);
}

beforeEach(() => {
  execFileMock.mockReset();
});

describe("isClaudeCliAvailable", () => {
  // `execFileAsync(which, ["claude"])` a seulement 2 args explicites -> promisify appelle
  // execFile(cmd, args, callback) (3 args), pas (cmd, args, opts, callback) comme generate().
  it("true quand `which claude` réussit", async () => {
    execFileMock.mockImplementationOnce((_cmd: string, _args: string[], cb: (...a: unknown[]) => void) =>
      cb(null, { stdout: "/usr/local/bin/claude", stderr: "" })
    );
    const { isClaudeCliAvailable } = await import("../src/llm/claude-cli.js");
    expect(await isClaudeCliAvailable()).toBe(true);
  });

  it("false quand `which claude` échoue (binaire absent)", async () => {
    execFileMock.mockImplementationOnce((_cmd: string, _args: string[], cb: (...a: unknown[]) => void) =>
      cb(new Error("not found"), { stdout: "", stderr: "" })
    );
    const { isClaudeCliAvailable } = await import("../src/llm/claude-cli.js");
    expect(await isClaudeCliAvailable()).toBe(false);
  });
});

describe("claudeCliProvider", () => {
  it("déballe le champ 'result' du wrapper JSON de la CLI", async () => {
    mockExecFileOnce((_cmd, _args, _opts, cb) =>
      cb(null, { stdout: JSON.stringify(REAL_WRAPPER_SAMPLE), stderr: "" })
    );
    const { claudeCliProvider } = await import("../src/llm/claude-cli.js");
    const text = await claudeCliProvider.generate("prompt", {});
    expect(text).toBe('{"ok":true}');
  });

  it("lève une erreur si le wrapper signale is_error", async () => {
    mockExecFileOnce((_cmd, _args, _opts, cb) =>
      cb(null, { stdout: JSON.stringify({ ...REAL_WRAPPER_SAMPLE, is_error: true }), stderr: "" })
    );
    const { claudeCliProvider } = await import("../src/llm/claude-cli.js");
    await expect(claudeCliProvider.generate("prompt", {})).rejects.toThrow("claude-cli-invalid-output");
  });

  it("lève une erreur si le stdout n'est pas du JSON", async () => {
    mockExecFileOnce((_cmd, _args, _opts, cb) => cb(null, { stdout: "pas du json", stderr: "" }));
    const { claudeCliProvider } = await import("../src/llm/claude-cli.js");
    await expect(claudeCliProvider.generate("prompt", {})).rejects.toThrow("claude-cli-invalid-output");
  });

  it("lève claude-cli-timeout si le process est tué pour timeout", async () => {
    mockExecFileOnce((_cmd, _args, _opts, cb) => cb(Object.assign(new Error("timeout"), { killed: true }), {}));
    const { claudeCliProvider } = await import("../src/llm/claude-cli.js");
    await expect(claudeCliProvider.generate("prompt", {})).rejects.toThrow("claude-cli-timeout");
  });

  it("passe le prompt en argument de tableau, jamais interpolé dans une chaîne", async () => {
    mockExecFileOnce((cmd, args, _opts, cb) => {
      expect(cmd).toBe("claude");
      expect(args).toEqual(["-p", "prompt; rm -rf /", "--output-format", "json"]);
      cb(null, { stdout: JSON.stringify(REAL_WRAPPER_SAMPLE), stderr: "" });
    });
    const { claudeCliProvider } = await import("../src/llm/claude-cli.js");
    await claudeCliProvider.generate("prompt; rm -rf /", {});
  });
});
