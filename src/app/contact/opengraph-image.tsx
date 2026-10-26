import { OG_SIZE, renderPageOg } from "@/lib/site/og-page";

export const runtime = "nodejs";
export const alt = "Phrenos.ai: A short note is enough to begin.";
export const size = OG_SIZE;
export const contentType = "image/jpeg";

export default function Image() {
  return renderPageOg({ eyebrow: "Contact", title: "A short note is enough to begin.", subtitle: "Tell us where the friction is, and we’ll help find the leverage." });
}
