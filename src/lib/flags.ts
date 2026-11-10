/**
 * #51 — Feature flags + kill-switch. Liga/desliga funcionalidade por configuração, SEM
 * publicar código novo. Dá canário de verdade (liga só pra parte) e botão de pânico
 * (desliga na hora uma feature que está causando incidente).
 *
 * Zero dependência. Fonte das flags, em ordem de precedência:
 *   1) KILL_<NOME>=1  -> kill-switch: desliga na marra, vence tudo (pânico).
 *   2) FLAG_<NOME>=on|off|<0-100>  -> liga/desliga, ou % de rollout (canário).
 *   3) FLAGS={"nome":true,"outra":25} (JSON) -> lote.
 *   4) default passado no código.
 *
 * % de rollout é determinístico por `subject` (ex: userRef/tenantId) — o mesmo usuário
 * sempre cai do mesmo lado, então a experiência não "pisca" entre requests.
 *
 * Upgrade possível (sem trocar a API): trocar a fonte por Vercel Edge Config pra mudar
 * flag sem redeploy. A assinatura de `flag()`/`killed()` fica igual.
 */

const envName = (name: string) => name.toUpperCase().replace(/[^A-Z0-9]+/g, "_");

/** Kill-switch: desliga imediatamente, independente de qualquer outra config. */
export function killed(name: string): boolean {
  const v = process.env[`KILL_${envName(name)}`];
  return v === "1" || v === "true" || v === "on";
}

function fromFlagsJson(name: string): boolean | number | undefined {
  const raw = process.env.FLAGS;
  if (!raw) return undefined;
  try {
    const obj = JSON.parse(raw) as Record<string, boolean | number>;
    return obj[name];
  } catch {
    return undefined;
  }
}

// hash estável 0-99 a partir de uma string (p/ rollout determinístico por subject).
function bucket(subject: string): number {
  let h = 2166136261;
  for (let i = 0; i < subject.length; i++) {
    h ^= subject.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 100;
}

const TRUE = new Set(["on", "true", "1"]);
const FALSE = new Set(["off", "false", "0"]);

// rollout percentual determinístico por subject.
function rollout(name: string, pct: number, subject: string | undefined): boolean {
  if (pct <= 0) return false;
  if (pct >= 100) return true;
  if (!subject) return false; // sem quem medir, canário fica desligado (seguro)
  return bucket(`${name}:${subject}`) < pct;
}

/**
 * A feature `name` está ligada? `opts.subject` ativa rollout percentual determinístico.
 * Síncrono e barato — pode chamar em qualquer lugar.
 */
export function flag(name: string, opts: { subject?: string; default?: boolean } = {}): boolean {
  if (killed(name)) return false;
  const fallback = opts.default ?? false;

  const val: string | boolean | number | undefined = process.env[`FLAG_${envName(name)}`] ?? fromFlagsJson(name);
  if (val === undefined) return fallback;
  if (val === true) return true;
  if (val === false) return false;

  const s = String(val).toLowerCase();
  if (TRUE.has(s)) return true;
  if (FALSE.has(s)) return false;

  const pct = typeof val === "number" ? val : parseInt(s, 10);
  return Number.isNaN(pct) ? fallback : rollout(name, pct, opts.subject);
}
