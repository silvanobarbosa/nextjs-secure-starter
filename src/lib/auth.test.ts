import { describe, it, expect } from "vitest";
import { signToken, verifyToken } from "./auth";

describe("auth token (HMAC round-trip, deny-by-default)", () => {
  it("assina e verifica uma sessão válida", async () => {
    const t = await signToken({ userId: "u1", role: "admin" });
    const s = await verifyToken(t);
    expect(s).toEqual({ userId: "u1", role: "admin" });
  });

  it("rejeita token com assinatura adulterada", async () => {
    const t = await signToken({ userId: "u1", role: "viewer" });
    const [body] = t.split(".");
    expect(await verifyToken(`${body}.assinaturafalsa`)).toBeNull();
  });

  it("rejeita corpo adulterado (assinatura não bate)", async () => {
    const t = await signToken({ userId: "u1", role: "viewer" });
    const [, sig] = t.split(".");
    const forged = btoa(JSON.stringify({ userId: "u1", role: "admin", exp: Date.now() + 1e6 }));
    expect(await verifyToken(`${forged}.${sig}`)).toBeNull();
  });

  it("rejeita token expirado", async () => {
    const t = await signToken({ userId: "u1", role: "viewer" }, -1000);
    expect(await verifyToken(t)).toBeNull();
  });

  it("rejeita formato inválido / vazio", async () => {
    expect(await verifyToken("")).toBeNull();
    expect(await verifyToken("semponto")).toBeNull();
    expect(await verifyToken("a.b.c")).toBeNull();
  });
});
