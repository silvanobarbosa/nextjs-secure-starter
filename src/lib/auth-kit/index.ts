/**
 * auth-kit — barrel público. Ligue métodos em auth.config.ts (raiz).
 * Server: `auth`, `buildAuth`, `getSession`. Client: `authClient` + helpers.
 */

// menu de métodos + contrato de config
export * from "./catalog";
export * from "./config";

// server (Node/edge server-only)
export { auth, buildAuth, type Auth } from "./server";
export { getSession } from "./session";

// client (browser)
export { authClient, buildAuthClient, signIn, signUp, signOut, useSession } from "./client";
