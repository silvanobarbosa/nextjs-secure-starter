import { describe, it, expect, afterEach } from "vitest";
import { flag, killed } from "./flags";

const clear = () => {
  for (const k of Object.keys(process.env)) if (k.startsWith("FLAG_") || k.startsWith("KILL_") || k === "FLAGS") delete process.env[k];
};

describe("feature flags", () => {
  afterEach(clear);

  it("default quando nada setado", () => {
    expect(flag("nova_tela")).toBe(false);
    expect(flag("nova_tela", { default: true })).toBe(true);
  });

  it("FLAG_<NOME>=on liga", () => {
    process.env.FLAG_NOVA_TELA = "on";
    expect(flag("nova_tela")).toBe(true);
  });

  it("kill-switch vence tudo", () => {
    process.env.FLAG_NOVA_TELA = "on";
    process.env.KILL_NOVA_TELA = "1";
    expect(flag("nova_tela")).toBe(false);
    expect(killed("nova_tela")).toBe(true);
  });

  it("FLAGS json em lote", () => {
    process.env.FLAGS = JSON.stringify({ a: true, b: false });
    expect(flag("a")).toBe(true);
    expect(flag("b")).toBe(false);
  });

  it("rollout % é determinístico por subject", () => {
    process.env.FLAG_CANARIO = "50";
    const u = "user-123";
    expect(flag("canario", { subject: u })).toBe(flag("canario", { subject: u })); // estável
    expect(flag("canario")).toBe(false); // sem subject => desligado (seguro)
    expect(flag("canario", { subject: "x" })).toBe(flag("canario", { subject: "x" }));
  });

  it("0% sempre off, 100% sempre on", () => {
    process.env.FLAG_Z = "0";
    expect(flag("z", { subject: "a" })).toBe(false);
    process.env.FLAG_Z = "100";
    expect(flag("z", { subject: "a" })).toBe(true);
  });
});
