import { NextResponse } from "next/server";
import { ApiError, verifyToken } from "@/lib/market-desk/api-tokens";

export const API_NOTE = "Research only, not financial advice. Scores describe what price data shows and cannot predict the market. Data comes from CoinGecko, Yahoo Finance, Twelve Data and other sources, and can be delayed or wrong.";

/** Wraps a public API handler: token check, rate limit, consistent errors, and a research-not-advice note on every answer. */
export async function apiJson(request: Request, handler: () => Promise<Record<string, unknown>>): Promise<Response> {
  try {
    await verifyToken(request);
    const body = await handler();
    return NextResponse.json({ ...body, meta: { generated_at: new Date().toISOString(), note: API_NOTE } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
    const message = error instanceof Error ? error.message : "Something went wrong.";
    console.error("Market API error:", message);
    return NextResponse.json({ error: "The request could not be completed." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
