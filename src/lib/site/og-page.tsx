/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { OG_SIZE, ogAssets, ogJpeg } from "@/lib/site/og";

export { OG_SIZE };

function titleSize(title: string): number {
  if (title.length > 90) return 40;
  if (title.length > 65) return 46;
  if (title.length > 45) return 54;
  if (title.length > 30) return 62;
  return 72;
}

/** One page's link preview: its own title over the hero artwork, with the Phrenos.ai brand. */
export async function renderPageOg(input: { eyebrow: string; title: string; subtitle?: string }): Promise<Response> {
  const { bgUrl, logoUrl, fonts } = await ogAssets();
  return ogJpeg(
    new ImageResponse(
      (
        <div style={{ display: "flex", width: "100%", height: "100%", position: "relative", background: "#0a100c" }}>
          <img src={bgUrl} alt="" width={1200} height={630} style={{ position: "absolute", top: 0, left: 0 }} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "60px 72px",
              width: 630,
            }}
          >
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
              {input.eyebrow}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  fontFamily: "Cormorant",
                  fontSize: titleSize(input.title),
                  lineHeight: 1.06,
                  color: "#f1e8d6",
                }}
              >
                {input.title}
              </div>
              {input.subtitle ? (
                <div
                  style={{
                    display: "flex",
                    marginTop: 26,
                    fontFamily: "Manrope",
                    fontSize: 22,
                    lineHeight: 1.4,
                    color: "#a9b0a3",
                  }}
                >
                  {input.subtitle}
                </div>
              ) : null}
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
      { ...OG_SIZE, fonts },
    ),
  );
}
