/**
 * RBAC deny-by-default. Roles hierarquicas: admin > editor > viewer.
 * Rotas publicas explicitas (whitelist) — tudo o mais exige sessao.
 */
export type Role = "admin" | "editor" | "viewer";

const RANK: Record<Role, number> = { viewer: 1, editor: 2, admin: 3 };

/** true se `role` satisfaz o minimo `required` (hierarquico). */
export function can(role: Role | undefined, required: Role): boolean {
  if (!role) return false;
  return RANK[role] >= RANK[required];
}

/**
 * Admin dual-check (defesa contra escalonamento por manipulação de campo):
 * exige role==admin E uma segunda flag (ex: verificada no banco/MFA), não só o
 * campo `role`. Use em ações destrutivas/privilegiadas.
 */
export function requireAdmin(session: { role?: Role; adminVerified?: boolean } | null): boolean {
  return !!session && session.role === "admin" && session.adminVerified === true;
}

/** Rotas acessiveis sem sessao. Deny-by-default: nada aqui = exige auth. */
const PUBLIC_PREFIXES = [
  "/login",
  // As rotas do better-auth SÃO o login. Exigir sessão para entrar é a porta trancada por dentro:
  // ninguém consegue autenticar, e o erro aparece como 401 numa tela que parece funcionar.
  "/api/auth",
  "/api/health",
  "/api/conformity",
  "/api/billing/webhook",
  "/_next",
  "/favicon.ico",
];

export function isPublic(path: string): boolean {
  // O prefixo casa no LIMITE do caminho, nunca no meio de uma palavra: com startsWith solto,
  // "/login" libera "/loginfalso" e "/api/cron" liberaria "/api/cronometro".
  return PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
}
