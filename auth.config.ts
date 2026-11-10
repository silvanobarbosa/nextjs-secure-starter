import { defineAuth } from "@/lib/auth-kit/config";

/**
 * ESCOLHA DE LOGIN DESTE APP. Marque true/false por método.
 * Menu completo em src/lib/auth-kit/catalog.ts. Um método só entra em cena
 * se ligado aqui E com credenciais no env (nada quebra se faltar).
 *
 * O factory preenche isto na criação/revisão conforme você escolher.
 */
export default defineAuth({
  methods: {
    oidcSso: true,   // ⭐ SSO-first default (OIDC/Authentik)
    emailPassword: true,   // fallback break-glass (SSO fora / usuário externo) — desligue em app 100% SSO
    google: false,         // OAuth Google
    magicLink: false,      // link mágico no e-mail
    emailOtp: false,       // código de 6 dígitos no e-mail
    passkey: false,        // biometria (Face/Touch/digital)
    apple: false,          // Apple (obrigatório p/ iOS store)
    github: false,         // GitHub
    microsoft: false,      // Microsoft / Entra
    phoneOtp: false,       // OTP via WhatsApp/SMS
    telegram: false,       // Telegram login
    anonymous: false,      // convidado → vira conta
    twoFactor: false,      // 2º fator TOTP
  },
  defaultRole: "viewer",
  requireEmailVerification: false,
});
