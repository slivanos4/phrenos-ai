import { OG_SIZE, renderPageOg } from "@/lib/site/og-page";

export const runtime = "nodejs";
export const alt = "Phrenos.ai: Intelligence worth paying attention to.";
export const size = OG_SIZE;
export const contentType = "image/jpeg";

export default function Image() {
  return renderPageOg({ eyebrow: "AI Updates", title: "Intelligence worth paying attention to.", subtitle: "The AI news actually worth changing your roadmap for." });
}
