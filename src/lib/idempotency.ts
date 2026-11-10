import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";

/**
 * #14/#101 — Idempotência. A mesma chamada feita duas vezes dá o MESMO resultado.
 * É o que impede cobrar o cliente duas vezes (webhook reentregue, usuário clicando 2x,
 * retry de rede). Guarda a resposta da 1ª vez por uma chave e devolve a cópia na 2ª.
 *
 * Fronteira real: inserção da chave com ON CONFLICT (atômica no banco) — não "checa depois
 * insere" (isso é condição de corrida, #39). Tabela `idempotency_keys` (ver src/db/schema.ts).
 *
 * No-op gracioso sem DATABASE_URL (template sem banco roda a função direto, sem persistir).
 */

let _sql: ReturnType<typeof neon> | null = null;
function sqlc() {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  _sql = neon(url);
  return _sql;
}

/** Hash estável do corpo — detecta reuso da mesma chave com corpo diferente (erro do cliente). */
export function hashBody(body: unknown): string {
  const canon = typeof body === "string" ? body : JSON.stringify(body ?? null);
  return createHash("sha256").update(canon).digest("hex");
}

/** Escopo a chave pela rota — a mesma `Idempotency-Key` em rotas diferentes não colide. */
export function scopedKey(route: string, clientKey: string): string {
  return `${route}:${clientKey}`.slice(0, 255);
}

export type IdemResult<T> =
  | { outcome: "fresh"; status: number; body: T } // executou agora
  | { outcome: "replayed"; status: number; body: T } // devolveu a cópia salva
  | { outcome: "in_progress" } // 1ª chamada ainda rodando noutro lugar -> 409
  | { outcome: "key_reuse" }; // mesma chave, corpo diferente -> 422

/**
 * Executa `fn` no máximo UMA vez por `key`. Reentrega devolve a resposta salva.
 * `route` + `clientKey` formam a chave; `bodyHash` detecta reuso indevido.
 */
export async function withIdempotency<T>(
  args: { route: string; clientKey: string; bodyHash: string; ttlSec?: number },
  fn: () => Promise<{ status: number; body: T }>,
): Promise<IdemResult<T>> {
  const db = sqlc();
  const key = scopedKey(args.route, args.clientKey);
  const ttl = args.ttlSec ?? 24 * 3600;

  // Sem banco: roda direto (não dá pra garantir idempotência, mas não quebra o app).
  if (!db) {
    const r = await fn();
    return { outcome: "fresh", status: r.status, body: r.body };
  }

  // Insere a chave como "pending" de forma atômica. Se já existe, não insere.
  const inserted = (await db`
    INSERT INTO idempotency_keys (key, body_hash, status, expires_at)
    VALUES (${key}, ${args.bodyHash}, 'pending', now() + (${ttl} || ' seconds')::interval)
    ON CONFLICT (key) DO NOTHING
    RETURNING key
  `) as { key: string }[];

  if (inserted.length === 0) {
    // Já existe: ou terminou (replay), ou está rodando (in_progress), ou reuso de chave.
    const rows = (await db`
      SELECT body_hash, status, response FROM idempotency_keys WHERE key = ${key}
    `) as { body_hash: string; status: string; response: string | null }[];
    const row = rows[0];
    if (!row) {
      // expirou/sumiu entre o INSERT e o SELECT — trata como nova
      const r = await fn();
      await db`UPDATE idempotency_keys SET status='done', response=${JSON.stringify(r)} WHERE key=${key}`;
      return { outcome: "fresh", status: r.status, body: r.body };
    }
    if (row.body_hash !== args.bodyHash) return { outcome: "key_reuse" };
    if (row.status !== "done") return { outcome: "in_progress" };
    const saved = (row.response ? JSON.parse(row.response) : { status: 200, body: null }) as { status: number; body: T };
    return { outcome: "replayed", status: saved.status, body: saved.body };
  }

  // Ganhamos a corrida: executa e grava a resposta.
  try {
    const r = await fn();
    await db`UPDATE idempotency_keys SET status='done', response=${JSON.stringify(r)} WHERE key=${key}`;
    return { outcome: "fresh", status: r.status, body: r.body };
  } catch (e) {
    // Falhou ao executar: solta a chave pra uma nova tentativa poder rodar de verdade.
    await db`DELETE FROM idempotency_keys WHERE key=${key} AND status='pending'`;
    throw e;
  }
}
