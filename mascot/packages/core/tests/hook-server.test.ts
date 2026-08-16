import { describe, it, expect, afterEach, vi } from "vitest";
import { HookServer, HOOK_SERVER_PORT } from "../src/hook-server.js";

describe("HookServer", () => {
  let server: HookServer | null = null;

  afterEach(async () => {
    await server?.stop();
    server = null;
  });

  it("utilise HOOK_SERVER_PORT par défaut", () => {
    server = new HookServer({ onTrigger: () => {} });
    expect(server.port).toBe(HOOK_SERVER_PORT);
    expect(HOOK_SERVER_PORT).toBe(54321);
  });

  it("démarre et écoute sur un port assigné par l'OS (port: 0)", async () => {
    server = new HookServer({ onTrigger: () => {}, port: 0 });
    expect(server.isRunning()).toBe(false);

    await server.start();

    expect(server.isRunning()).toBe(true);
    expect(server.getPort()).toBeGreaterThan(0);
  });

  it("appelle onTrigger sur POST /trigger et répond 200", async () => {
    const onTrigger = vi.fn();
    server = new HookServer({ onTrigger, port: 0 });
    await server.start();

    const res = await fetch(`http://127.0.0.1:${server.getPort()}/trigger`, { method: "POST" });

    expect(res.status).toBe(200);
    expect(onTrigger).toHaveBeenCalledOnce();
  });

  it("appelle onTurnStart sur POST /turn-start et répond 200", async () => {
    const onTurnStart = vi.fn();
    server = new HookServer({ onTrigger: () => {}, onTurnStart, port: 0 });
    await server.start();

    const res = await fetch(`http://127.0.0.1:${server.getPort()}/turn-start`, { method: "POST" });

    expect(res.status).toBe(200);
    expect(onTurnStart).toHaveBeenCalledOnce();
  });

  it("appelle onTurnEnd sur POST /turn-end et répond 200", async () => {
    const onTurnEnd = vi.fn();
    server = new HookServer({ onTrigger: () => {}, onTurnEnd, port: 0 });
    await server.start();

    const res = await fetch(`http://127.0.0.1:${server.getPort()}/turn-end`, { method: "POST" });

    expect(res.status).toBe(200);
    expect(onTurnEnd).toHaveBeenCalledOnce();
  });

  it("/turn-start répond 200 sans planter si le callback n'est pas fourni", async () => {
    server = new HookServer({ onTrigger: () => {}, port: 0 });
    await server.start();

    const res = await fetch(`http://127.0.0.1:${server.getPort()}/turn-start`, { method: "POST" });

    expect(res.status).toBe(200);
  });

  it("ne déclenche rien et répond 404 sur une autre route", async () => {
    const onTrigger = vi.fn();
    server = new HookServer({ onTrigger, port: 0 });
    await server.start();

    const res = await fetch(`http://127.0.0.1:${server.getPort()}/autre-chose`, { method: "POST" });

    expect(res.status).toBe(404);
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it("ne déclenche rien et répond 404 sur GET /trigger", async () => {
    const onTrigger = vi.fn();
    server = new HookServer({ onTrigger, port: 0 });
    await server.start();

    const res = await fetch(`http://127.0.0.1:${server.getPort()}/trigger`, { method: "GET" });

    expect(res.status).toBe(404);
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it("s'arrête proprement", async () => {
    server = new HookServer({ onTrigger: () => {}, port: 0 });
    await server.start();

    await server.stop();

    expect(server.isRunning()).toBe(false);
    expect(server.getPort()).toBeNull();
  });
});
