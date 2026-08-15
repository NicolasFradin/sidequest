import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isInstalled, install, uninstall, CLAUDE_HOOK_COMMAND } from "../src/claude-hook-installer.js";

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
});
