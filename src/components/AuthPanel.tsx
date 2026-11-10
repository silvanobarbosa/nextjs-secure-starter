"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth-kit/client";
import type { AuthMethodId } from "@/lib/auth-kit/catalog";

/**
 * Painel de login/cadastro que renderiza SÓ os métodos passados em `methods`.
 * Os métodos vêm de enabledMethods(appConfig) — o server decide o que existe de fato.
 * Tailwind puro, zero dep de UI. Foco: chamadas better-auth corretas.
 */

// Cliente com superfície ampla — o singleton só tipa os plugins da config default,
// mas o painel pode receber qualquer método; casamos numa interface permissiva.
type Res = Promise<{ error?: { message?: string } | null } | unknown>;
type Loose = {
  signIn: {
    email: (a: { email: string; password: string }) => Res;
    social: (a: { provider: string; callbackURL?: string }) => Res;
    oauth2: (a: { providerId: string; callbackURL?: string }) => Res;
    magicLink: (a: { email: string; callbackURL?: string }) => Res;
    emailOtp: (a: { email: string; otp: string }) => Res;
    passkey: () => Res;
    phoneNumber: (a: { phoneNumber: string; code: string }) => Res;
    anonymous: () => Res;
  };
  signUp: {
    email: (a: { email: string; password: string; name: string }) => Res;
  };
  emailOtp: {
    sendVerificationOtp: (a: { email: string; type: "sign-in" }) => Res;
  };
  phoneNumber: {
    sendOtp: (a: { phoneNumber: string }) => Res;
  };
};
const c = authClient as unknown as Loose;

const SOCIALS: { id: AuthMethodId; provider: string; label: string }[] = [
  { id: "google", provider: "google", label: "Google" },
  { id: "apple", provider: "apple", label: "Apple" },
  { id: "github", provider: "github", label: "GitHub" },
  { id: "microsoft", provider: "microsoft", label: "Microsoft" },
];

function errOf(r: unknown): string | null {
  const e = (r as { error?: { message?: string } | null })?.error;
  return e ? e.message || "Falhou" : null;
}

/**
 * Para onde ir depois de entrar.
 *
 * O portão da borda manda quem não tem sessão para `/login?next=<caminho>`. O destino é
 * conferido: precisa ser um caminho DESTE site — aceitar o que vier no endereço deixaria
 * qualquer um montar um link de login que joga a pessoa autenticada em outro domínio.
 */
function destinoDepoisDeEntrar(): string {
  if (typeof window === "undefined") return "/dashboard";
  const pedido = new URLSearchParams(window.location.search).get("next");
  if (!pedido) return "/dashboard";
  const local = pedido.startsWith("/") && !pedido.startsWith("//") && !pedido.startsWith("/\\");
  return local ? pedido : "/dashboard";
}

/**
 * Entrar de verdade.
 *
 * Navegação de página inteira, e não troca de rota no cliente: o cookie de sessão acabou de
 * nascer e as telas são renderizadas no servidor. Sem recarregar, a tela volta com o conteúdo de
 * quem ainda não tinha entrado — e o painel fica dizendo "Login efetuado" sem entrar.
 */
function entrar() {
  window.location.assign(destinoDepoisDeEntrar());
}

export default function AuthPanel({
  methods,
  mode: initialMode = "signin",
}: {
  methods: AuthMethodId[];
  mode?: "signin" | "signup";
}) {
  const has = (m: AuthMethodId) => methods.includes(m);
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // email + senha
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  // magic link
  const [mlEmail, setMlEmail] = useState("");
  // email otp
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  // phone otp
  const [phone, setPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneSent, setPhoneSent] = useState(false);

  async function run(fn: () => Res, ok?: string, navegar = false) {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fn();
      const e = errOf(r);
      setMsg(e ? `Erro: ${e}` : ok || "Pronto.");
      if (!e && navegar) entrar(); // login/criação OK → navegação de página inteira (cookie novo, telas no server)
      return !e;
    } catch (e) {
      setMsg(`Erro: ${(e as Error).message}`);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900";
  const btn =
    "w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50";
  const btnOutline =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-medium disabled:opacity-50";

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
      {/* Acme SSO — login primário (optional, via env) (SSO-first) */}
      {has("oidcSso") && (
        <>
          <button
            className={btn}
            disabled={busy}
            onClick={() => void run(() => c.signIn.oauth2({ providerId: "oidc" }))}
          >
            Entrar com a conta Acme
          </button>
          {(has("emailPassword") || methods.length > 1) && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="h-px flex-1 bg-gray-200" /> ou <span className="h-px flex-1 bg-gray-200" />
            </div>
          )}
        </>
      )}

      {/* email + senha */}
      {has("emailPassword") && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(
              () =>
                mode === "signup"
                  ? c.signUp.email({ email, password, name })
                  : c.signIn.email({ email, password }),
              mode === "signup" ? "Conta criada." : "Login efetuado.",
              true,
            );
          }}
        >
          {mode === "signup" && (
            <input
              className={input}
              placeholder="Nome" aria-label="Nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <input
            className={input}
            type="email"
            placeholder="E-mail" aria-label="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            className={input}
            type="password"
            placeholder="Senha" aria-label="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
          <button className={btn} disabled={busy} type="submit">
            {mode === "signup" ? "Criar conta" : "Entrar"}
          </button>
        </form>
      )}

      {/* social */}
      {SOCIALS.filter((s) => has(s.id)).map((s) => (
        <button
          key={s.id}
          className={btnOutline}
          disabled={busy}
          onClick={() => void run(() => c.signIn.social({ provider: s.provider }))}
        >
          Continuar com {s.label}
        </button>
      ))}

      {/* passkey */}
      {has("passkey") && (
        <button
          className={btnOutline}
          disabled={busy}
          onClick={() => void run(() => c.signIn.passkey(), "Autenticado.", true)}
        >
          Entrar com biometria / passkey
        </button>
      )}

      {/* magic link */}
      {has("magicLink") && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => c.signIn.magicLink({ email: mlEmail }), "Link enviado ao e-mail.");
          }}
        >
          <input
            className={input}
            type="email"
            placeholder="E-mail p/ link mágico" aria-label="E-mail para o link mágico"
            value={mlEmail}
            onChange={(e) => setMlEmail(e.target.value)}
          />
          <button className={btnOutline} disabled={busy} type="submit">
            Enviar link mágico
          </button>
        </form>
      )}

      {/* email OTP */}
      {has("emailOtp") && (
        <div className="flex flex-col gap-2">
          <input
            className={input}
            type="email"
            placeholder="E-mail p/ código" aria-label="E-mail para o código"
            value={otpEmail}
            onChange={(e) => setOtpEmail(e.target.value)}
          />
          {!otpSent ? (
            <button
              className={btnOutline}
              disabled={busy}
              onClick={async () => {
                const ok = await run(
                  () => c.emailOtp.sendVerificationOtp({ email: otpEmail, type: "sign-in" }),
                  "Código enviado.",
                );
                if (ok) setOtpSent(true);
              }}
            >
              Enviar código
            </button>
          ) : (
            <>
              <input
                className={input}
                placeholder="Código de 6 dígitos" aria-label="Código de 6 dígitos"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
              />
              <button
                className={btn}
                disabled={busy}
                onClick={() =>
                  void run(
                    () => c.signIn.emailOtp({ email: otpEmail, otp: otpCode }),
                    "Login efetuado.",
                    true,
                  )
                }
              >
                Verificar código
              </button>
            </>
          )}
        </div>
      )}

      {/* phone OTP (WhatsApp) */}
      {has("phoneOtp") && (
        <div className="flex flex-col gap-2">
          <input
            className={input}
            placeholder="Telefone (ex 5511999998888)" aria-label="Telefone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          {!phoneSent ? (
            <button
              className={btnOutline}
              disabled={busy}
              onClick={async () => {
                const ok = await run(
                  () => c.phoneNumber.sendOtp({ phoneNumber: phone }),
                  "Código enviado por WhatsApp.",
                );
                if (ok) setPhoneSent(true);
              }}
            >
              Enviar código por WhatsApp
            </button>
          ) : (
            <>
              <input
                className={input}
                placeholder="Código recebido" aria-label="Código recebido"
                value={phoneCode}
                onChange={(e) => setPhoneCode(e.target.value)}
              />
              <button
                className={btn}
                disabled={busy}
                onClick={() =>
                  void run(
                    () => c.signIn.phoneNumber({ phoneNumber: phone, code: phoneCode }),
                    "Login efetuado.",
                    true,
                  )
                }
              >
                Verificar código
              </button>
            </>
          )}
        </div>
      )}

      {/* anônimo / convidado */}
      {has("anonymous") && (
        <button
          className={btnOutline}
          disabled={busy}
          onClick={() => void run(() => c.signIn.anonymous(), "Entrou como convidado.", true)}
        >
          Entrar como convidado
        </button>
      )}

      {msg && <p className="text-center text-sm text-gray-600">{msg}</p>}

      {has("emailPassword") && (
        <button
          type="button"
          className="text-center text-xs text-gray-500 underline"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setMsg(null);
          }}
        >
          {mode === "signin" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
        </button>
      )}
    </div>
  );
}
