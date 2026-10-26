import { OG_SIZE, renderPageOg } from "@/lib/site/og-page";

export const runtime = "nodejs";
export const alt = "Phrenos.ai: From opportunity to lasting capability.";
export const size = OG_SIZE;
export const contentType = "image/jpeg";

export default function Image() {
  return renderPageOg({ eyebrow: "Approach", title: "From opportunity to lasting capability.", subtitle: "Understand. Prioritise. Build. Embed." });
}
