import type { NextRequest } from "next/server";
import type { Role } from "@/lib/rbac";

/**
 * Auth minima do template — sessao por cookie assinado (stateless).
 * O factory troca a verificacao por Auth.js/Clerk/etc conforme o app,
 * mas a INTERFACE (getSession -> {userId, role}) fica estavel pra o RBAC
 * e o middleware nao precisarem mudar.
 */
export interface Session {
  userId: string;
  role: Role;
  adminVerified?: boolean; // 2ª prova p/ ações admin (dual-check no rbac.requireAdmin)
}

const COOKIE = "rl_session";
// TTL default do token = 7d (signToken). Re-autentique (novo token com adminVerified)
// antes de ações sensíveis (billing/export/admin) — não confie só na sessão longa.

/** Le a sessao do request. Retorna null se ausente/invalida (deny-by-default). */
export async function getSession(req: NextRequest): Promise<Session | null> {
  const raw = req.cookies.get(COOKIE)?.value;
  if (!raw) return null;
  return verifyToken(raw);
}

/** Assina uma sessao -> valor do cookie (`body.sig`, HMAC-SHA256). Usado no login. */
export async function signToken(session: Session, ttlMs = 7 * 864e5): Promise<string> {
  const body = btoa(JSON.stringify({ ...session, exp: Date.now() + ttlMs }));
  const sig = await hmac(body);
  return `${body}.${sig}`;
}

/** Verifica o token de sessao (HMAC). Troque a chave por env em prod. */
export async function verifyToken(token: string): Promise<Session | null> {
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;
    const expected = await hmac(body);
    if (!timingSafeEqual(sig, expected)) return null;
    const data = JSON.parse(atob(body)) as Session & { exp?: number };
    if (data.exp && Date.now() > data.exp) return null;
    return { userId: data.userId, role: data.role, adminVerified: data.adminVerified };
  } catch {
    return null;
  }
}

async function hmac(input: string): Promise<string> {
  const secret = process.env.SESSION_SECRET || "dev-only-change-me";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(input));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

/** Comparacao em tempo constante (evita timing attack na assinatura). */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
