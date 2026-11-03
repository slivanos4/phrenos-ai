import webpush from "web-push";
import { createServiceRoleClient } from "@/lib/phrenos-updates/supabase";
import { T } from "@/lib/market-desk/store";
import { siteOrigin } from "@/lib/market-desk/notify";
import type { AlertRow } from "@/lib/market-desk/types";

export function pushPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || null;
}

function configured(): boolean {
  const publicKey = pushPublicKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT?.trim() || "mailto:hello@phrenosai.com", publicKey, privateKey);
  return true;
}

export async function sendPush(payload: { title: string; body: string; url?: string }): Promise<number> {
  if (!configured()) return 0;
  const supabase = createServiceRoleClient();
  const { data } = await supabase.from(T.push).select("*");
  let sent = 0;
  for (const sub of data ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ ...payload, url: payload.url ?? `${siteOrigin()}/admin/market-desk` }),
      );
      sent += 1;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await supabase.from(T.push).delete().eq("id", sub.id);
    }
  }
  return sent;
}

/** Pushes the important warnings to every phone or browser that has switched notifications on. */
export async function pushAlerts(alerts: AlertRow[]): Promise<void> {
  if (alerts.length === 0) return;
  const critical = alerts.filter((alert) => alert.severity === "critical");
  const lead = critical[0] ?? alerts[0];
  const sent = await sendPush({
    title: critical.length ? "Market Desk: urgent warning" : "Market Desk: new warning",
    body: alerts.length > 1 ? `${lead.title} (+${alerts.length - 1} more)` : lead.title,
  });
  if (sent > 0) {
    await createServiceRoleClient()
      .from(T.alerts)
      .update({ pushed_at: new Date().toISOString() })
      .in("id", alerts.map((alert) => alert.id));
  }
}
