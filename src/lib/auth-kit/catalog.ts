/**
 * CATÁLOGO DE MÉTODOS DE LOGIN do design system.
 * Bandeja única, sempre disponível. Cada app liga os que quiser em `auth.config.ts`.
 * Um método só entra em cena se: (a) ligado no config E (b) as credenciais existem no env.
 * `kind`: primary = método de entrada · factor = 2º fator/segurança · convenience = atalho.
 */
export type AuthMethodId =
  | "emailPassword"
  | "google"
  | "magicLink"
  | "emailOtp"
  | "passkey"
  | "oidcSso"
  | "apple"
  | "github"
  | "microsoft"
  | "phoneOtp"
  | "telegram"
  | "anonymous"
  | "twoFactor";

export type AuthMethod = {
  id: AuthMethodId;
  label: string;
  kind: "primary" | "factor" | "convenience";
  /** env exigidos p/ ativar de fato (além do flag no config). */
  env: string[];
  note: string;
};

export const AUTH_CATALOG: AuthMethod[] = [
  { id: "emailPassword", label: "E-mail + senha", kind: "primary", env: [], note: "Clássico. Ligado por padrão." },
  { id: "google", label: "Google", kind: "primary", env: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"], note: "OAuth social. Redirect /api/auth/callback/google." },
  { id: "magicLink", label: "Magic link", kind: "primary", env: [], note: "Link mágico no e-mail, sem senha. Usa o gateway de e-mail (optional, via env)." },
  { id: "emailOtp", label: "Código no e-mail (OTP)", kind: "primary", env: [], note: "Código de 6 dígitos no e-mail. Serve p/ login e verificação." },
  { id: "passkey", label: "Biometria / Passkey", kind: "primary", env: [], note: "WebAuthn — Face/Touch/digital do celular. Sem senha, à prova de phishing." },
  { id: "oidcSso", label: "Login com Acme (SSO)", kind: "primary", env: ["AUTHENTIK_CLIENT_ID", "AUTHENTIK_CLIENT_SECRET", "AUTHENTIK_ISSUER"], note: "Any OIDC IdP (e.g. Authentik). One login for everything." },
  { id: "apple", label: "Apple", kind: "primary", env: ["APPLE_CLIENT_ID", "APPLE_CLIENT_SECRET"], note: "Obrigatório se virar app iOS na store." },
  { id: "github", label: "GitHub", kind: "primary", env: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"], note: "Apps dev." },
  { id: "microsoft", label: "Microsoft", kind: "primary", env: ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"], note: "Apps corporativos (Entra ID)." },
  { id: "phoneOtp", label: "Telefone / WhatsApp OTP", kind: "primary", env: [], note: "Código via NOSSO gateway WhatsApp (custo zero). Fallback SMS." },
  { id: "telegram", label: "Telegram Login", kind: "convenience", env: ["TELEGRAM_BOT_TOKEN"], note: "1 clique via bot (optional, via env)." },
  { id: "anonymous", label: "Convidado / anônimo", kind: "convenience", env: [], note: "Entra sem cadastro e vira conta depois." },
  { id: "twoFactor", label: "2FA (TOTP)", kind: "factor", env: [], note: "2º fator opcional. Complementa qualquer método primário." },
];

export const CATALOG_BY_ID: Record<AuthMethodId, AuthMethod> = Object.fromEntries(
  AUTH_CATALOG.map((m) => [m.id, m]),
) as Record<AuthMethodId, AuthMethod>;
