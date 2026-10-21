import Link from "next/link";
import { bookCallHref, bookCallIsExternal, contactCta } from "@/data/site-content";

export function ContactCta() {
  return (
    <section
      id="contact"
      className="relative overflow-hidden bg-forest py-24 lg:py-32"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(184,139,54,0.12),transparent_55%)]" />

      <div className="relative mx-auto max-w-3xl px-6 text-center lg:px-8">
        <h2 className="font-serif text-4xl tracking-tight text-ivory sm:text-5xl">
          {contactCta.heading}
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-sage sm:text-lg">
          {contactCta.supporting}
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href={bookCallHref}
            {...(bookCallIsExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            data-track="cta_book_call"
            data-track-location="closing-cta"
            className="inline-flex items-center justify-center rounded-full border border-gold bg-gold px-7 py-3.5 text-sm font-semibold tracking-wide text-forest transition-colors hover:bg-[#e0c078]"
          >
            {contactCta.button.label}
          </Link>
          <Link
            href={contactCta.secondary.href}
            data-track="cta_readiness_check"
            data-track-location="closing-cta"
            className="inline-flex items-center justify-center rounded-full border border-[#d4af5a]/60 px-7 py-3.5 text-sm font-semibold tracking-wide text-ivory transition-colors hover:border-[#e0c078] hover:bg-[#d4af5a]/10"
          >
            {contactCta.secondary.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
