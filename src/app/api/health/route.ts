import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * LIVENESS — "o processo está vivo?". Responde 200 sem tocar em dependência (o monitor da
 * fleet bate aqui). Para saber se o app está PRONTO (banco/envs ok) use /api/ready (#56/#57).
 */
export function GET() {
  return NextResponse.json({
    ok: true,
    service: process.env.APP_NAME || "my-app",
    ts: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
  });
}
