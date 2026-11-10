import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resilientFetch, resetBreaker, CircuitOpenError } from "./resilient-fetch";

describe("resilient-fetch", () => {
  beforeEach(() => resetBreaker());
  afterEach(() => vi.restoreAllMocks());

  it("retorna na 1ª quando OK (sem retry)", async () => {
    const f = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", f);
    const r = await resilientFetch("https://a.test/x");
    expect(r.status).toBe(200);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("dá retry em 5xx e sucede na 2ª", async () => {
    let n = 0;
    vi.stubGlobal("fetch", vi.fn(async () => (++n === 1 ? new Response("", { status: 503 }) : new Response("", { status: 200 }))));
    const r = await resilientFetch("https://b.test/x", {}, { backoffMs: 1, retries: 2 });
    expect(r.status).toBe(200);
    expect(n).toBe(2);
  });

  it("não dá retry em 4xx (erro do cliente)", async () => {
    const f = vi.fn(async () => new Response("", { status: 400 }));
    vi.stubGlobal("fetch", f);
    const r = await resilientFetch("https://c.test/x", {}, { retries: 3, backoffMs: 1 });
    expect(r.status).toBe(400);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("abre o circuito após N falhas e passa a lançar CircuitOpenError", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("rede caiu"); }));
    const opts = { retries: 0, backoffMs: 1, breaker: { threshold: 3, cooldownMs: 10_000 } };
    for (let i = 0; i < 3; i++) await resilientFetch("https://d.test/x", {}, opts).catch(() => {});
    await expect(resilientFetch("https://d.test/x", {}, opts)).rejects.toBeInstanceOf(CircuitOpenError);
  });
});
