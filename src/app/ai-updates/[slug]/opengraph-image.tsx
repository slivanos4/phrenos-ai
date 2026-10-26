/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { getPublishedPostBySlug, isServiceRoleConfigured, sanitizeEditorialText } from "@/lib/phrenos-updates";
import { OG_SIZE, ogAssets, ogJpeg } from "@/lib/site/og";

export const runtime = "nodejs";
export const alt = "Phrenos.ai AI Update";
export const size = OG_SIZE;
export const contentType = "image/jpeg";
export const revalidate = 3600;

function titleSize(title: string): number {
  if (title.length > 100) return 38;
  if (title.length > 75) return 42;
  if (title.length > 50) return 50;
  return 58;
}

/** The preview shown when one article is shared: its own title over the hero artwork. */
export default async function ArticleOpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let title = "AI Updates";
  let date = "";
  if (isServiceRoleConfigured()) {
    try {
      const post = await getPublishedPostBySlug(slug);
      if (post) {
        title = sanitizeEditorialText(post.title);
        date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(
          new Date(post.published_at),
        );
      }
    } catch {
      // Fall back to the generic title rather than fail the preview.
    }
  }

  const { bgUrl, logoUrl, fonts } = await ogAssets();
  return ogJpeg(
    new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", position: "relative", background: "#0a100c" }}>
        <img src={bgUrl} alt="" width={1200} height={630} style={{ position: "absolute", top: 0, left: 0 }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "60px 72px", width: 630 }}>
          <div
            style={{
              display: "flex",
              fontFamily: "Manrope",
              fontSize: 20,
              letterSpacing: 5,
              textTransform: "uppercase",
              color: "#e0c078",
            }}
          >
            AI Update{date ? `  ·  ${date}` : ""}
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Cormorant",
              fontSize: titleSize(title),
              lineHeight: 1.08,
              color: "#f1e8d6",
            }}
          >
            {title}
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <img src={logoUrl} alt="" width={44} height={46} />
            <div style={{ display: "flex", marginLeft: 14, fontFamily: "Cormorant", fontSize: 38, color: "#f1e8d6" }}>
              Phrenos<span style={{ color: "#d4af5a" }}>.ai</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
    ),
  );
}
