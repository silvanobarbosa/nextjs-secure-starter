import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Client drizzle (lazy singleton) usado SÓ pelo better-auth (auth-kit).
 * Separado do src/db do app: usa a mesma DATABASE_URL mas o schema de auth.
 * Lazy pra não estourar no import se o env ainda não estiver carregado.
 */
let _db: NeonHttpDatabase<typeof schema> | null = null;

function getAuthDb(): NeonHttpDatabase<typeof schema> {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL ausente — auth-kit precisa do Postgres (Neon).");
  _db = drizzle(neon(url), { schema });
  return _db;
}

/** Proxy que resolve o singleton no primeiro acesso (não no import). */
export const authDb: NeonHttpDatabase<typeof schema> = new Proxy(
  {} as NeonHttpDatabase<typeof schema>,
  {
    get(_t, prop) {
      const db = getAuthDb();
      const v = (db as unknown as Record<string | symbol, unknown>)[prop];
      return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(db) : v;
    },
  },
);
