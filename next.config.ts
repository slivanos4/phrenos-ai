import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // The cheat sheet PDF is kept out of /public and read by the download route, so make sure it ships with it.
  outputFileTracingIncludes: {
    "/api/resources/brief-sheet/download": ["./private-assets/**/*"],
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
