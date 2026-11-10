import { guardInput, guardOutput } from "./ai-guard";
import { track } from "./analytics";

/**
 * #5 IA como FEATURE de produto (não wrapper) — OPT-IN. Recebe uma TASK específica
 * (sumarizar/sugerir/autopreencher) embutida num workflow, guardada (input LLM01 +
 * output PII/segredo) e MEDE adoção. Só ativa com AI_GATEWAY_URL + KEY.
 */
// Provider primário: the AI gateway na VPS (Ollama). Fallback: OpenRouter (nuvem,
// HA) — se a VPS cair, a feature de IA NÃO cai junto (#5 alta disponibilidade:
// remove o SPOF da VPS pro caminho de IA).
const AI_URL = process.env.AI_GATEWAY_URL; // OpenAI-compat (your-ai-gateway.example.com)
const AI_KEY = process.env.AI_GATEWAY_KEY;
const MODEL = process.env.AI_GATEWAY_MODEL || "qwen2.5:7b-instruct";
const OR_KEY = process.env.OPENROUTER_API_KEY;
const OR_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
export const aiFeatureEnabled = !!((AI_URL && AI_KEY) || OR_KEY);

async function call(base: string, key: string, model: string, messages: unknown[], ms: number): Promise<string> {
  const c = new AbortController();
  const to = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(`${base}/v1/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, temperature: 0.3, messages }),
      signal: c.signal,
    });
    if (!r.ok) throw new Error(`http ${r.status}`);
    const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
    return j.choices?.[0]?.message?.content || "";
  } finally { clearTimeout(to); }
}

export async function assist(opts: { task: string; input: string; system?: string }): Promise<{ ok: boolean; text?: string; reason?: string; via?: string }> {
  if (!aiFeatureEnabled) return { ok: false, reason: "ai off" };
  const inp = guardInput(opts.input);
  if (!inp.safe) { track("ai_blocked", { task: opts.task, risk: inp.risk }); return { ok: false, reason: "input inseguro" }; }
  const messages = [
    { role: "system", content: opts.system || `Você executa a tarefa "${opts.task}". Responda só o resultado, sem preâmbulo.` },
    { role: "user", content: inp.sanitized },
  ];
  // 1) tenta a VPS (primário); 2) cai pra OpenRouter (nuvem HA) se falhar/timeout
  let raw = "", via = "";
  if (AI_URL && AI_KEY) {
    try { raw = await call(AI_URL, AI_KEY, MODEL, messages, 12000); via = "ai-gateway"; }
    catch { /* failover abaixo */ }
  }
  if (!raw && OR_KEY) {
    try { raw = await call("https://openrouter.ai/api", OR_KEY, OR_MODEL, messages, 20000); via = "openrouter-fallback"; }
    catch (e) { return { ok: false, reason: `primário+fallback falharam: ${(e as Error).message}` }; }
  }
  if (!raw) return { ok: false, reason: "sem provider disponível" };
  const out = guardOutput(raw);
  track("ai_used", { task: opts.task, redacted: out.redacted, via }); // adoção + qual provider
  return { ok: true, text: out.text, via };
}
