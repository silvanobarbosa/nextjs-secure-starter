/**
 * Rate limiting (defesa contra brute-force / abuso). Distribuído via Upstash Redis
 * REST se UPSTASH_REDIS_REST_URL+TOKEN estiverem setados; senão in-memory (dev/single
 * instance). Sem SDK — usa fetch direto (zero dep nova).
 *
 * Presets por tipo de rota (OWASP): login apertado, API padrão mais folgado.
 */
export interface Limit { limit: number; windowSec: number }
export const LIMITS = {
  login: { limit: 5, windowSec: 900 } satisfies Limit, // 5 / 15min
  mfa: { limit: 5, windowSec: 300 } satisfies Limit, // 5 / 5min
  api: { limit: 100, windowSec: 60 } satisfies Limit, // 100 / min
  sensitive: { limit: 10, windowSec: 3600 } satisfies Limit, // ações sensíveis
};

export interface RateResult { allowed: boolean; remaining: number; resetSec: number }

const mem = new Map<string, number[]>(); // key -> timestamps(ms) (fallback in-memory)

function memLimit(key: string, l: Limit): RateResult {
  const now = Date.now();
  const win = l.windowSec * 1000;
  const hits = (mem.get(key) || []).filter((t) => now - t < win);
  hits.push(now);
  mem.set(key, hits);
  const allowed = hits.length <= l.limit;
  return { allowed, remaining: Math.max(0, l.limit - hits.length), resetSec: l.windowSec };
}

async function upstashLimit(key: string, l: Limit): Promise<RateResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  // INCR + (EXPIRE na 1ª vez) via pipeline
  const r = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([["INCR", key], ["EXPIRE", key, String(l.windowSec), "NX"]]),
  });
  const out = (await r.json()) as { result: unknown }[];
  const count = Number((out?.[0] as { result: number })?.result ?? 1);
  const allowed = count <= l.limit;
  return { allowed, remaining: Math.max(0, l.limit - count), resetSec: l.windowSec };
}

/** Aplica o rate-limit a uma `key` (ex: `login:<ip>`). Fail-open se o Redis cair. */
export async function rateLimit(key: string, preset: keyof typeof LIMITS): Promise<RateResult> {
  const l = LIMITS[preset];
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try { return await upstashLimit(`rl:${preset}:${key}`, l); } catch { /* fail-open */ }
  }
  return memLimit(`rl:${preset}:${key}`, l);
}

/** IP do request (respeitando proxy do Vercel). */
export function clientIp(req: { headers: Headers }): string {
  // x-vercel-forwarded-for é setado pela Vercel e NÃO é forjável pelo cliente; os demais são
  // spoofáveis (o cliente prepende). Usar o confiável primeiro evita bypass/envenenamento da blocklist.
  return req.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim()
    || req.headers.get("x-real-ip")?.trim()
    || (req.headers.get("x-forwarded-for") || "").split(",")[0].trim()
    || "unknown";
}
