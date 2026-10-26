import { OG_SIZE, renderPageOg } from "@/lib/site/og-page";

export const runtime = "nodejs";
export const alt = "Phrenos.ai: Most people ask what AI can do.";
export const size = OG_SIZE;
export const contentType = "image/jpeg";

export default function Image() {
  return renderPageOg({ eyebrow: "About", title: "Most people ask what AI can do.", subtitle: "I’m more interested in what it enables people to become." });
}
