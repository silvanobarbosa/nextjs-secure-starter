import { NextResponse } from "next/server";
import conformity from "../../../../conformity.json";

export const dynamic = "force-dynamic";

/**
 * Reporta o baseline que ESTE app cumpre (versao do template + capacidades).
 * O drift-check (optional, via env) (fleet-conformance) le isto + os headers live e
 * compara com o manifesto do template. Se divergiu -> NC no /qa.
 */
export function GET() {
  return NextResponse.json({
    templateVersion: conformity.templateVersion,
    baseline: conformity.baseline,
    app: process.env.APP_NAME || "my-app",
    reportedAt: new Date().toISOString(),
  });
}
