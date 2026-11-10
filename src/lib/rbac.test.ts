import { describe, it, expect } from "vitest";
import { can, isPublic } from "./rbac";

describe("rbac.can (hierarquico, deny-by-default)", () => {
  it("admin satisfaz qualquer minimo", () => {
    expect(can("admin", "viewer")).toBe(true);
    expect(can("admin", "editor")).toBe(true);
    expect(can("admin", "admin")).toBe(true);
  });
  it("viewer nao alcanca editor/admin", () => {
    expect(can("viewer", "editor")).toBe(false);
    expect(can("viewer", "admin")).toBe(false);
    expect(can("viewer", "viewer")).toBe(true);
  });
  it("sem role = negado", () => {
    expect(can(undefined, "viewer")).toBe(false);
  });
});

describe("rbac.isPublic (whitelist)", () => {
  it("libera health/conformity/login", () => {
    expect(isPublic("/api/health")).toBe(true);
    expect(isPublic("/api/conformity")).toBe(true);
    expect(isPublic("/login")).toBe(true);
  });
  it("nega rota de app por padrao", () => {
    expect(isPublic("/dashboard")).toBe(false);
    expect(isPublic("/api/orders")).toBe(false);
  });
});

describe("as rotas do próprio login", () => {
  it("são alcançáveis sem sessão — elas SÃO o login", () => {
    expect(isPublic("/api/auth/sign-in/email")).toBe(true);
  });

  it("e o prefixo não abre nada parecido", () => {
    expect(isPublic("/api/authx")).toBe(false);
    expect(isPublic("/loginfalso")).toBe(false);
  });
});
