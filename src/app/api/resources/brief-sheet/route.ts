import { NextResponse } from "next/server";
import {
  BRIEF_ACCESS_DAYS,
  BRIEF_COOKIE,
  createAccessCookieValue,
} from "@/lib/site/brief-access";
import { WEB3FORMS_ACCESS_KEY } from "@/lib/site/web3forms-key";
import {
  isServiceRoleConfigured,
  isValidSubscriberEmail,
  subscribeToUpdates,
} from "@/lib/phrenos-updates";

// Best effort on serverless: stops one visitor hammering the form from one instance.
const recent = new Map<string, number[]>();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 8;

function tooMany(ip: string): boolean {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((time) => now - time < WINDOW_MS);
  hits.push(now);
  recent.set(ip, hits);
  return hits.length > MAX_PER_WINDOW;
}

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
  if (tooMany(ip)) {
    return NextResponse.json({ error: "Too many tries. Please try again later." }, { status: 429 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!isValidSubscriberEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const cookieValue = createAccessCookieValue();
  if (!cookieValue) {
    return NextResponse.json({ error: "The download is not set up yet. Please email hello@phrenosai.com." }, { status: 503 });
  }

  // Tell Sophia about the lead. A hiccup here must not stop the person getting their download.
  try {
    await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: "Phrenos.ai lead: Cheat sheet: How to Brief AI Like a Strategist",
        from_name: "Phrenos.ai website",
        email,
        source: "Cheat sheet: How to Brief AI Like a Strategist",
        newsletter_opt_in: body.optIn ? "yes" : "no",
      }),
    });
  } catch (error) {
    console.error("brief-sheet: lead notification failed:", error);
  }

  if (body.optIn && isServiceRoleConfigured()) {
    try {
      await subscribeToUpdates({ email, source: "cheat-sheet" });
    } catch (error) {
      console.error("brief-sheet: newsletter signup failed:", error);
    }
  }

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
