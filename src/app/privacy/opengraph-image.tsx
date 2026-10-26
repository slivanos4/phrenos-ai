import { OG_SIZE, renderPageOg } from "@/lib/site/og-page";

export const runtime = "nodejs";
export const alt = "Phrenos.ai: Privacy and cookies.";
export const size = OG_SIZE;
export const contentType = "image/jpeg";

export default function Image() {
  return renderPageOg({ eyebrow: "Privacy", title: "Privacy and cookies." });
}
