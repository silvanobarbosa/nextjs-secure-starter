import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/lib/**"],
      // wrappers de serviço externo (Stripe/PostHog/LLM, clients de plataforma, glue de
      // lib externa) são testados por integração, não unit — não entram no threshold da
      // lógica pura. auth-kit é wiring do better-auth; *-client.ts são clients HTTP da
      // plataforma (immune/messaging/telemetry). TODO: cobrir session/config do auth-kit.
      exclude: [
        "src/lib/billing.ts",
        "src/lib/analytics.ts",
        "src/lib/ai-feature.ts",
        "src/lib/immune-client.ts",
        "src/lib/messaging-client.ts",
        "src/lib/telemetry-client.ts",
        "src/lib/auth-kit/**",
      ],
      thresholds: { lines: 70, functions: 70, statements: 70, branches: 60 },
    },
  },
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
});
