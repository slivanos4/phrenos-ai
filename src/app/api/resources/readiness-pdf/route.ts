import { NextResponse } from "next/server";
import { scoreReadiness } from "@/data/readiness-check";
import { buildReadinessPdf } from "@/lib/site/readiness-pdf";
import { tooManyRequests } from "@/lib/site/rate-limit";

/** A PDF copy of someone's own readiness result, built from their answers. Nothing is stored. */
export async function POST(request: Request) {
  const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (tooManyRequests(`readiness-pdf:${ip}`)) {
    return NextResponse.json({ error: "Too many tries. Please try again later." }, { status: 429 });
  }
  const body = (await request.json().catch(() => ({}))) as { answers?: Record<string, number> };
  if (!body.answers || typeof body.answers !== "object") {
    return NextResponse.json({ error: "Missing answers." }, { status: 400 });
  }
  const pdf = await buildReadinessPdf(scoreReadiness(body.answers));
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="AI-readiness-result.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
