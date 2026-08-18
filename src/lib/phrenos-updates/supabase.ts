import { createClient } from "@supabase/supabase-js";

export function getSupabaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "").trim();
}

export function getServiceRoleKey(): string {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
}

export function isServiceRoleConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getServiceRoleKey());
}

/** Server-only client. The service role key bypasses RLS, never expose it to the browser. */
export function createServiceRoleClient() {
  const url = getSupabaseUrl();
  const key = getServiceRoleKey();

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL is required for Phrenos updates.");
  }
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for Phrenos updates.");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
