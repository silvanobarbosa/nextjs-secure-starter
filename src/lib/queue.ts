/**
 * #15/#20/#44 — Fila de mensagens + Dead Letter Queue. Em vez de fazer AGORA (e segurar a
 * resposta do usuário), anota o trabalho e faz depois, no ritmo que der. A fila durável dá
 * de graça: retry com backoff, e DLQ (a gaveta de quem falhou várias vezes, pra não travar
 * a fila inteira).
 *
 * Implementação: Upstash QStash (REST, sem SDK) quando QSTASH_TOKEN existe — durável, com
 * retry e failure-callback (= DLQ). Sem token, FALLBACK inline: executa já (dev/single) e,
 * se falhar de vez, chama onDeadLetter. Mesma API nos dois modos.
 *
 * Use só onde async durável IMPORTA (sync de ERP, OCR em lote, e-mail em massa). Onde cron
 * já basta, continue no cron — não espalhe fila à toa (YAGNI).
 */

const QSTASH = "https://qstash.upstash.io/v2/publish";
const token = () => process.env.QSTASH_TOKEN;

export interface Job {
  /** URL absoluta do worker que processa o job (uma rota POST sua). */
  target: string;
  body: unknown;
  /** tentativas no QStash antes de ir pra DLQ (default 3). */
  retries?: number;
  /** URL que o QStash chama quando o job esgota as tentativas (a DLQ). */
  deadLetterUrl?: string;
  headers?: Record<string, string>;
}

/** Enfileira (QStash) ou executa inline (fallback). Retorna como foi despachado. */
export async function enqueue(
  job: Job,
  inlineRun?: (body: unknown) => Promise<void>,
  onDeadLetter?: (body: unknown, err: unknown) => Promise<void>,
): Promise<{ via: "qstash" | "inline"; id?: string }> {
  const t = token();

  if (t) {
    const res = await fetch(`${QSTASH}/${encodeURIComponent(job.target)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${t}`,
        "Content-Type": "application/json",
        "Upstash-Retries": String(job.retries ?? 3),
        ...(job.deadLetterUrl ? { "Upstash-Failure-Callback": job.deadLetterUrl } : {}),
        ...(job.headers || {}),
      },
      body: JSON.stringify(job.body),
    });
    if (!res.ok) throw new Error(`qstash publish falhou: http ${res.status}`);
    const j = (await res.json().catch(() => ({}))) as { messageId?: string };
    return { via: "qstash", id: j.messageId };
  }

  // Fallback sem fila: roda agora. Se não tem como rodar inline, não há o que fazer offline.
  if (!inlineRun) {
    throw new Error("enqueue: sem QSTASH_TOKEN e sem inlineRun — nada pra processar o job.");
  }
  try {
    await inlineRun(job.body);
    return { via: "inline" };
  } catch (err) {
    // DLQ do modo inline: entrega o que falhou a quem sabe arquivar (não engole o erro).
    if (onDeadLetter) await onDeadLetter(job.body, err);
    else throw err;
    return { via: "inline" };
  }
}
