/**
 * #3 Analytics de produto (opt-in, sem dependência). Emite eventos pro PostHog
 * via capture HTTP se NEXT_PUBLIC_POSTHOG_KEY + HOST estiverem setados; no-op sem.
 * Funil e retenção (métricas ORTOGONAIS — converter ≠ reter) são montados no
 * PostHog a partir destes eventos. Emita `activation` no 1º valor (time-to-value).
 *
 * Uso: track("signup"); track("activation", { step: "first_project" });
 * (Apps que querem autocapture/session replay: `npm i posthog-js` e troque o provider.)
 */
const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

let distinctId: string | null = null;
export function identify(id: string) { distinctId = id; }

function did(): string {
  if (distinctId) return distinctId;
  if (typeof window !== "undefined") {
    let d = window.localStorage.getItem("rl_did");
    if (!d) { d = crypto.randomUUID(); window.localStorage.setItem("rl_did", d); }
    return d;
  }
  return "server";
}

/** Emite um evento (funil/ativação/retenção). No-op se PostHog não configurado. */
export function track(event: string, properties: Record<string, unknown> = {}): void {
  if (!KEY) return;
  try {
    void fetch(`${HOST}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: KEY, event, distinct_id: did(), properties, timestamp: new Date().toISOString() }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* fail-silent — analytics nunca quebra o app */ }
}

/** Marca o momento de 1º valor (a métrica de ativação que mais importa). */
export function trackActivation(step: string, props: Record<string, unknown> = {}): void {
  track("activation", { step, ...props });
}
