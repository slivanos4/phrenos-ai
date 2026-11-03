import type { AlertRow } from "@/lib/market-desk/types";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://phrenosai.com").replace(/\/$/, "");
}

/** Sends one email. Returns false (with a log) when Resend is not configured or the send fails. */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim() || "Phrenos.ai <hello@phrenosai.com>";
  if (!apiKey) {
    console.info("Market Desk email skipped: RESEND_API_KEY is not set.");
    return false;
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    if (!response.ok) {
      console.warn(`Market Desk email failed: ${response.status} ${(await response.text()).slice(0, 200)}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("Market Desk email error:", error);
    return false;
  }
}

const SEVERITY_COLOUR: Record<string, string> = { critical: "#b3261e", warning: "#a9731a", info: "#4a5248" };

export function alertEmail(alerts: AlertRow[]): { subject: string; html: string } {
  const critical = alerts.filter((alert) => alert.severity === "critical").length;
  const subject = critical
    ? `Market Desk: ${critical} urgent warning${critical === 1 ? "" : "s"} on your holdings`
    : `Market Desk: ${alerts.length} new warning${alerts.length === 1 ? "" : "s"} on your holdings`;
  const items = alerts
    .map(
      (alert) => `<div style="border-left:4px solid ${SEVERITY_COLOUR[alert.severity] ?? "#4a5248"};padding:8px 14px;margin:0 0 14px;">
  <p style="margin:0 0 4px;font-size:15px;font-weight:bold;color:#101c14;">${escapeHtml(alert.title)}</p>
  <p style="margin:0;font-size:14px;line-height:1.5;color:#4a5248;">${escapeHtml(alert.message)}</p>
</div>`,
    )
    .join("");
  const html = `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px;color:#1a221c;">
  <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#a9893d;">Market Desk</p>
  <h1 style="margin:0 0 16px;font-size:22px;color:#101c14;">Holdings worth a look</h1>
  ${items}
  <p style="margin:18px 0 16px;"><a href="${siteOrigin()}/admin/market-desk" style="display:inline-block;padding:12px 20px;background:#101c14;color:#f1e8d6;text-decoration:none;border-radius:999px;font-size:14px;">Open Market Desk</a></p>
  <p style="margin:0;font-size:12px;color:#7a8278;line-height:1.5;">These are automatic risk flags based on price data and your own alert rules. They are research, not financial advice, and they cannot predict the market.</p>
</div>`;
  return { subject, html };
}
