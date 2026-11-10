import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth-kit/server";

/**
 * Handler catch-all do better-auth (auth-kit). Serve todas as rotas /api/auth/*.
 * Os métodos ativos vêm de auth.config.ts (raiz) + env presente no server.
 */
export const { GET, POST } = toNextJsHandler(auth);
