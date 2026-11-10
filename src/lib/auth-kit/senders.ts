import { createMessaging } from "@/lib/messaging-client";

/**
 * Envio de e-mail/OTP do auth-kit. NUNCA lança — auth não pode quebrar por envio.
 * Ordem do e-mail: Resend (se RESEND_API_KEY) → gateway de mensageria (optional, via env) → warn.
 */

type EmailBody = { text?: string; html?: string };

/**
 * Envia um e-mail transacional (magic link, OTP, verificação).
 * Retorna true se algum canal aceitou o envio; false se caiu no warn.
 */
export async function sendAuthEmail(
  to: string,
  subject: string,
  body: EmailBody | string,
): Promise<boolean> {
  const text = typeof body === "string" ? body : body.text;
  const html = typeof body === "string" ? undefined : body.html;

  // (a) Resend — sem dep nova, via fetch.
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const from = process.env.EMAIL_FROM || "Acme <no-reply@example.com>";
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({ from, to, subject, text, html }),
      });
      if (r.ok) return true;
      console.warn(`[auth-kit] Resend falhou (${r.status}); tentando gateway.`);
    } catch (e) {
      console.warn("[auth-kit] Resend erro:", (e as Error).message);
    }
  }

  // (b) Gateway de mensageria (optional, via env) (canal e-mail).
  try {
    const gateway = (process.env.MESSAGING_GATEWAY || "https://example.com").replace(
      /\/+$/,
      "",
    );
    const r = await fetch(`${gateway}/api/messaging/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app: process.env.APP_SLUG || process.env.APP_NAME || "app",
        token: process.env.MESSAGING_TOKEN || "",
        channel: "email",
        to,
        subject,
        text: text ?? html ?? "",
      }),
    });
    if (r.ok) return true;
    console.warn(`[auth-kit] Gateway e-mail falhou (${r.status}).`);
  } catch (e) {
    console.warn("[auth-kit] Gateway e-mail erro:", (e as Error).message);
  }

  // (c) Nada configurado — não quebra o fluxo de auth.
  console.warn(`[auth-kit] Nenhum canal de e-mail configurado. Assunto: "${subject}" p/ ${to}.`);
  return false;
}

/**
 * Envia OTP de telefone via WhatsApp pelo gateway (optional, via env) (custo zero). Nunca lança.
 */
export async function sendPhoneOtp(phone: string, code: string): Promise<boolean> {
  try {
    const res = await createMessaging({
      app: process.env.APP_SLUG || "app",
      token: process.env.MESSAGING_TOKEN || "",
    }).whatsapp(phone, `Seu código: ${code}`);
    return !!res.ok;
  } catch (e) {
    console.warn("[auth-kit] sendPhoneOtp erro:", (e as Error).message);
    return false;
  }
}
