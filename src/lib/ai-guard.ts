/**
 * Guardrails de IA em runtime (defesa em profundidade — OWASP LLM Top 10).
 * Envolva TODA chamada a LLM: guardInput antes, guardOutput depois.
 * Determinístico (regex/heurística) — NÃO substitui o guardrail do provider,
 * mas fecha o básico sem custo/latência de modelo:
 *   - LLM01 (prompt injection / jailbreak): detecta padrões conhecidos no input
 *   - LLM02 (sensitive info disclosure) + LLM05 (output handling): redige PII/segredo na saída
 *
 * Uso:
 *   const inp = guardInput(userText);            // { safe, risk?, sanitized }
 *   if (!inp.safe) return recuse();              // ou logue e siga com cautela
 *   const raw = await llm(inp.sanitized);
 *   return guardOutput(raw).text;                // PII/segredo redigidos
 */

export interface InputVerdict {
  safe: boolean;
  risk: string | null; // rótulo do padrão que disparou
  sanitized: string;
}

// Padrões de injeção/jailbreak (indireta ou direta). Amplie conforme aprender.
const INJECTION = [
  /ignore (all|any|the)?\s*(previous|prior|above)\s+(instructions?|prompts?)/i,
  /disregard (the )?(system|previous) (prompt|message|instructions?)/i,
  /you are now\s+(?!a helpful)/i,
  /\b(DAN|do anything now|developer mode|jailbreak)\b/i,
  /reveal (your )?(system prompt|instructions|hidden)/i,
  /pretend (you are|to be)\b/i,
  /(new|updated) (system )?instructions?:/i,
  /override (the )?(safety|guard|rules?)/i,
];

/** Valida o input do usuário antes de mandar pro LLM. */
export function guardInput(text: string): InputVerdict {
  const t = String(text ?? "");
  for (const re of INJECTION) {
    if (re.test(t)) return { safe: false, risk: re.source.slice(0, 40), sanitized: t };
  }
  return { safe: true, risk: null, sanitized: t };
}

export interface OutputResult {
  text: string;
  redacted: number; // quantos trechos foram redigidos
  kinds: string[];
}

// PII + segredos comuns (BR + genéricos). Redige antes de devolver ao usuário/logar.
const REDACTORS: { kind: string; re: RegExp }[] = [
  { kind: "email", re: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g },
  { kind: "cpf", re: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g },
  { kind: "cnpj", re: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g },
  { kind: "phone", re: /\b(?:\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}-?\d{4}\b/g },
  { kind: "credit-card", re: /\b(?:\d[ -]?){13,16}\b/g },
  { kind: "secret", re: /\b(sk-[a-zA-Z0-9]{16,}|ghp_[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16}|npg_[a-zA-Z0-9]{10,}|Bearer\s+[a-zA-Z0-9._-]{20,})\b/g },
  { kind: "pg-uri", re: /postgres(?:ql)?:\/\/[^\s"']+/gi },
];

/** Redige PII/segredo da saída do LLM antes de expor. */
export function guardOutput(text: string): OutputResult {
  let out = String(text ?? "");
  const kinds = new Set<string>();
  let redacted = 0;
  for (const { kind, re } of REDACTORS) {
    out = out.replace(re, () => { redacted++; kinds.add(kind); return `[${kind} redigido]`; });
  }
  return { text: out, redacted, kinds: [...kinds] };
}
