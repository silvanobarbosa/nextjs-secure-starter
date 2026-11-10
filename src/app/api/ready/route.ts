import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

/**
 * #56/#57 — READINESS (diferente de liveness). /api/health diz "o processo está vivo";
 * /api/ready diz "estou PRONTO pra receber tráfego" — checa as dependências (banco,
 * envs críticos). Confundir os dois derruba deploy: se o orquestrador manda tráfego por
 * liveness enquanto o banco ainda não respondeu, o usuário pega 500.
 *
 * 200 ready:true  -> pode mandar tráfego.
 * 503 ready:false -> ainda não (dependência fora).
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // Banco (se o app usa). Ping real: SELECT 1.
  const url = process.env.DATABASE_URL;
  if (url) {
    try {
      const sql = neon(url);
      const t0 = Date.now();
      await sql`SELECT 1`;
      checks.database = { ok: true, detail: `${Date.now() - t0}ms` };
    } catch (e) {
      checks.database = { ok: false, detail: (e as Error).message.slice(0, 120) };
    }
  }

  // Envs críticos pro app levantar com segurança.
  const REQUIRED_ENVS = ["BETTER_AUTH_SECRET"];
  const missing = REQUIRED_ENVS.filter((k) => !process.env[k]);
  checks.env = missing.length ? { ok: false, detail: `faltando: ${missing.join(",")}` } : { ok: true };

  const ready = Object.values(checks).every((c) => c.ok);
  return NextResponse.json(
    { ready, service: process.env.APP_NAME || "my-app", checks, ts: new Date().toISOString() },
    { status: ready ? 200 : 503 },
  );
}
