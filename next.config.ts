import type { NextConfig } from "next";

// Link previews read the artwork, logo and brand fonts from disk, so make sure they ship with each preview route.
const OG_FILES = [
  "./public/brand/og-bg.jpg",
  "./public/brand/phrenos_logo_white.png",
  "./src/assets/fonts/*",
];

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // The cheat sheet PDF is kept out of /public and read by the download route, so make sure it ships with it.
  outputFileTracingIncludes: {
    "/api/resources/brief-sheet/download": ["./private-assets/**/*"],
    "/api/resources/readiness-pdf": ["./public/brand/phrenos_logo_white.png"],
    "/api/leads": ["./public/brand/phrenos_logo_white.png"],
    "/opengraph-image": OG_FILES,
    "/ai-updates/[slug]/opengraph-image": OG_FILES,
    "/about/opengraph-image": OG_FILES,
    "/consultancy/opengraph-image": OG_FILES,
    "/approach/opengraph-image": OG_FILES,
    "/work/opengraph-image": OG_FILES,
    "/work/[slug]/opengraph-image": OG_FILES,
    "/ai-updates/opengraph-image": OG_FILES,
    "/resources/opengraph-image": OG_FILES,
    "/resources/ai-readiness/opengraph-image": OG_FILES,
    "/contact/opengraph-image": OG_FILES,
    "/privacy/opengraph-image": OG_FILES
  },
  async redirects() {
    return [
      // The old public address of the PDF now sends people to the sign-up form.
      {
        source: "/products/brief-ai-like-a-strategist.pdf",
        destination: "/resources#cheat-sheet",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
