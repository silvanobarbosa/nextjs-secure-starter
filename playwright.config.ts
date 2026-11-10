import { defineConfig, devices } from "@playwright/test";

/**
 * E2E — roda contra a app buildada. No CI-QA roda o smoke (páginas públicas, sem DB);
 * no preview-e2e roda contra um banco Neon branchado por PR (dados reais).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npm start",
        url: "http://localhost:3000/login",
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
        env: { SESSION_SECRET: "e2e-only-secret-000000000000000000" },
      },
});
