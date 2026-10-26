/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { OG_SIZE, ogAssets, ogJpeg } from "@/lib/site/og";

export const runtime = "nodejs";
export const alt = "Phrenos.ai: AI Strategy, Automation & Innovation";
export const size = OG_SIZE;
export const contentType = "image/jpeg";

/** The preview shown when the site is shared: the hero artwork with the brand and the headline. */
export default async function OpengraphImage() {
  const { bgUrl, logoUrl, fonts } = await ogAssets();
  return ogJpeg(
    new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", position: "relative", background: "#0a100c" }}>
        <img src={bgUrl} alt="" width={1200} height={630} style={{ position: "absolute", top: 0, left: 0 }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", width: 700 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <img src={logoUrl} alt="" width={54} height={56} />
            <div style={{ display: "flex", marginLeft: 16, fontFamily: "Cormorant", fontSize: 46, color: "#f1e8d6" }}>
              Phrenos<span style={{ color: "#d4af5a" }}>.ai</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontFamily: "Cormorant",
                fontSize: 96,
                lineHeight: 1.02,
                color: "#f1e8d6",
              }}
            >
              The Mind in the Machine.
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 28,
                fontFamily: "Manrope",
                fontSize: 17,
                letterSpacing: 3.5,
                textTransform: "uppercase",
                color: "#e0c078",
              }}
            >
              AI Strategy, Automation & Innovation
            </div>
          </div>
          <div style={{ display: "flex", fontFamily: "Manrope", fontSize: 20, letterSpacing: 3, color: "#a9b0a3" }}>
            phrenosai.com
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
    ),
  );
}
