import { adminJson } from "@/lib/market-desk/route";
import { saveSettings } from "@/lib/market-desk/store";

export function PUT(request: Request) {
  return adminJson(request, async () => {
    const body = (await request.json()) as { alert_email?: string | null; thresholds?: Record<string, number> };
    const email = body.alert_email?.trim() || null;
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Enter a valid email address.");
    const thresholds: Record<string, number> = {};
    for (const [key, value] of Object.entries(body.thresholds ?? {})) {
      if (Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) <= 90) thresholds[key] = Number(value);
    }
    return { settings: await saveSettings({ alert_email: email, thresholds }) };
  });
}
