/**
 * #36/#39 — Lock otimista. Deixa todo mundo editar e barra na HORA DE SALVAR se alguém
 * mudou antes. É o antídoto da condição de corrida ("funciona testando sozinho e quebra
 * quando dois usuários chegam juntos") sem travar fila como o lock pessimista.
 *
 * Padrão (db-agnóstico, sem acoplar driver):
 *   1) A tabela ganha uma coluna `version integer not null default 0`.
 *   2) A tela lê o registro JUNTO com a version atual.
 *   3) O UPDATE carrega a version lida no WHERE e incrementa:
 *        UPDATE x SET ..., version = version + 1 WHERE id = $id AND version = $lida
 *   4) Se afetou 0 linhas, alguém salvou antes -> 409 (recarregue e refaça).
 *
 * Exemplo com drizzle (neon-http devolve `rowCount`):
 *   const r = await db.update(tbl).set({ ...dados, version: sql`${tbl.version} + 1` })
 *               .where(and(eq(tbl.id, id), eq(tbl.version, versaoLida)));
 *   assertUpdated(r.rowCount);          // lança OptimisticLockError se 0
 */

export class OptimisticLockError extends Error {
  readonly status = 409;
  constructor(message = "Conflito de versão: alguém salvou este registro antes de você. Recarregue e tente de novo.") {
    super(message);
    this.name = "OptimisticLockError";
  }
}

/** Lança OptimisticLockError quando o UPDATE condicionado à version não achou a linha. */
export function assertUpdated(rowCount: number | null | undefined): void {
  if (!rowCount || rowCount === 0) throw new OptimisticLockError();
}

/** Resposta RFC 7807 para o conflito — use no catch do boundary (API/Action). */
export function optimisticProblem() {
  return {
    status: 409 as const,
    body: {
      type: "https://httpstatuses.com/409",
      title: "Conflict",
      status: 409,
      detail: "Conflito de versão: o registro mudou desde que você abriu. Recarregue e refaça.",
    },
  };
}
