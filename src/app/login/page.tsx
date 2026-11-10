import type { Metadata } from "next";
import AuthPanel from "@/components/AuthPanel";
import appCfg from "../../../auth.config";
import { DEFAULT_AUTH_CONFIG, enabledMethods } from "@/lib/auth-kit/config";

export const metadata: Metadata = { title: "Entrar — Acme App" };
export const dynamic = "force-dynamic";

/**
 * Login REAL do molde: renderiza o AuthPanel com os métodos marcados em auth.config.ts.
 * (Antes era um <form> stub que postava em /api/health e não logava ninguém — o app nascia
 * "com login" na aparência e sem login de fato.)
 */
const methods = enabledMethods({
  ...DEFAULT_AUTH_CONFIG,
  ...appCfg,
  methods: { ...DEFAULT_AUTH_CONFIG.methods, ...appCfg.methods },
});

export default function LoginPage() {
  return (
    <main className="shell">
      <div className="card">
        <span className="badge">acesso</span>
        <h1>Entrar</h1>
        <p>Autentique-se para continuar.</p>
        <AuthPanel methods={methods} />
      </div>
    </main>
  );
}
