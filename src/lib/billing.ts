import "server-only";
import Stripe from "stripe";

/**
 * #2 Kit de monetização (Stripe) — OPT-IN. Só ativa se STRIPE_SECRET_KEY estiver
 * setado (apps que VENDEM; app interno não precisa). Assinaturas + checkout +
 * portal + webhook + entitlements. Preço 2026: $19–29/mês é o sweet spot indie,
 * anual com 15–20% de desconto.
 *
 * Envs: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_APP_URL.
 */
export const billingEnabled = !!process.env.STRIPE_SECRET_KEY;

function client(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY não setado (billing desativado)");
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

/** Plano → features liberadas (entitlements). Ajuste ao produto. */
export const PLANS = {
  free: { features: ["core"] },
  pro: { features: ["core", "export", "ai", "priority"] },
  team: { features: ["core", "export", "ai", "priority", "seats", "sso"] },
} as const;
export type Plan = keyof typeof PLANS;

export function planHasFeature(plan: Plan | undefined, feature: string): boolean {
  if (!plan) return PLANS.free.features.includes(feature as never);
  return (PLANS[plan]?.features as readonly string[]).includes(feature);
}

/** Cria uma sessão de Checkout (assinatura) e devolve a URL. */
export async function createCheckout(opts: { priceId: string; customerEmail?: string; userId: string }): Promise<string> {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const s = await client().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: opts.priceId, quantity: 1 }],
    customer_email: opts.customerEmail,
    client_reference_id: opts.userId,
    allow_promotion_codes: true,
    success_url: `${base}/billing/ok?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/billing`,
  });
  return s.url!;
}

/** Portal do cliente (gerenciar/cancelar assinatura). */
export async function createPortal(customerId: string): Promise<string> {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const p = await client().billingPortal.sessions.create({ customer: customerId, return_url: `${base}/billing` });
  return p.url;
}

/** Verifica a assinatura do webhook (à prova de forja). */
export function verifyWebhook(payload: string, signature: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET não setado");
  return client().webhooks.constructEvent(payload, signature, secret);
}
