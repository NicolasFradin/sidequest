import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  isInstalled,
  install,
  uninstall,
  CLAUDE_HOOK_COMMAND,
  CLAUDE_HOOK_TURN_START_COMMAND,
  CLAUDE_HOOK_TURN_END_COMMAND,
} from "../src/claude-hook-installer.js";

describe("claude-hook-installer", () => {
  let dir: string;
  let settingsPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "mascot-hook-installer-"));
    settingsPath = join(dir, "settings.json");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("isInstalled est false quand le fichier n'existe pas", () => {
    expect(isInstalled(settingsPath)).toBe(false);
  });

  it("install crée le fichier avec notre hook Stop", () => {
    install(settingsPath);

    expect(existsSync(settingsPath)).toBe(true);
    expect(isInstalled(settingsPath)).toBe(true);

    const parsed = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(parsed.hooks.Stop).toHaveLength(1);
    expect(parsed.hooks.Stop[0].hooks[0]).toEqual({ type: "command", command: CLAUDE_HOOK_COMMAND });
  });

  it("install est idempotent (n'ajoute pas de doublon)", () => {
    install(settingsPath);
    install(settingsPath);

    const parsed = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(parsed.hooks.Stop).toHaveLength(1);
  });

  it("install préserve les réglages et hooks déjà présents", () => {
    writeFileSync(
      settingsPath,
      JSON.stringify({
        someOtherSetting: true,
        hooks: {
          Stop: [{ hooks: [{ type: "command", command: "echo already-here" }] }],
          PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "echo pre" }] }],
        },
      })
    );

    install(settingsPath);

    const parsed = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(parsed.someOtherSetting).toBe(true);
    expect(parsed.hooks.PreToolUse).toHaveLength(1);
    expect(parsed.hooks.Stop).toHaveLength(2);
    expect(parsed.hooks.Stop[0].hooks[0].command).toBe("echo already-here");
  });

  it("uninstall retire uniquement notre hook", () => {
    writeFileSync(
      settingsPath,
      JSON.stringify({
        hooks: {
          Stop: [
            { hooks: [{ type: "command", command: "echo already-here" }] },
            { hooks: [{ type: "command", command: CLAUDE_HOOK_COMMAND }] },
          ],
        },
      })
    );

    uninstall(settingsPath);

    const parsed = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(parsed.hooks.Stop).toHaveLength(1);
    expect(parsed.hooks.Stop[0].hooks[0].command).toBe("echo already-here");
    expect(isInstalled(settingsPath)).toBe(false);
  });

  it("uninstall sur un fichier inexistant ne crée rien (no-op)", () => {
    uninstall(settingsPath);
    expect(existsSync(settingsPath)).toBe(false);
  });

  it("uninstall après install repasse isInstalled à false", () => {
    install(settingsPath);
    expect(isInstalled(settingsPath)).toBe(true);

    uninstall(settingsPath);
    expect(isInstalled(settingsPath)).toBe(false);
  });

  it('mode "start" installe un hook UserPromptSubmit plutôt que Stop', () => {
    install(settingsPath, "start");

    const parsed = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(parsed.hooks.UserPromptSubmit).toHaveLength(1);
    expect(parsed.hooks.UserPromptSubmit[0].hooks[0]).toEqual({
      type: "command",
      command: CLAUDE_HOOK_COMMAND,
    });
    expect(parsed.hooks.Stop).toBeUndefined();
    expect(isInstalled(settingsPath)).toBe(true);
  });

  it('mode "thinking" installe un hook UserPromptSubmit (début) et un hook Stop (fin) distincts', () => {
    install(settingsPath, "thinking");

    const parsed = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(parsed.hooks.UserPromptSubmit[0].hooks[0].command).toBe(CLAUDE_HOOK_TURN_START_COMMAND);
    expect(parsed.hooks.Stop[0].hooks[0].command).toBe(CLAUDE_HOOK_TURN_END_COMMAND);
  });

  it("changer de mode retire proprement les hooks du mode précédent", () => {
    install(settingsPath, "thinking");
    install(settingsPath, "stop");

    const parsed = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(parsed.hooks.Stop).toHaveLength(1);
    expect(parsed.hooks.Stop[0].hooks[0].command).toBe(CLAUDE_HOOK_COMMAND);
    expect(parsed.hooks.UserPromptSubmit).toHaveLength(0);
  });

  it("le changement de mode préserve les hooks UserPromptSubmit d'un autre outil", () => {
    writeFileSync(
      settingsPath,
      JSON.stringify({
        hooks: {
          UserPromptSubmit: [{ hooks: [{ type: "command", command: "echo not-ours" }] }],
        },
      })
    );

    install(settingsPath, "thinking");
    install(settingsPath, "stop");

    const parsed = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(parsed.hooks.UserPromptSubmit).toHaveLength(1);
    expect(parsed.hooks.UserPromptSubmit[0].hooks[0].command).toBe("echo not-ours");
  });
});
