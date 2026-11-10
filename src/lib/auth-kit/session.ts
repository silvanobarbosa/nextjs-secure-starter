import type { Session } from "@/lib/auth";
import type { Role } from "@/lib/rbac";
import { auth } from "./server";

/**
 * Ponte better-auth → a MESMA interface Session do template ({userId, role, adminVerified}).
 * Deny-by-default: qualquer erro/sessão ausente vira null. Uso server-side (headers).
 *
 *   import { getSession } from "@/lib/auth-kit/session";
 *   const s = await getSession(req.headers); // ou headers() do next/headers
 */
export async function getSession(headers: Headers): Promise<Session | null> {
  try {
    const res = await auth.api.getSession({ headers });
    if (!res?.user) return null;
    const raw = (res.user as { role?: string }).role;
    const role: Role = raw === "admin" || raw === "editor" ? raw : "viewer";
    // adminVerified = 2ª prova; espelha 2FA habilitado (não confie só no campo role).
    const adminVerified = !!(res.user as { twoFactorEnabled?: boolean }).twoFactorEnabled;
    return { userId: res.user.id, role, adminVerified };
  } catch {
    return null;
  }
}
