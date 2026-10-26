import { bookCallHref, bookCallIsExternal } from "@/data/site-content";
import {
  readinessAreas,
  scoreReadiness,
  type ReadinessResult,
} from "@/data/readiness-check";
import { createAccessCookieValue } from "@/lib/site/brief-access";
import { emailShell, escapeHtml, siteUrl } from "@/lib/site/email";

const firstName = (name?: string | null) => (name ?? "").trim().split(/\s+/)[0] || "";
const greeting = (name?: string | null) => (firstName(name) ? `Hello ${escapeHtml(firstName(name))},` : "Hello,");

function bookUrl(): string {
  return bookCallIsExternal ? bookCallHref : `${siteUrl()}${bookCallHref}`;
}

/** Sent after someone fills in the contact form. */
export function contactConfirmation(name?: string | null) {
  return {
    subject: "Thanks for getting in touch",
    html: emailShell({
      eyebrow: "Phrenos.ai",
      heading: "I have your message.",
      bodyHtml: `<p style="margin:0 0 12px;">${greeting(name)}</p>
<p style="margin:0 0 12px;">Thank you for writing. Your message is with me now, and I will reply within a couple of business days, with a few questions or a time to talk.</p>
<p style="margin:0;">While you wait, the free AI readiness check shows where your organisation stands across strategy, data, workflows, people and governance.</p>`,
      button: { label: "Take the AI readiness check", url: `${siteUrl()}/resources/ai-readiness` },
      footer: "You are receiving this because you sent a message through phrenosai.com.",
    }),
  };
}

/** Sent after someone unlocks their readiness result, with the result itself. */
export function readinessEmail(result: ReadinessResult) {
  const steps = result.tier.nextSteps
    .map((step, index) => `<p style="margin:0 0 8px;"><strong>${index + 1}.</strong> ${escapeHtml(step)}</p>`)
    .join("");
  const areas = result.areas
    .map((area) => `<tr><td style="padding:4px 12px 4px 0;">${escapeHtml(area.label)}</td><td style="padding:4px 0;"><strong>${area.percent}%</strong></td></tr>`)
    .join("");
  return {
    subject: `Your AI readiness result: ${result.tier.label}`,
    html: emailShell({
      eyebrow: "Your AI readiness result",
      heading: `${result.percent}%: ${result.tier.label}`,
      bodyHtml: `<p style="margin:0 0 12px;font-size:17px;color:#101c14;">${escapeHtml(result.tier.headline)}</p>
<p style="margin:0 0 20px;">${escapeHtml(result.tier.summary)}</p>
<p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#a9893d;">Your next three moves</p>
${steps}
<p style="margin:20px 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#a9893d;">By area</p>
<table style="border-collapse:collapse;font-size:14px;color:#2c352d;">${areas}</table>
<p style="margin:20px 0 0;"><strong>Start here: ${escapeHtml(readinessAreas[result.weakest].label)}.</strong> ${escapeHtml(readinessAreas[result.weakest].firstStep)}</p>`,
      button: { label: "Book a free intro call", url: bookUrl() },
      footer: "You are receiving this because you asked for your result on phrenosai.com.",
    }),
  };
}

/** Sent after the cheat sheet sign-up, with a link that works on any device for 30 days. */
export function cheatSheetEmail() {
  const token = createAccessCookieValue();
  const url = token
    ? `${siteUrl()}/api/resources/brief-sheet/download?dl=1&t=${encodeURIComponent(token)}`
    : `${siteUrl()}/resources#cheat-sheet`;
  return {
    subject: "Your cheat sheet: How to Brief AI Like a Strategist",
    html: emailShell({
      eyebrow: "Free cheat sheet",
      heading: "How to Brief AI Like a Strategist",
      bodyHtml: `<p style="margin:0 0 12px;">Hello,</p>
<p style="margin:0;">Here is your cheat sheet: PAST, a reusable briefing template, five upgrades that change quality, and prompt patterns for real work. The link works on any device for 30 days.</p>`,
      button: { label: "Download the PDF", url },
      footer: "You are receiving this because you asked for the cheat sheet on phrenosai.com.",
    }),
  };
}

export { scoreReadiness };
