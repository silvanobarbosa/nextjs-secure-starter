import { NextRequest, NextResponse } from "next/server";
import { billingEnabled, createCheckout } from "@/lib/billing";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * #2 Inicia o Checkout (assinatura). Exige sessão (o middleware já protege /api/*).
 * Body: { priceId }. Devolve { url } pra redirecionar ao Stripe.
 */
export async function POST(req: NextRequest) {
  if (!billingEnabled) return NextResponse.json({ error: "billing off" }, { status: 501 });
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { priceId } = (await req.json().catch(() => ({}))) as { priceId?: string };
  if (!priceId) return NextResponse.json({ error: "priceId obrigatório" }, { status: 400 });

  try {
    const url = await createCheckout({ priceId, userId: session.userId });
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
