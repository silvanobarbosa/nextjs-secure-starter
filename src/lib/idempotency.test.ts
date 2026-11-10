import { describe, it, expect } from "vitest";
import { hashBody, scopedKey, withIdempotency } from "./idempotency";

describe("idempotency (lógica pura)", () => {
  it("hashBody estável e sensível a mudança", () => {
    expect(hashBody({ a: 1 })).toBe(hashBody({ a: 1 }));
    expect(hashBody({ a: 1 })).not.toBe(hashBody({ a: 2 }));
  });

  it("scopedKey separa por rota e trunca em 255", () => {
    expect(scopedKey("/api/x", "k1")).toBe("/api/x:k1");
    expect(scopedKey("/api/x", "k1")).not.toBe(scopedKey("/api/y", "k1"));
    expect(scopedKey("r", "z".repeat(400)).length).toBeLessThanOrEqual(255);
  });

  it("sem DATABASE_URL roda fn direto (no-op gracioso)", async () => {
    const prev = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    let ran = 0;
    const r = await withIdempotency(
      { route: "/api/x", clientKey: "k", bodyHash: hashBody({}) },
      async () => { ran++; return { status: 201, body: { ok: true } }; },
    );
    expect(ran).toBe(1);
    expect(r.outcome).toBe("fresh");
    if (prev) process.env.DATABASE_URL = prev;
  });
});
