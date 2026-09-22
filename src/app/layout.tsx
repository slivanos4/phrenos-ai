import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { ConditionalFooter } from "@/components/conditional-footer";
import { SiteAnalytics } from "@/components/site-analytics";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const siteUrl = "https://phrenosai.com";
const defaultTitle = "Phrenos.ai | AI Strategy, Automation & Innovation";
const defaultDescription =
  "Phrenos.ai is an independent AI consultancy helping businesses turn Generative AI, data and automation into measurable operational and commercial impact.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: "%s | Phrenos.ai",
  },
  description: defaultDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: defaultTitle,
    description: defaultDescription,
    url: siteUrl,
    siteName: "Phrenos.ai",
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "Phrenos.ai",
  url: siteUrl,
  logo: `${siteUrl}/brand/phrenos_logo_green.png`,
  description: defaultDescription,
  founder: {
    "@type": "Person",
    name: "Sophia Livanos",
  },
  sameAs: ["https://www.linkedin.com/in/sophia-livanos-45144b22"],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-forest text-ivory font-sans">
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <ConditionalFooter />
        <Analytics />
        <SiteAnalytics />
      </body>
    </html>
  );
}
