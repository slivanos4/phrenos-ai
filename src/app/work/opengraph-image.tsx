import { OG_SIZE, renderPageOg } from "@/lib/site/og-page";

export const runtime = "nodejs";
export const alt = "Phrenos.ai: Systems that turn intelligence into action.";
export const size = OG_SIZE;
export const contentType = "image/jpeg";

export default function Image() {
  return renderPageOg({ eyebrow: "Selected work", title: "Systems that turn intelligence into action.", subtitle: "Five systems that turn slow, scattered or manual work into something dependable." });
}
