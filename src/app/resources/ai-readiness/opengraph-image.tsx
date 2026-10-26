import { OG_SIZE, renderPageOg } from "@/lib/site/og-page";

export const runtime = "nodejs";
export const alt = "Phrenos.ai: How ready is your organisation for AI?";
export const size = OG_SIZE;
export const contentType = "image/jpeg";

export default function Image() {
  return renderPageOg({ eyebrow: "Free tool", title: "How ready is your organisation for AI?", subtitle: "Eight quick questions. See where you stand and where to start." });
}
