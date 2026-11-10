import { test, expect } from "@playwright/test";

// Smoke E2E — páginas públicas + health. Amplie com os fluxos do app
// (login real, CRUD) quando rodar contra o banco Neon branchado (preview-e2e).

test("/login renderiza o form acessível", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.getByLabel("Senha")).toBeVisible();
  // Dentro do formulário e com nome exato: a tela tem mais de um botão cujo nome CONTÉM "Entrar".
  await expect(
    page.locator("form").getByRole("button", { name: "Entrar", exact: true }),
  ).toBeVisible();
});

test("/api/health responde ok", async ({ request }) => {
  const r = await request.get("/api/health");
  expect(r.ok()).toBeTruthy();
  const body = await r.json();
  expect(body.ok).toBe(true);
});

test("rota protegida sem sessão redireciona/nega (deny-by-default)", async ({ page }) => {
  const resp = await page.goto("/dashboard");
  // middleware manda pro /login (redirect) — a URL final não é /dashboard
  expect(page.url()).not.toContain("/dashboard");
  expect(resp?.status()).toBeLessThan(500);
});
