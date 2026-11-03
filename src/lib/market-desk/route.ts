import { NextResponse } from "next/server";
import { AdminAuthError, errorResponse, requireAdminSession } from "@/lib/phrenos-updates";

/** Wraps an admin-only handler with the session check and consistent errors. */
export async function adminJson(request: Request, handler: () => Promise<unknown>, status = 200): Promise<Response> {
  try {
    await requireAdminSession(request);
    return NextResponse.json(await handler(), { status });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Something went wrong";
    const { body, status: code } = errorResponse(message);
    return NextResponse.json(body, { status: code });
  }
}

export class BadRequest extends Error {}
