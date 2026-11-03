import { NextResponse } from "next/server";
import {
  AdminAuthError,
  clearAdminSession,
  clearPendingSession,
  createPendingSession,
  errorResponse,
  isAdminAuthConfigured,
  verifyAdminPassword,
  verifyAdminSession,
} from "@/lib/phrenos-updates";
import { isTwoStepEnrolled } from "@/lib/phrenos-updates/admin-security";

export async function GET(request: Request) {
  try {
    if (!isAdminAuthConfigured()) {
      return NextResponse.json({ authenticated: false, configured: false });
    }
    return NextResponse.json({
      authenticated: await verifyAdminSession(request),
      configured: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Auth check failed";
    const { body, status } = errorResponse(message);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: Request) {
  try {
    if (!isAdminAuthConfigured()) {
      return NextResponse.json(
        { error: "PHRENOS_ADMIN_PASSWORD is not configured on the server." },
        { status: 503 },
      );
    }

    const payload = (await request.json()) as { password?: string };
    if (!verifyAdminPassword(payload.password)) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }

    // The password alone no longer opens the admin. It earns a few minutes to enter the authenticator code.
    const enrolled = await isTwoStepEnrolled();
    const pending = await createPendingSession();
    const response = NextResponse.json({ step: enrolled ? "code" : "setup" });
    response.cookies.set(pending.name, pending.value, pending.options);
    return response;
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Sign in failed";
    const { body, status } = errorResponse(message);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE() {
  const cleared = clearAdminSession();
  const pending = clearPendingSession();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cleared.name, cleared.value, cleared.options);
  response.cookies.set(pending.name, pending.value, pending.options);
  return response;
}
