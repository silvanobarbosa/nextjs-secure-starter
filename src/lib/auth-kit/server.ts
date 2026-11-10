import { betterAuth, type BetterAuthPlugin } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins/magic-link";
import { emailOTP } from "better-auth/plugins/email-otp";
import { genericOAuth } from "better-auth/plugins/generic-oauth";
import { phoneNumber } from "better-auth/plugins/phone-number";
import { anonymous } from "better-auth/plugins/anonymous";
import { twoFactor } from "better-auth/plugins/two-factor";
import { passkey } from "@better-auth/passkey";

import { authDb } from "./db";
import { authSchema } from "./schema";
import { sendAuthEmail, sendPhoneOtp } from "./senders";
import { CATALOG_BY_ID, type AuthMethodId } from "./catalog";
import { DEFAULT_AUTH_CONFIG, type AuthConfig } from "./config";
import appCfg from "../../../auth.config";

/** true se o método está LIGADO no config E todos os env dele existem. */
function ready(cfg: AuthConfig, id: AuthMethodId): boolean {
  if (!cfg.methods[id]) return false;
  return CATALOG_BY_ID[id].env.every((k) => !!process.env[k]);
}

/** Origens confiáveis: BETTER_AUTH_URL + localhost dev. */
function trustedOrigins(): string[] {
  const set = new Set<string>(["http://localhost:3000", "http://localhost:3001"]);
  if (process.env.BETTER_AUTH_URL) set.add(process.env.BETTER_AUTH_URL.replace(/\/+$/, ""));
  return [...set];
}

/**
 * Monta uma instância better-auth com EXATAMENTE os métodos escolhidos no config
 * que também têm credenciais no env. Faltando env → o método é ignorado (nada quebra).
 */
export function buildAuth(cfg: AuthConfig) {
  const defaultRole = cfg.defaultRole || "viewer";

  // ---- social providers (só quando ligado E env presente) ----
  const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};
  const socialEnv: Record<"google" | "apple" | "github" | "microsoft", [string, string]> = {
    google: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"],
    apple: ["APPLE_CLIENT_ID", "APPLE_CLIENT_SECRET"],
    github: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
    microsoft: ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"],
  };
  for (const id of ["google", "apple", "github", "microsoft"] as const) {
    if (!ready(cfg, id)) continue;
    const [idKey, secretKey] = socialEnv[id];
    socialProviders[id] = {
      clientId: process.env[idKey]!,
      clientSecret: process.env[secretKey]!,
    };
  }

  // ---- plugins (cada um só entra se ligado E com env) ----
  const plugins: BetterAuthPlugin[] = [];

  if (ready(cfg, "magicLink")) {
    plugins.push(
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          await sendAuthEmail(email, "Seu link de acesso", `Entre: ${url}`);
        },
      }),
    );
  }
  if (ready(cfg, "emailOtp")) {
    plugins.push(
      emailOTP({
        sendVerificationOTP: async ({ email, otp }) => {
          await sendAuthEmail(email, "Seu código", `Código: ${otp}`);
        },
      }),
    );
  }
  if (ready(cfg, "passkey")) {
    plugins.push(
      passkey({
        rpName: process.env.APP_NAME || "Acme",
        rpID: process.env.PASSKEY_RP_ID || undefined,
        origin: process.env.BETTER_AUTH_URL || undefined,
      }),
    );
  }
  if (ready(cfg, "oidcSso")) {
    plugins.push(
      genericOAuth({
        config: [
          {
            providerId: "oidc",
            discoveryUrl: `${process.env.AUTHENTIK_ISSUER}/.well-known/openid-configuration`,
            clientId: process.env.AUTHENTIK_CLIENT_ID!,
            clientSecret: process.env.AUTHENTIK_CLIENT_SECRET!,
            scopes: ["openid", "email", "profile"],
          },
        ],
      }),
    );
  }
  if (ready(cfg, "phoneOtp")) {
    plugins.push(
      phoneNumber({
        sendOTP: async ({ phoneNumber: phone, code }) => {
          await sendPhoneOtp(phone, code);
        },
      }),
    );
  }
  if (ready(cfg, "anonymous")) {
    plugins.push(anonymous());
  }
  if (ready(cfg, "twoFactor")) {
    plugins.push(twoFactor());
  }
  // NOTA: sem organization() — o schema do kit não tem tabelas de org.

  // GUARD anti-login-less: se NENHUM método primário ficou pronto (ex: SSO ligado mas
  // AUTHENTIK_* ausente no preview), reabilita e-mail+senha pra o app nunca ficar sem login.
  const PRIMARY: AuthMethodId[] = ["google", "apple", "github", "microsoft", "magicLink", "emailOtp", "passkey", "oidcSso", "phoneOtp", "anonymous"];
  const anyPrimaryReady = !!cfg.methods.emailPassword || PRIMARY.some((id) => ready(cfg, id));
  const emailPwdEnabled = !!cfg.methods.emailPassword || !anyPrimaryReady;
  if (!anyPrimaryReady) console.warn("[auth-kit] nenhum método primário pronto (env?) — e-mail+senha reativado como fallback.");

  return betterAuth({
    database: drizzleAdapter(authDb, { provider: "pg", schema: authSchema }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    trustedOrigins: trustedOrigins(),
    emailAndPassword: {
      enabled: emailPwdEnabled,
      requireEmailVerification: !!cfg.requireEmailVerification,
    },
    socialProviders,
    user: {
      additionalFields: {
        // papel RBAC aplicado no cadastro; não aceito como input do cliente.
        role: {
          type: "string",
          required: false,
          defaultValue: defaultRole,
          input: false,
        },
      },
    },
    plugins,
  });
}

/** Config efetiva do app = base sã + escolha do auth.config.ts (raiz). */
const appAuthConfig: AuthConfig = {
  ...DEFAULT_AUTH_CONFIG,
  ...appCfg,
  methods: { ...DEFAULT_AUTH_CONFIG.methods, ...appCfg.methods },
};

/** Singleton pronto pra usar no app (route handler, session, etc.). */
export const auth = buildAuth(appAuthConfig);

export type Auth = typeof auth;
