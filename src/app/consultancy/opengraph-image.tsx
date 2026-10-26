import { OG_SIZE, renderPageOg } from "@/lib/site/og-page";

export const runtime = "nodejs";
export const alt = "Phrenos.ai: Capability with commercial intent.";
export const size = OG_SIZE;
export const contentType = "image/jpeg";

export default function Image() {
  return renderPageOg({ eyebrow: "Consultancy", title: "Capability with commercial intent.", subtitle: "Five capabilities. One goal: AI that changes what your business can do." });
}
