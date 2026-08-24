import type { Metadata } from "next";
import { ContactSection } from "@/components/contact-section";
import { PageHero } from "@/components/page-hero";
import { contactPage } from "@/data/site-content";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Build your AI strategy with Phrenos.ai. A short note is enough to begin finding where AI, data or automation can create real leverage.",
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
