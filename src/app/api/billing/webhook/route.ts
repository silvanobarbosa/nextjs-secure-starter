import { NextRequest, NextResponse } from "next/server";
import { billingEnabled, verifyWebhook } from "@/lib/billing";

export const dynamic = "force-dynamic";

/**
 * #2 Webhook do Stripe — atualiza a assinatura/entitlements do usuário.
 * Configure a URL no Stripe: /api/billing/webhook. Verifica a assinatura (anti-forja).
 * Rota liberada no rbac (Stripe chama sem sessão) — a segurança é a assinatura.
 */
export async function POST(req: NextRequest) {
  if (!billingEnabled) return NextResponse.json({ error: "billing off" }, { status: 501 });
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "no signature" }, { status: 400 });

  let event;
  try {
    event = verifyWebhook(await req.text(), sig);
  } catch (e) {
    return NextResponse.json({ error: `assinatura inválida: ${(e as Error).message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "customer.subscription.updated":
    case "customer.subscription.created":
      // TODO(app): mapear price/status → plano e gravar em users (userId = client_reference_id)
      break;
    case "customer.subscription.deleted":
      // TODO(app): rebaixar o usuário pro plano free
      break;
  }
  return NextResponse.json({ received: true });
}
