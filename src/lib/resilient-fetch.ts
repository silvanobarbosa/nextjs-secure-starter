/**
 * #10/#11/#12/#13 — fetch resiliente p/ chamada de SAÍDA (ERP, Senior, gateway de IA,
 * webhook de saída). Um wrapper só resolve quatro conceitos:
 *   - Timeout (AbortSignal): desiste depois de N ms — chamada lenta não trava a sua.
 *   - Retry: tenta de novo em falha passageira (rede, 429, 5xx).
 *   - Backoff exponencial + jitter: espera cada vez mais, com ruído, pra não martelar junto.
 *   - Circuit breaker por host: depois de N falhas seguidas, para de chamar por um tempo
 *     (meio-aberto solta 1 após o cooldown). Serviço caído não derruba o seu junto.
 *
 * Zero dependência. Idempotência de retry é responsabilidade de quem chama (só dê retry
 * em GET ou em POST idempotente — ver src/lib/idempotency.ts).
 */

type BreakerState = { fails: number; openUntil: number; halfOpen: boolean };
const breakers = new Map<string, BreakerState>();

export interface ResilientOpts {
  timeoutMs?: number; // default 8000
  retries?: number; // tentativas EXTRA (default 2 => até 3 chamadas)
  backoffMs?: number; // base do backoff (default 300)
  breaker?: { threshold?: number; cooldownMs?: number } | false; // false = desliga breaker
  retryOn?: (res: Response) => boolean; // default: 429 e 5xx
}

export class CircuitOpenError extends Error {
  readonly host: string;
  constructor(host: string) {
    super(`circuito aberto para ${host} (serviço falhando; não vou insistir agora)`);
    this.name = "CircuitOpenError";
    this.host = host;
  }
}

const hostOf = (url: string) => {
  try { return new URL(url).host; } catch { return url; }
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const defaultRetryOn = (res: Response) => res.status === 429 || res.status >= 500;

function breakerAllows(host: string, now: number, threshold: number): BreakerState {
  const b = breakers.get(host) || { fails: 0, openUntil: 0, halfOpen: false };
  if (b.openUntil > now) throw new CircuitOpenError(host);
  if (b.openUntil && b.openUntil <= now && b.fails >= threshold) b.halfOpen = true; // janela meio-aberta
  breakers.set(host, b);
  return b;
}
function onSuccess(host: string) {
  breakers.set(host, { fails: 0, openUntil: 0, halfOpen: false });
}
function onFailure(host: string, threshold: number, cooldownMs: number, now: number) {
  const b = breakers.get(host) || { fails: 0, openUntil: 0, halfOpen: false };
  b.fails += 1;
  b.halfOpen = false;
  if (b.fails >= threshold) b.openUntil = now + cooldownMs;
  breakers.set(host, b);
}

// fetch com timeout duro via AbortController (compõe com o signal do chamador, se houver).
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const signal = init.signal ? AbortSignal.any([init.signal, controller.signal]) : controller.signal;
  const to = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal });
  } finally {
    clearTimeout(to);
  }
}

type Attempt = { kind: "return"; res: Response } | { kind: "retry"; res?: Response } | { kind: "error"; err: unknown };

// Uma tentativa: resolve se devolve a resposta, se vale retry, ou se errou. Mexe no breaker.
async function oneAttempt(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  retryOn: (r: Response) => boolean,
  onOk: () => void,
  onFail: () => void,
): Promise<Attempt> {
  try {
    const res = await fetchWithTimeout(url, init, timeoutMs);
    if (!retryOn(res)) { onOk(); return { kind: "return", res }; }
    onFail();
    return { kind: "retry", res };
  } catch (err) {
    onFail();
    return { kind: "error", err };
  }
}

function normalize(opts: ResilientOpts) {
  return {
    timeoutMs: opts.timeoutMs ?? 8000,
    retries: opts.retries ?? 2,
    backoffMs: opts.backoffMs ?? 300,
    retryOn: opts.retryOn ?? defaultRetryOn,
    breakerOn: opts.breaker !== false,
    threshold: (opts.breaker && opts.breaker.threshold) || 5,
    cooldownMs: (opts.breaker && opts.breaker.cooldownMs) || 30_000,
  };
}

/** fetch com timeout + retry + backoff + breaker. Lança no esgotamento das tentativas. */
export async function resilientFetch(url: string, init: RequestInit = {}, opts: ResilientOpts = {}): Promise<Response> {
  const { timeoutMs, retries, backoffMs, retryOn, breakerOn, threshold, cooldownMs } = normalize(opts);
  const host = hostOf(url);
  const onOk = () => { if (breakerOn) onSuccess(host); };
  const onFail = () => { if (breakerOn) onFailure(host, threshold, cooldownMs, Date.now()); };

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (breakerOn) breakerAllows(host, Date.now(), threshold); // lança CircuitOpenError se aberto
    const r = await oneAttempt(url, init, timeoutMs, retryOn, onOk, onFail);
    if (r.kind === "return") return r.res;
    if (r.kind === "error") lastErr = r.err;
    if (attempt >= retries) return r.kind === "retry" && r.res ? r.res : Promise.reject(lastErr); // esgotou
    await sleep(backoffMs * 2 ** attempt + Math.random() * backoffMs); // backoff + jitter
  }
  throw lastErr instanceof Error ? lastErr : new Error(`resilientFetch falhou: ${String(lastErr)}`);
}

/** Zera o breaker de um host (ou todos) — útil em teste e em remediação manual. */
export function resetBreaker(host?: string) {
  if (host) breakers.delete(hostOf(host));
  else breakers.clear();
}
