import { createHash, randomBytes } from "node:crypto";
import { createServiceRoleClient } from "@/lib/phrenos-updates/supabase";
import { T } from "@/lib/market-desk/store";

/**
 * Read-only API tokens for pulling Market Desk data into your own tools. Only a hash is stored, so a token can be shown once when it is
 * made and never again. Each token is limited to a steady number of requests a minute.
 */
export type TokenRow = { id: string; label: string; prefix: string; created_at: string; last_used_at: string | null; revoked_at: string | null };

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

function explain(message: string): Error {
  return new Error(/phrenos_market_api_tokens/.test(message) ? "The API tokens table is missing. Run supabase/migrations/012_market_pulse_dashboards_api.sql in Supabase." : message);
}

export async function createToken(label: string): Promise<{ token: string; row: TokenRow }> {
  const clean = label.trim().slice(0, 60);
  if (!clean) throw new Error("Give the token a name, such as the tool that will use it.");
  const token = `mdk_${randomBytes(32).toString("base64url")}`;
  const { data, error } = await createServiceRoleClient()
    .from(T.tokens)
    .insert({ label: clean, prefix: token.slice(0, 10), token_hash: hash(token) })
    .select("id, label, prefix, created_at, last_used_at, revoked_at")
    .single();
  if (error) throw explain(error.message);
  return { token, row: data as TokenRow };
}

export async function listTokens(): Promise<TokenRow[]> {
  const { data, error } = await createServiceRoleClient().from(T.tokens).select("id, label, prefix, created_at, last_used_at, revoked_at").order("created_at", { ascending: false });
  if (error) throw explain(error.message);
  return (data ?? []) as TokenRow[];
}

export async function revokeToken(id: string): Promise<void> {
  const { error } = await createServiceRoleClient().from(T.tokens).update({ revoked_at: new Date().toISOString() }).eq("id", id);
  if (error) throw explain(error.message);
}

const recent = new Map<string, number[]>();
const PER_MINUTE = 60;

/** Checks the bearer token on a request. Throws a 401 for a missing or revoked token and a 429 when it is used too fast. */
export async function verifyToken(request: Request): Promise<TokenRow> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token.startsWith("mdk_")) throw new ApiError("Send your token as: Authorization: Bearer mdk_...", 401);
  const db = createServiceRoleClient();
  const { data, error } = await db.from(T.tokens).select("id, label, prefix, created_at, last_used_at, revoked_at").eq("token_hash", hash(token)).maybeSingle();
  if (error) throw explain(error.message);
  if (!data || data.revoked_at) throw new ApiError("That token is not valid, or it has been revoked.", 401);

  const now = Date.now();
  const hits = (recent.get(data.id) ?? []).filter((time) => now - time < 60_000);
  if (hits.length >= PER_MINUTE) throw new ApiError(`Too many requests. The limit is ${PER_MINUTE} a minute.`, 429);
  hits.push(now);
  recent.set(data.id, hits);
  // Best effort: a failed timestamp update must never fail the request.
  void db.from(T.tokens).update({ last_used_at: new Date().toISOString() }).eq("id", data.id).then(() => undefined, () => undefined);
  return data as TokenRow;
}
