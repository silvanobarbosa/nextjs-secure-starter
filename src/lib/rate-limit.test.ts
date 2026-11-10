import { describe, it, expect } from "vitest";
import { rateLimit, LIMITS } from "./rate-limit";

describe("rate-limit (in-memory fallback)", () => {
  it("libera até o limite e bloqueia o excedente (login: 5/15min)", async () => {
    const key = `test-${Math.round(performance.now())}-${LIMITS.login.limit}`;
    const results = [];
    for (let i = 0; i < LIMITS.login.limit + 2; i++) results.push(await rateLimit(key, "login"));
    const allowed = results.filter((r) => r.allowed).length;
    expect(allowed).toBe(LIMITS.login.limit); // exatamente 5 passam
    expect(results.at(-1)!.allowed).toBe(false); // o 7º bloqueado
    expect(results.at(-1)!.remaining).toBe(0);
  });

  it("chaves distintas não interferem", async () => {
    const a = await rateLimit("k-a", "api");
    const b = await rateLimit("k-b", "api");
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
  });
});
