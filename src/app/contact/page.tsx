import type { Metadata } from "next";
import { ContactCta } from "@/components/contact-cta";
import { ContactForm } from "@/components/contact-form";
import { contactPage } from "@/data/site-content";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Contact Phrenos.ai to discuss Generative AI strategy, automation and organisational enablement.",
};

export default function ContactPage() {
  return (
    <>
      <div className="h-20 sm:h-[5.25rem] lg:h-[5.5rem]" aria-hidden />
      <ContactCta />

      <section
        id="contact-form"
        className="bg-forest-secondary pt-8 pb-24 lg:pb-32"
      >
        <div className="mx-auto grid max-w-7xl gap-14 px-6 lg:grid-cols-12 lg:gap-16 lg:px-8">
          <div className="lg:col-span-5">
            <p className="text-xs font-semibold tracking-[0.28em] text-gold uppercase">
              {contactPage.eyebrow}
            </p>
            <h1 className="mt-4 font-serif text-5xl tracking-tight text-ivory sm:text-6xl">
              {contactPage.title}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-sage">
              {contactPage.description}
            </p>
          </div>

          <div className="lg:col-span-7">
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}
