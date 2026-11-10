import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";

/**
 * Schema base do template. O factory ACRESCENTA as entidades do app;
 * users/roles/audit ja vem prontos (todo app precisa deles).
 */
/**
 * ATENÇÃO: com o auth-kit ligado, os usuários de VERDADE moram na tabela `user` (singular), criada
 * por `src/lib/auth-kit/schema.ts`, e o id deles é TEXTO — não o uuid daqui.
 *
 * Entidade do app que guarde "quem fez" deve usar `text` e o id do auth-kit. Referenciar esta
 * tabela faz o login funcionar e TODA tela autenticada devolver 500 com
 * "invalid input syntax for type uuid".
 */
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  role: text("role", { enum: ["admin", "editor", "viewer"] }).notNull().default("viewer"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Trilha de auditoria — quem fez o que (compliance/forense). */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id),
    action: text("action").notNull(),
    entity: text("entity"),
    entityId: text("entity_id"),
    meta: text("meta"),
    at: timestamp("at").defaultNow().notNull(),
  },
  (t) => [index("idx_audit_user_at").on(t.userId, t.at)],
);

/**
 * #14/#101 — Chaves de idempotência. Guarda a resposta da 1ª execução por chave e devolve
 * a cópia na reentrega (webhook reenviado, clique duplo, retry de rede) — impede efeito
 * colateral repetido (ex: cobrar duas vezes). Usada por src/lib/idempotency.ts.
 * Limpeza: linhas com expires_at vencido podem ser varridas por um cron.
 */
export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    key: text("key").primaryKey(), // `${rota}:${Idempotency-Key}`
    bodyHash: text("body_hash").notNull(), // sha256 do corpo (detecta reuso c/ corpo diferente)
    status: text("status", { enum: ["pending", "done"] }).notNull().default("pending"),
    // Resposta salva como JSON { status, body } — sem coluna int separada (status HTTP cabe no JSON).
    response: text("response"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (t) => [index("idx_idem_expires").on(t.expiresAt)],
);
