import { readFile } from "node:fs/promises";
import type { ImageResponse } from "next/og";
import path from "node:path";
import sharp from "sharp";

export const OG_SIZE = { width: 1200, height: 630 };

const root = process.cwd();

/** The artwork, logo and brand fonts used by every link-preview image. Read once per request. */
export async function ogAssets() {
  const [bg, logo, serif, sans] = await Promise.all([
    readFile(path.join(root, "public", "brand", "og-bg.jpg")),
    readFile(path.join(root, "public", "brand", "phrenos_logo_white.png")),
    readFile(path.join(root, "src", "assets", "fonts", "CormorantGaramond-Medium.ttf")),
    readFile(path.join(root, "src", "assets", "fonts", "Manrope-SemiBold.ttf")),
  ]);
  return {
    bgUrl: `data:image/jpeg;base64,${bg.toString("base64")}`,
    logoUrl: `data:image/png;base64,${logo.toString("base64")}`,
    fonts: [
      { name: "Cormorant", data: serif, style: "normal" as const, weight: 500 as const },
      { name: "Manrope", data: sans, style: "normal" as const, weight: 600 as const },
    ],
  };
}

/**
 * Link previews are drawn as PNG, which is large for a photograph (over 1 MB). Messaging apps such as WhatsApp
 * skip big preview images, so convert to JPEG, which comes out around 100 KB.
 */
export async function ogJpeg(image: ImageResponse): Promise<Response> {
  const png = Buffer.from(await image.arrayBuffer());
  const jpg = await sharp(png).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  return new Response(new Uint8Array(jpg), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
