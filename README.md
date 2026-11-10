# nextjs-secure-starter 🥇

A deterministic, security-first **Next.js (App Router) golden template**. It ships with the baseline
already built and tested, so you only write your app's logic (entities/screens/rules). Apache-2.0,
provided as-is.

## What's in the baseline

- **Auth kit** — pluggable login via [auth.config.ts](auth.config.ts): email+password, OIDC SSO
  (e.g. Authentik/any OIDC IdP), Google/Apple/GitHub/Microsoft, magic link, email OTP, passkey
  (WebAuthn), phone/WhatsApp OTP, Telegram, anonymous, 2FA TOTP. A method turns on only when it's
  marked **and** its env vars are present — nothing breaks if one is missing. Built on better-auth.
- **RBAC, deny-by-default** — authorization checked on the backend, never trusted from the client.
- **Security headers** — CSP with per-request nonce, HSTS, X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy, in [next.config](next.config.ts) + [middleware.ts](src/middleware.ts).
- **Health/readiness/conformity** — [src/app/api/](src/app/api/): `/api/health` (liveness),
  `/api/ready` (readiness: pings DB + critical envs → 503 if not ready), `/api/conformity`
  (machine-readable manifest of the baseline this app meets). The deploy waits on `ready` 200, not `health`.
- **CI-QA** — [.github/workflows/ci-qa.yml](.github/workflows/ci-qa.yml): Semgrep, `npm audit`, ESLint
  complexity, `tsc`, Vitest + coverage. Actions pinned by SHA.
- **Semgrep baseline** — [.semgrep/baseline.yml](.semgrep/baseline.yml): hardening guard-rails
  (CORS-reflect-with-credentials, xlsx/SheetJS banned — use exceljs). Runs in CI-QA.
- **E2E + preview DB per PR** — [playwright.config.ts](playwright.config.ts) + [e2e/](e2e/): smoke in
  CI, and an optional workflow that branches a preview database per PR (set `NEON_API_KEY` +
  `NEON_PROJECT_ID` to enable).
- **Gated auto-upgrades** — [.github/dependabot.yml](.github/dependabot.yml) +
  [automerge.yml](.github/workflows/automerge.yml): weekly grouped patch/minor → green CI-QA →
  auto-merge; majors go to a human.
- **Supply chain** — SBOM + cosign signing job (`provenance`), `conformity.json` as the source of truth.
- **Observability** — OpenTelemetry in [instrumentation.ts](instrumentation.ts).
- **Optional ops clients** — `immune-client.ts` (app-level WAF/blocklist), `messaging-client.ts`
  (email/WhatsApp gateway), `telemetry-client.ts`. All are **no-ops without their env vars**, so you
  can delete them or wire them to your own backend.
- **Design system** — [DESIGN.md](DESIGN.md) + tokens in `globals.css`. Give each app its own identity;
  don't ship the default theme.

## Quickstart

```bash
cp .env.example .env            # fill in what your chosen login methods need
npm install
npm run dev
```

Pick your login methods in [auth.config.ts](auth.config.ts). The kit builds better-auth + the
`<AuthPanel>` from exactly what you marked.

## Stack

Next.js App Router · TypeScript · Tailwind · Drizzle (Postgres) · better-auth · Vitest · Playwright.

## Layers (order matters)

1. Schema + Zod → 2. Middleware + rate limit → 3. Tenant context (RLS) → 4. Auth → 5. Features.

## Review before a big change

Before a large build or an architecture change, write the design/PRD **first** (a file under `docs/`)
and review it with **fresh reviewers** — subagents with none of the conversation's context, one per
lens, enforcing the Heilmeier Catechism. The agent that wrote the plan is not the agent that approves
it. (See the companion [adversarial-agent-review](https://github.com/silvanobarbosa/adversarial-agent-review).)

---

Apache-2.0 · provided as-is, no support SLA · © 2026 Silvano Barbosa
