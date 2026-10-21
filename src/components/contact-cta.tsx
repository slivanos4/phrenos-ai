import Link from "next/link";
import { bookCallHref, bookCallIsExternal, contactCta } from "@/data/site-content";

export function ContactCta({
  heading = contactCta.heading,
  supporting = contactCta.supporting,
}: {
  heading?: string;
  supporting?: string;
} = {}) {
  return (
    <section
      id="contact"
      className="relative overflow-hidden bg-forest py-24 lg:py-32"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(184,139,54,0.18),transparent_58%)]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -z-0 h-[44rem] w-[44rem] -translate-x-1/2 -translate-y-1/2 text-[#d4af5a]/25" aria-hidden>
        <svg viewBox="0 0 400 400" className="animate-orrery h-full w-full" fill="none" stroke="currentColor" strokeWidth="0.7">
          <circle cx="200" cy="200" r="190" strokeDasharray="2 7" />
          <circle cx="200" cy="200" r="150" />
          <circle cx="200" cy="40" r="4" fill="currentColor" />
          <circle cx="344" cy="262" r="3" fill="currentColor" />
          <circle cx="78" cy="300" r="3" fill="currentColor" />
        </svg>
        <svg viewBox="0 0 400 400" className="animate-orrery-reverse absolute inset-0 h-full w-full" fill="none" stroke="currentColor" strokeWidth="0.7">
          <circle cx="200" cy="200" r="110" strokeDasharray="1 5" />
          <circle cx="200" cy="200" r="70" />
          <circle cx="310" cy="200" r="3.5" fill="currentColor" />
          <circle cx="130" cy="140" r="2.5" fill="currentColor" />
        </svg>
      </div>

      <div className="relative mx-auto max-w-3xl px-6 text-center lg:px-8">
        <h2 className="font-serif text-4xl tracking-tight text-ivory sm:text-5xl">
          {heading}
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-sage sm:text-lg">
          {supporting}
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
