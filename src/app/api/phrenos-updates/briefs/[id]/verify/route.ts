import { NextResponse } from "next/server";
import {
  AdminAuthError,
  errorResponse,
  requireAdminSession,
  verifyWeeklyBrief,
} from "@/lib/phrenos-updates";

export const maxDuration = 120;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession(request);
    const { id } = await context.params;
    const brief = await verifyWeeklyBrief(id);
    return NextResponse.json({ brief });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to verify weekly brief";
    const status = message === "Brief not found." ? 404 : 500;
    const { body, status: mapped } = errorResponse(message);
    return NextResponse.json(body, { status: status === 500 ? mapped : status });
  }
}
