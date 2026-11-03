import { NextResponse } from "next/server";
import QRCode from "qrcode";
import {
  AdminAuthError,
  clearPendingSession,
  createAdminSession,
  errorResponse,
  verifyPendingSession,
} from "@/lib/phrenos-updates";
import {
  beginEnrolment,
  checkCode,
  isTwoStepEnrolled,
  readEnrolmentSecret,
} from "@/lib/phrenos-updates/admin-security";
import { otpauthUri } from "@/lib/phrenos-updates/totp";

async function requirePending(request: Request) {
  if (!(await verifyPendingSession(request))) {
    throw new AdminAuthError("Enter your password first.", 401);
  }
}

/** First-time setup: returns a QR code and key for the authenticator app. Only before enrolment, only after the password. */
export async function GET(request: Request) {
  try {
    await requirePending(request);
    if (await isTwoStepEnrolled()) {
      return NextResponse.json({ error: "Two-step sign in is already set up." }, { status: 409 });
    }
    const secret = (await readEnrolmentSecret()) ?? (await beginEnrolment());
    const uri = otpauthUri(secret, "Admin", "Phrenos.ai");
    const qr = await QRCode.toDataURL(uri, { margin: 1, width: 224 });
    return NextResponse.json({ qr, key: secret });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Could not start setup";
    const { body, status } = errorResponse(message);
    return NextResponse.json(body, { status });
  }
}

/** Checks the 6-digit code. Completes setup the first time, and opens the admin session every time. */
export async function POST(request: Request) {
  try {
    await requirePending(request);
    const payload = (await request.json()) as { code?: string };
    const result = await checkCode(String(payload.code ?? ""));

    if (!result.ok) {
      if (result.reason === "locked") {
        return NextResponse.json(
          { error: `Too many wrong codes. Try again in ${result.retryAfterMinutes} minutes.` },
          { status: 429 },
        );
      }
      if (result.reason === "not-started") {
        return NextResponse.json({ error: "Reload the page to start setup." }, { status: 409 });
      }
      return NextResponse.json({ error: "That code is not right. Try the current one." }, { status: 401 });
    }

    const session = await createAdminSession();
    const cleared = clearPendingSession();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(session.name, session.value, session.options);
    response.cookies.set(cleared.name, cleared.value, cleared.options);
    return response;
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Code check failed";
    const { body, status } = errorResponse(message);
    return NextResponse.json(body, { status });
  }
}
