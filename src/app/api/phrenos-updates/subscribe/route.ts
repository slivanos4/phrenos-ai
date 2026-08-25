import { NextResponse } from "next/server";
import {
  errorResponse,
  isServiceRoleConfigured,
  isValidSubscriberEmail,
  subscribeToUpdates,
} from "@/lib/phrenos-updates";

export async function POST(request: Request) {
  try {
    if (!isServiceRoleConfigured()) {
      return NextResponse.json(
        { error: "Subscriptions are not configured yet." },
        { status: 503 }
      );
    }

    const body = (await request.json()) as {
      email?: string;
      source?: string;
      website?: string;
    };

    // Honeypot — bots fill this; real users never see it.
    if (body.website) {
      return NextResponse.json({ ok: true, alreadySubscribed: false });
    }

    if (typeof body.email !== "string" || !isValidSubscriberEmail(body.email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const result = await subscribeToUpdates({
      email: body.email,
      source: typeof body.source === "string" ? body.source : "ai-updates",
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save your subscription.";
    const { body, status } = errorResponse(message);
    return NextResponse.json(body, {
      status: message.startsWith("Please enter") ? 400 : status,
    });
  }
}
