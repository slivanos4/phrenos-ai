import type { Metadata } from "next";
import { ContactSection } from "@/components/contact-section";
import { PageHero } from "@/components/page-hero";
import { contactPage } from "@/data/site-content";

const pageTitle = "Contact";
const pageDescription =
  "Contact Sophia Livanos at Phrenos.ai, an independent UK-based AI consultancy. Book a free 15-minute intro call or send a short note to find where AI, data or automation can create real leverage in your business.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/contact" },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/contact",
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
