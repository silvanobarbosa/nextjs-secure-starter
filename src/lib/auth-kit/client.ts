"use client";
import { createAuthClient } from "better-auth/react";
import {
  magicLinkClient,
  emailOTPClient,
  phoneNumberClient,
  anonymousClient,
  twoFactorClient,
} from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";

import { DEFAULT_AUTH_CONFIG, enabledMethods, type AuthConfig } from "./config";
import appCfg from "../../../auth.config";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ClientPlugin = any;

/**
 * Client better-auth com os plugins-cliente dos métodos ligados no config.
 * (No cliente não dá pra checar env do servidor — casamos só a ESCOLHA;
 *  o método que não tiver credencial no server simplesmente não responde.)
 */
export function buildAuthClient(cfg: AuthConfig) {
  const on = new Set(enabledMethods(cfg));
  const plugins: ClientPlugin[] = [];
  if (on.has("magicLink")) plugins.push(magicLinkClient());
  if (on.has("emailOtp")) plugins.push(emailOTPClient());
  if (on.has("passkey")) plugins.push(passkeyClient());
  // O cliente genérico de OAuth saiu do better-auth 1.7. OIDC SSO still works
  // pelo lado do servidor (genericOAuth em server.ts); o que não existe mais é o plugin do
  // cliente. Com o import morto aqui, o `tsc` do molde falha e todo app novo nasce quebrado.
  if (on.has("phoneOtp")) plugins.push(phoneNumberClient());
  if (on.has("anonymous")) plugins.push(anonymousClient());
  if (on.has("twoFactor")) plugins.push(twoFactorClient());

  return createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || undefined,
    plugins,
  });
}

/** Config efetiva do app = base sã + auth.config.ts (raiz). */
const appAuthConfig: AuthConfig = {
  ...DEFAULT_AUTH_CONFIG,
  ...appCfg,
  methods: { ...DEFAULT_AUTH_CONFIG.methods, ...appCfg.methods },
};

/** Singleton pronto pro browser. */
export const authClient = buildAuthClient(appAuthConfig);

export const { signIn, signUp, signOut, useSession } = authClient;
