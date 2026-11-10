/**
 * #59/#60 — Log estruturado com id de correlação. Log vira útil de verdade quando tem
 * estrutura (JSON) e um id pra seguir a MESMA requisição por tudo que ela atravessou.
 *
 * Zero dependência. Emite uma linha JSON por evento (o Vercel/coletor já parseia JSON).
 * NUNCA logue segredo nem PII crua — passe só o necessário em `meta`.
 */

type Level = "debug" | "info" | "warn" | "error";
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN = ORDER[(process.env.LOG_LEVEL as Level) || "info"] ?? 20;

/** Extrai/gera um id de correlação a partir dos headers da request. */
export function requestId(headers: Headers): string {
  return (
    headers.get("x-request-id") ||
    headers.get("x-vercel-id") || // a Vercel já injeta um id por request
    crypto.randomUUID()
  );
}

function emit(level: Level, ctx: Record<string, unknown>, msg: string, meta?: Record<string, unknown>) {
  if (ORDER[level] < MIN) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    service: process.env.APP_NAME || "my-app",
    msg,
    ...ctx,
    ...(meta ? { meta } : {}),
  });
  // stdout p/ info/debug, stderr p/ warn/error — o coletor separa por stream.
  if (level === "error" || level === "warn") console.error(line);
  else console.log(line);
}

export interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
  child(extra: Record<string, unknown>): Logger;
}

/** Cria um logger com contexto fixo (ex: { requestId, route, userRef }). */
export function createLogger(ctx: Record<string, unknown> = {}): Logger {
  return {
    debug: (m, meta) => emit("debug", ctx, m, meta),
    info: (m, meta) => emit("info", ctx, m, meta),
    warn: (m, meta) => emit("warn", ctx, m, meta),
    error: (m, meta) => emit("error", ctx, m, meta),
    child: (extra) => createLogger({ ...ctx, ...extra }),
  };
}

/** Atalho: logger já amarrado ao id de correlação da request. */
export function loggerFor(req: { headers: Headers }, extra: Record<string, unknown> = {}): Logger {
  return createLogger({ requestId: requestId(req.headers), ...extra });
}
