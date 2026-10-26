/** Small helpers for the emails the website sends itself. */

export function siteUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "").trim();
  return (configured || "https://phrenosai.com").replace(/\/$/, "");
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function fromAddress(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() || "Phrenos.ai <hello@phrenosai.com>";
}

/** Sends one email through Resend. Returns false (and logs) rather than throwing, so a hiccup never breaks a form. */
export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: string }[];
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.info("Email skipped: RESEND_API_KEY is not set.");
    return false;
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromAddress(),
        to: [input.to],
        reply_to: "hello@phrenosai.com",
        subject: input.subject,
        html: input.html,
        ...(input.attachments?.length ? { attachments: input.attachments } : {}),
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(`Resend failed (${response.status}): ${detail.slice(0, 200)}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("Resend error:", error);
    return false;
  }
}

/** The shared look of the website's own emails: plain, serif, gold eyebrow, one button. */
export function emailShell(input: {
  eyebrow: string;
  heading: string;
  bodyHtml: string;
  button?: { label: string; url: string };
  footer: string;
}): string {
  const button = input.button
    ? `<p style="margin:24px 0 0;"><a href="${input.button.url}" style="display:inline-block;padding:12px 22px;background:#101c14;color:#f1e8d6;text-decoration:none;border-radius:999px;font-size:14px;">${escapeHtml(input.button.label)}</a></p>`
    : "";
  return `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px;color:#1a221c;">
  <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#a9893d;">${escapeHtml(input.eyebrow)}</p>
  <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#101c14;">${escapeHtml(input.heading)}</h1>
  <div style="color:#2c352d;font-size:15px;line-height:1.6;">${input.bodyHtml}</div>
  ${button}
  <p style="margin:28px 0 0;font-size:15px;color:#2c352d;">Sophia Livanos<br /><span style="color:#7a8278;font-size:13px;">Founder, Phrenos.ai</span></p>
  <p style="margin:24px 0 0;font-size:12px;color:#7a8278;line-height:1.5;">${input.footer}</p>
</div>`;
}
