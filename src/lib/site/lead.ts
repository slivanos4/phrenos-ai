import { trackEvent } from "@/lib/site/analytics";

import { WEB3FORMS_ACCESS_KEY } from "@/lib/site/web3forms-key";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/**
 * Tell Sophia about a lead who gave their email in exchange for something (a cheat sheet, a readiness
 * result). Goes through the same inbox as the contact form. Returns false rather than throwing, so a
 * hiccup never blocks the visitor from getting what they asked for.
 */
export async function submitLead(input: {
  source: string;
  email: string;
  details?: Record<string, string | number>;
}): Promise<boolean> {
  try {
    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: `Phrenos.ai lead: ${input.source}`,
        from_name: "Phrenos.ai website",
        email: input.email.trim(),
        source: input.source,
        ...input.details,
      }),
    });
    const result = (await response.json()) as { success?: boolean };
    const ok = response.ok && Boolean(result.success);
    if (ok) trackEvent("generate_lead", { form: input.source });
    return ok;
  } catch {
    return false;
  }
}

/** Add the person to the AI Updates list. Only ever called when they ticked the opt-in box. */
export async function joinBriefing(email: string, source: string): Promise<boolean> {
  try {
    const response = await fetch("/api/phrenos-updates/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), source }),
    });
    if (response.ok) trackEvent("newsletter_signup", { source });
    return response.ok;
  } catch {
    return false;
  }
}
