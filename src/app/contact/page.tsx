import type { Metadata } from "next";
import { ContactSection } from "@/components/contact-section";
import { PageHero } from "@/components/page-hero";
import { contactPage } from "@/data/site-content";

const pageTitle = "Contact";
const pageDescription =
  "Contact Phrenos.ai to build your AI strategy. A short note is enough to begin finding where AI, data or automation can create real leverage.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/contact" },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/contact",
    images: ["/opengraph-image"],
  },
  twitter: { card: "summary_large_image", title: pageTitle, description: pageDescription },
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        image="contact"
        position="center"
        lightWash
        overlayMobileCopy
        eyebrow={contactPage.eyebrow}
        title={contactPage.title}
      />
      <ContactSection />
    </>
  );
}
