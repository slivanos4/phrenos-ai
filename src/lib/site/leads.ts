import { scoreReadiness, readinessQuestions, type ReadinessResult } from "@/data/readiness-check";
import { createServiceRoleClient, isServiceRoleConfigured } from "@/lib/phrenos-updates/supabase";
import { isValidSubscriberEmail, normalizeSubscriberEmail, subscribeToUpdates } from "@/lib/phrenos-updates";
import { cheatSheetEmail, contactConfirmation, readinessEmail } from "@/lib/site/lead-emails";
import { sendEmail } from "@/lib/site/email";
import { buildReadinessPdf } from "@/lib/site/readiness-pdf";
import { WEB3FORMS_ACCESS_KEY } from "@/lib/site/web3forms-key";

export const LEADS_TABLE = "phrenos_leads";

export type LeadSource = "contact" | "readiness-check" | "cheat-sheet";
export const LEAD_STATUSES = ["new", "contacted", "in_progress", "won", "not_a_fit"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type LeadInput = {
  source: LeadSource;
  email: string;
  name?: string;
  organisation?: string;
  role?: string;
  message?: string;
  optIn?: boolean;
  /** Readiness only: the chosen option per question. The server scores them itself. */
  answers?: Record<string, number>;
};

const SOURCE_LABEL: Record<LeadSource, string> = {
  contact: "Contact form",
  "readiness-check": "AI readiness check",
  "cheat-sheet": "Cheat sheet: How to Brief AI Like a Strategist",
};

const clip = (value: string | undefined, max: number) => (value ?? "").trim().slice(0, max);

function readinessDetails(result: ReadinessResult, answers: Record<string, number>) {
  const chosen: Record<string, string> = {};
  for (const question of readinessQuestions) {
    chosen[question.question] = question.options[answers[question.id]] ?? "no answer";
  }
  return {
    areas: Object.fromEntries(result.areas.map((area) => [area.label, `${area.percent}%`])),
    answers: chosen,
  };
}

/** Tell Sophia, through the same inbox the contact form has always used. */
async function notifyOwner(input: LeadInput, result: ReadinessResult | null) {
  try {
    await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: WEB3FORMS_ACCESS_KEY,
        subject:
          input.source === "contact"
            ? `Phrenos.ai enquiry${input.organisation ? `: ${input.organisation}` : ""}`
            : `Phrenos.ai lead: ${SOURCE_LABEL[input.source]}`,
        from_name: "Phrenos.ai website",
        email: input.email,
        source: SOURCE_LABEL[input.source],
        name: input.name || "Not provided",
        organisation: input.organisation || "Not provided",
        role: input.role || "Not provided",
        message: input.message || "",
        newsletter_opt_in: input.optIn ? "yes" : "no",
        ...(result ? { readiness_score: `${result.percent}% (${result.tier.label})` } : {}),
      }),
    });
  } catch (error) {
    console.error("leads: owner notification failed:", error);
  }
}

async function storeLead(input: LeadInput, result: ReadinessResult | null) {
  if (!isServiceRoleConfigured()) return;
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from(LEADS_TABLE).insert({
      source: input.source,
      email: input.email,
      email_normalized: normalizeSubscriberEmail(input.email),
      name: input.name || null,
      organisation: input.organisation || null,
      role: input.role || null,
      message: input.message || null,
      readiness_percent: result?.percent ?? null,
      readiness_tier: result?.tier.label ?? null,
      details: result && input.answers ? readinessDetails(result, input.answers) : {},
      newsletter_opt_in: Boolean(input.optIn),
    });
    if (error) console.error("leads: could not store lead (is migration 005 applied?):", error.message);
  } catch (error) {
    console.error("leads: could not store lead:", error);
  }
}

export function validateLead(raw: Partial<LeadInput>): { ok: true; lead: LeadInput } | { ok: false; error: string } {
  const source = raw.source;
  if (source !== "contact" && source !== "readiness-check" && source !== "cheat-sheet") {
    return { ok: false, error: "Unknown form." };
  }
  const email = clip(raw.email, 254);
  if (!isValidSubscriberEmail(email)) return { ok: false, error: "Please enter a valid email address." };

  const lead: LeadInput = {
    source,
    email,
    name: clip(raw.name, 120),
    organisation: clip(raw.organisation, 160),
    role: clip(raw.role, 120),
    message: clip(raw.message, 5000),
    optIn: Boolean(raw.optIn),
    answers: raw.answers && typeof raw.answers === "object" ? raw.answers : undefined,
  };
  if (source === "contact" && (!lead.name || !lead.message)) {
    return { ok: false, error: "Please add your name and a short message." };
  }
  if (source === "readiness-check" && !lead.answers) return { ok: false, error: "Missing answers." };
  return { ok: true, lead };
}

/**
 * Everything that happens when someone gives their details: save the lead, tell Sophia, add them to the
 * briefing if they ticked the box, and send them a confirmation. Each step is allowed to fail on its own.
 */
export async function processLead(input: LeadInput): Promise<void> {
  const result = input.source === "readiness-check" && input.answers ? scoreReadiness(input.answers) : null;

  await storeLead(input, result);
  await notifyOwner(input, result);

  if (input.optIn && isServiceRoleConfigured()) {
    try {
      await subscribeToUpdates({ email: input.email, source: input.source });
    } catch (error) {
      console.error("leads: newsletter signup failed:", error);
    }
  }

  const email =
    input.source === "contact"
      ? contactConfirmation(input.name)
      : input.source === "readiness-check" && result
        ? readinessEmail(result)
        : input.source === "cheat-sheet"
          ? cheatSheetEmail()
          : null;
  if (email) {
    let attachments: { filename: string; content: string }[] | undefined;
    if (input.source === "readiness-check" && result) {
      try {
        const pdf = await buildReadinessPdf(result);
        attachments = [{ filename: "AI-readiness-result.pdf", content: Buffer.from(pdf).toString("base64") }];
      } catch (error) {
        console.error("leads: could not build the readiness PDF:", error);
      }
    }
    await sendEmail({ to: input.email, ...email, attachments });
  }
}
