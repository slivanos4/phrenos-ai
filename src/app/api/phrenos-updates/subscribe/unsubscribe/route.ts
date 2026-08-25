import { NextResponse } from "next/server";
import {
  errorResponse,
  isServiceRoleConfigured,
  unsubscribeByToken,
} from "@/lib/phrenos-updates";

export async function GET(request: Request) {
  try {
    if (!isServiceRoleConfigured()) {
      return NextResponse.redirect(new URL("/ai-updates", request.url));
    }

    const token = new URL(request.url).searchParams.get("token") ?? "";
    const ok = await unsubscribeByToken(token);
    const destination = new URL("/ai-updates", request.url);
    destination.searchParams.set("unsubscribed", ok ? "1" : "0");
    return NextResponse.redirect(destination);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not unsubscribe.";
    const { body, status } = errorResponse(message);
    return NextResponse.json(body, { status });
  }
}
