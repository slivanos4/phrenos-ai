import { createServiceRoleClient } from "@/lib/phrenos-updates/supabase";
import { adminJson } from "@/lib/market-desk/route";
import { pushPublicKey, sendPush } from "@/lib/market-desk/push";
import { T } from "@/lib/market-desk/store";

export function GET(request: Request) {
  return adminJson(request, async () => ({ publicKey: pushPublicKey() }));
}

export function POST(request: Request) {
  return adminJson(request, async () => {
    const body = (await request.json()) as {
      subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      test?: boolean;
    };
    if (body.test) {
      const sent = await sendPush({ title: "Market Desk", body: "Notifications are working." });
      return { sent };
    }
    const sub = body.subscription;
    if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys.auth) throw new Error("That notification setup was incomplete.");
    const { error } = await createServiceRoleClient()
      .from(T.push)
      .upsert({ endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth }, { onConflict: "endpoint" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
}

export function DELETE(request: Request) {
  return adminJson(request, async () => {
    const { endpoint } = (await request.json()) as { endpoint?: string };
    if (endpoint) await createServiceRoleClient().from(T.push).delete().eq("endpoint", endpoint);
    return { ok: true };
  });
}
