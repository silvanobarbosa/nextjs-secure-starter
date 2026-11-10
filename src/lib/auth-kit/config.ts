import type { AuthMethodId } from "./catalog";

/**
 * Contrato de escolha por app. O factory/você marca o que o app oferece.
 * Um método só vale se: flag=true AQUI **e** as credenciais existirem no env
 * (o server.ts confere o env; nada quebra se faltar credencial).
 */
export type AuthConfig = {
  methods: Partial<Record<AuthMethodId, boolean>>;
  /** papel default de quem se cadastra. */
  defaultRole?: "admin" | "editor" | "viewer";
  /** exige verificar e-mail antes de logar (email+senha). */
  requireEmailVerification?: boolean;
};

/**
 * Padrão (optional, via env) = SSO-first: login com a conta Acme (Authentik) é o primário.
 * `emailPassword` fica ligado como fallback break-glass (se o SSO cair / usuário externo).
 * Cada app sobrescreve em `auth.config.ts` — apps comerciais podem desligar o SSO.
 */
export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  methods: { oidcSso: true, emailPassword: true },
  defaultRole: "viewer",
  requireEmailVerification: false,
};

/** Helper tipado p/ o `auth.config.ts` do app. */
export function defineAuth(cfg: AuthConfig): AuthConfig {
  return cfg;
}

/** Lista os métodos LIGADOS no config (ignora env — só a escolha). */
export function enabledMethods(cfg: AuthConfig): AuthMethodId[] {
  return (Object.keys(cfg.methods) as AuthMethodId[]).filter((m) => cfg.methods[m]);
}
