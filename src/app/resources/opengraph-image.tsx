import { OG_SIZE, renderPageOg } from "@/lib/site/og-page";

export const runtime = "nodejs";
export const alt = "Phrenos.ai: Tools you can use this week.";
export const size = OG_SIZE;
export const contentType = "image/jpeg";

export default function Image() {
  return renderPageOg({ eyebrow: "Resources", title: "Tools you can use this week.", subtitle: "Practical sheets for leaders who want sharper AI briefs and sharper judgement." });
}
