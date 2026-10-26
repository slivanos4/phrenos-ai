import { NextResponse } from "next/server";
import { processLead, validateLead, type LeadInput } from "@/lib/site/leads";
import { tooManyRequests } from "@/lib/site/rate-limit";

/** The contact form and the readiness check post here. The cheat sheet has its own route because it also sets a cookie. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Partial<LeadInput> & { website?: string };

  // Honeypot: bots fill the hidden field. Pretend it worked, but do nothing.
  if (body.website) return NextResponse.json({ ok: true });

  const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (tooManyRequests(`leads:${ip}`)) {
    return NextResponse.json({ error: "Too many tries. Please try again later." }, { status: 429 });
  }

  const checked = validateLead(body);
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
  if (checked.lead.source === "cheat-sheet") {
    return NextResponse.json({ error: "Unknown form." }, { status: 400 });
  }

  await processLead(checked.lead);
  return NextResponse.json({ ok: true });
}
