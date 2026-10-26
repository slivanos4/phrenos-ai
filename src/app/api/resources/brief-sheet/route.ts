import { NextResponse } from "next/server";
import {
  BRIEF_ACCESS_DAYS,
  BRIEF_COOKIE,
  createAccessCookieValue,
} from "@/lib/site/brief-access";
import { processLead, validateLead } from "@/lib/site/leads";
import { tooManyRequests } from "@/lib/site/rate-limit";

/** Someone gives their email; the server records the lead and opens the cheat sheet for this browser. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    optIn?: boolean;
    website?: string;
  };

  // Honeypot: bots fill the hidden field. Pretend it worked, but give them nothing.
  if (body.website) return NextResponse.json({ ok: true });

  const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (tooManyRequests(`brief:${ip}`)) {
    return NextResponse.json({ error: "Too many tries. Please try again later." }, { status: 429 });
  }

  const checked = validateLead({ source: "cheat-sheet", email: body.email, optIn: body.optIn });
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });

  const cookieValue = createAccessCookieValue();
  if (!cookieValue) {
    return NextResponse.json({ error: "The download is not set up yet. Please email hello@phrenosai.com." }, { status: 503 });
  }

  // Save the lead, tell Sophia, honour the newsletter tick box and send the confirmation email.
  await processLead(checked.lead);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(BRIEF_COOKIE, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/resources/brief-sheet",
    maxAge: BRIEF_ACCESS_DAYS * 86_400,
  });
  return response;
}
