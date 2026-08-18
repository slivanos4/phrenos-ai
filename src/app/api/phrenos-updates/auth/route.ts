import { NextResponse } from "next/server";
import {
  AdminAuthError,
  clearAdminSession,
  createAdminSession,
  errorResponse,
  isAdminAuthConfigured,
  verifyAdminPassword,
  verifyAdminSession,
} from "@/lib/phrenos-updates";

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

    const session = await createAdminSession();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(session.name, session.value, session.options);
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
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cleared.name, cleared.value, cleared.options);
  return response;
}
