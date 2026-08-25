import { createServiceRoleClient } from "@/lib/phrenos-updates/supabase";
import { SUBSCRIBERS_TABLE } from "@/lib/phrenos-updates/tables";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SubscribeResult = {
  ok: true;
  alreadySubscribed: boolean;
};

function siteOrigin(): string {
  const configured = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    ""
  ).trim();
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, "")}`;
  }
  return "https://phrenosai.com";
}

export function normalizeSubscriberEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidSubscriberEmail(email: string): boolean {
  const normalized = normalizeSubscriberEmail(email);
  return normalized.length <= 254 && EMAIL_RE.test(normalized);
}

/** Store or re-activate a subscriber. Idempotent for active emails. */
export async function subscribeToUpdates(input: {
  email: string;
  source?: string;
}): Promise<SubscribeResult> {
  const email = input.email.trim();
  const email_normalized = normalizeSubscriberEmail(email);
  if (!isValidSubscriberEmail(email)) {
    throw new Error("Please enter a valid email address.");
  }

  const source = (input.source || "ai-updates").trim().slice(0, 80) || "ai-updates";
  const supabase = createServiceRoleClient();

  const { data: existing, error: existingError } = await supabase
    .from(SUBSCRIBERS_TABLE)
    .select("id, status")
    .eq("email_normalized", email_normalized)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  if (existing) {
    if (existing.status === "active") {
      return { ok: true, alreadySubscribed: true };
    }

    const { error: reactivateError } = await supabase
      .from(SUBSCRIBERS_TABLE)
      .update({
        email,
        status: "active",
        source,
        unsubscribed_at: null,
      })
      .eq("id", existing.id);

    if (reactivateError) throw new Error(reactivateError.message);
    return { ok: true, alreadySubscribed: false };
  }

  const { error: insertError } = await supabase.from(SUBSCRIBERS_TABLE).insert({
    email,
    email_normalized,
    status: "active",
    source,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return { ok: true, alreadySubscribed: true };
    }
    throw new Error(insertError.message);
  }

  return { ok: true, alreadySubscribed: false };
}

export async function listActiveSubscriberEmails(): Promise<
  { email: string; unsubscribe_token: string }[]
> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from(SUBSCRIBERS_TABLE)
    .select("email, unsubscribe_token")
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    email: String(row.email),
    unsubscribe_token: String(row.unsubscribe_token),
  }));
}

/**
 * Email active subscribers about a newly published article.
 * No-ops (with a log) when RESEND_API_KEY is not configured.
 */
export async function notifySubscribersOfNewPost(input: {
  title: string;
  hook?: string;
  slug: string;
}): Promise<{ sent: number; skipped: boolean }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() || "Phrenos.ai <hello@phrenosai.com>";

  if (!apiKey) {
    console.info(
      "Subscriber notify skipped: set RESEND_API_KEY (and optionally RESEND_FROM_EMAIL) to email readers."
    );
    return { sent: 0, skipped: true };
  }

  let subscribers: { email: string; unsubscribe_token: string }[];
  try {
    subscribers = await listActiveSubscriberEmails();
  } catch (error) {
    console.warn("Subscriber notify failed to load list:", error);
    return { sent: 0, skipped: true };
  }

  if (subscribers.length === 0) {
    return { sent: 0, skipped: false };
  }

  const origin = siteOrigin();
  const articleUrl = `${origin}/ai-updates/${input.slug}`;
  const hookLine = input.hook?.trim()
    ? `<p style="margin:0 0 16px;color:#4a5248;font-size:15px;line-height:1.55;">${escapeHtml(input.hook.trim())}</p>`
    : "";

  let sent = 0;
  for (const subscriber of subscribers) {
    const unsubscribeUrl = `${origin}/api/phrenos-updates/subscribe/unsubscribe?token=${encodeURIComponent(subscriber.unsubscribe_token)}`;
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [subscriber.email],
          subject: `New on Phrenos AI Updates: ${input.title}`,
          html: `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px;color:#1a221c;">
  <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#a9893d;">Phrenos.ai · AI Updates</p>
  <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#101c14;">${escapeHtml(input.title)}</h1>
  ${hookLine}
  <p style="margin:0 0 24px;">
    <a href="${articleUrl}" style="display:inline-block;padding:12px 20px;background:#101c14;color:#f1e8d6;text-decoration:none;border-radius:999px;font-size:14px;">Read the update</a>
  </p>
  <p style="margin:0;font-size:12px;color:#7a8278;line-height:1.5;">
    You are receiving this because you subscribed on phrenosai.com.
    <a href="${unsubscribeUrl}" style="color:#7a8278;">Unsubscribe</a>
  </p>
</div>`,
        }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        console.warn(
          `Resend failed for ${subscriber.email}: ${response.status} ${detail.slice(0, 200)}`
        );
        continue;
      }
      sent += 1;
    } catch (error) {
      console.warn(`Resend error for ${subscriber.email}:`, error);
    }
  }

  return { sent, skipped: false };
}

export async function unsubscribeByToken(token: string): Promise<boolean> {
  const trimmed = token.trim();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      trimmed
    )
  ) {
    return false;
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from(SUBSCRIBERS_TABLE)
    .update({
      status: "unsubscribed",
      unsubscribed_at: new Date().toISOString(),
    })
    .eq("unsubscribe_token", trimmed)
    .eq("status", "active")
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Boolean(data);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
