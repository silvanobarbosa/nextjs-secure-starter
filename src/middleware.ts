import { NextRequest, NextResponse } from "next/server";
import { isPublic } from "@/lib/rbac";
import { getSessionCookie } from "better-auth/cookies";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { immuneCheck } from "@/lib/immune-client";

/**
 * Middleware = 1o portao de seguranca (defesa em profundidade):
 *  - CSP com nonce por request (bloqueia XSS/inline nao autorizado)
 *  - headers de seguranca (o next.config repete os estaticos)
 *  - gate de auth deny-by-default: rota nao-publica sem sessao -> 401/redirect
 */
export async function middleware(req: NextRequest) {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const path = req.nextUrl.pathname;

  // rate-limit: login apertado (anti brute-force) + API padrao (anti-abuso).
  // /api/health e /api/conformity ficam de fora (monitor (optional, via env) bate neles).
  const ip = clientIp(req);

  // sistema imunológico (optional, via env): barra IP fichado por qualquer app + detecta ataque.
  // No-op sem IMMUNE_HUB_URL. Antes do rate-limit (atacante fichado nem consome quota).
  const immune = await immuneCheck({ ip, path: path + req.nextUrl.search, ua: req.headers.get("user-agent") || "" }, Date.now());
  if (immune.block) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let rl: Awaited<ReturnType<typeof rateLimit>> | null = null;
  // O freio apertado precisa cobrir o endereço REAL do login: a tela é /login, mas quem confere
  // a senha é /api/auth/sign-in/email. Olhando só para a tela, adivinhar senha cai no freio de
  // API — cem tentativas por minuto. get-session fica de fora: o app pergunta por ela o tempo
  // todo, e apertá-la deslogaria gente inocente no meio do trabalho.
  const tentativaDeEntrar =
    req.method === "POST" &&
    (path === "/login" ||
      path.startsWith("/api/auth/sign-in") ||
      path.startsWith("/api/auth/sign-up") ||
      path.startsWith("/api/auth/forget-password") ||
      path.startsWith("/api/auth/reset-password") ||
      path.startsWith("/api/auth/two-factor"));
  if (tentativaDeEntrar) rl = await rateLimit(ip, "login");
  else if (path.startsWith("/api/") && !path.startsWith("/api/health") && !path.startsWith("/api/conformity")) rl = await rateLimit(ip, "api");
  if (rl && !rl.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(rl.resetSec) } });
  }

  // deny-by-default: so passa quem e publico OU tem sessao
  if (!isPublic(path)) {
    const session = getSessionCookie(req);
    if (!session) {
      const isApi = path.startsWith("/api/");
      if (isApi) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }
  }

  const res = NextResponse.next({ request: { headers: withNonce(req.headers, nonce) } });
  const csp = [
    `default-src 'self'`,
    // Sem nonce: o Next 16 NÃO carimba nonce nos scripts que ele mesmo emite — conferido no HTML
    // servido. Com 'strict-dynamic' o navegador ignora o 'self' e recusa o app inteiro: a página
    // renderiza e nada funciona (é também o que derruba o Lighthouse com NO_FCP). Protege contra
    // script de fora; não protege contra inline injetado. Voltar ao nonce quando o Next carimbar.
    `script-src 'self' 'unsafe-inline'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self'`,
    `connect-src 'self'`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join("; ");
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("x-nonce", nonce);
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  );
  return res;
}

function withNonce(h: Headers, nonce: string) {
  const n = new Headers(h);
  n.set("x-nonce", nonce);
  return n;
}

export const config = {
  // roda em tudo menos assets estaticos
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
