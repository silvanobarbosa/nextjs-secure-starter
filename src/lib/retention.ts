import { track } from "./analytics";

/**
 * #6 Retenção/NRR — a métrica-mãe do valuation (NRR>120% = ~24x EV/Receita).
 * Emite eventos de retorno (o PostHog monta a curva de retenção, ORTOGONAL ao
 * funil) e dá uma heurística de risco de churn pra intervir antes de perder.
 */

/** Chame quando o usuário volta e realiza uma ação de valor. */
export function trackReturn(props: Record<string, unknown> = {}): void {
  track("returned", props);
}

export type ChurnRisk = "low" | "medium" | "high";

/**
 * Heurística de risco de churn (sinais → nível). Use pra disparar intervenção
 * (e-mail, oferta, contato) nos "medium/high" antes de virar cancelamento.
 */
export function churnRisk(signals: { daysSinceActive: number; failedPayments?: number; usageDropPct?: number }): ChurnRisk {
  let score = 0;
  if (signals.daysSinceActive > 14) score += 2;
  else if (signals.daysSinceActive > 7) score += 1;
  if (signals.failedPayments && signals.failedPayments > 0) score += 2;
  if ((signals.usageDropPct ?? 0) > 50) score += 2;
  return score >= 3 ? "high" : score >= 1 ? "medium" : "low";
}
