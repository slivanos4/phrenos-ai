import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { PageHero } from "@/components/page-hero";
import { contactPage } from "@/data/site-content";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Start a conversation with Phrenos.ai. A short note is enough to begin finding where AI, data or automation can create real leverage.",
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        image="contact"
        position="center"
        eyebrow={contactPage.eyebrow}
        title={contactPage.title}
        description={contactPage.description}
      />

      <section
        id="contact-form"
        className="bg-forest-secondary pt-10 pb-16 lg:pt-12 lg:pb-24"
      >
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          <ContactForm />
        </div>
      </section>
    </>
  );
}
