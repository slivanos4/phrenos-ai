"use client";

import { HeroNetwork } from "@/components/hero-network";
import { romanNumerals, services } from "@/data/site-content";

type ServicesProps = {
  hideIntro?: boolean;
};

const serviceIcons = [
  // Strategy: radiating diamond / orrery
  <svg key="strategy" viewBox="0 0 64 64" fill="none" aria-hidden>
    <path d="M32 8 L56 32 L32 56 L8 32 Z" stroke="currentColor" strokeWidth="1.6" />
    <path d="M32 18 L46 32 L32 46 L18 32 Z" stroke="currentColor" strokeWidth="1.3" opacity="0.7" />
    <circle cx="32" cy="32" r="3" fill="currentColor" />
    <path d="M32 4 V12 M32 52 V60 M4 32 H12 M52 32 H60" stroke="currentColor" strokeWidth="1.2" opacity="0.55" />
  </svg>,
  // Automation: linked nodes
  <svg key="auto" viewBox="0 0 64 64" fill="none" aria-hidden>
    <circle cx="14" cy="32" r="6" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="32" cy="14" r="6" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="50" cy="32" r="6" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="32" cy="50" r="6" stroke="currentColor" strokeWidth="1.6" />
    <path d="M19 27 L27 19 M37 19 L45 27 M45 37 L37 45 M27 45 L19 37" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="32" cy="32" r="2.5" fill="currentColor" opacity="0.9" />
  </svg>,
  // Content: layered plates
  <svg key="content" viewBox="0 0 64 64" fill="none" aria-hidden>
    <rect x="14" y="12" width="28" height="36" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.55" />
    <rect x="22" y="16" width="28" height="36" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M28 26 H42 M28 32 H38 M28 38 H44 M28 44 H36" stroke="currentColor" strokeWidth="1.4" opacity="0.8" />
  </svg>,
  // Intelligence: constellation
  <svg key="intel" viewBox="0 0 64 64" fill="none" aria-hidden>
    <circle cx="32" cy="32" r="18" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
    <circle cx="32" cy="32" r="10" stroke="currentColor" strokeWidth="1.3" opacity="0.65" />
    <circle cx="32" cy="32" r="3" fill="currentColor" />
    <line x1="32" y1="32" x2="50" y2="32" stroke="currentColor" strokeWidth="1" opacity="0.45" />
    <line x1="32" y1="32" x2="41" y2="16.4" stroke="currentColor" strokeWidth="1" opacity="0.45" />
    <line x1="32" y1="32" x2="23" y2="16.4" stroke="currentColor" strokeWidth="1" opacity="0.45" />
    <line x1="32" y1="32" x2="14" y2="32" stroke="currentColor" strokeWidth="1" opacity="0.45" />
    <line x1="32" y1="32" x2="23" y2="47.6" stroke="currentColor" strokeWidth="1" opacity="0.45" />
    <line x1="32" y1="32" x2="41" y2="47.6" stroke="currentColor" strokeWidth="1" opacity="0.45" />
    <circle cx="50" cy="32" r="2.4" fill="currentColor" opacity="0.9" />
    <circle cx="41" cy="16.4" r="2.4" fill="currentColor" opacity="0.9" />
    <circle cx="23" cy="16.4" r="2.4" fill="currentColor" opacity="0.9" />
    <circle cx="14" cy="32" r="2.4" fill="currentColor" opacity="0.9" />
    <circle cx="23" cy="47.6" r="2.4" fill="currentColor" opacity="0.9" />
    <circle cx="41" cy="47.6" r="2.4" fill="currentColor" opacity="0.9" />
  </svg>,
  // Training: torch / flame of judgement
  <svg key="train" viewBox="0 0 64 64" fill="none" aria-hidden>
    <path
      d="M32 8 C38 18 46 22 46 34 C46 43 39.5 50 32 50 C24.5 50 18 43 18 34 C18 22 26 18 32 8 Z"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <path d="M32 50 V58" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M24 58 H40" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M32 20 C34 26 38 28 38 34" stroke="currentColor" strokeWidth="1.3" opacity="0.65" />
  </svg>,
] as const;

export function Services({ hideIntro = false }: ServicesProps) {
  return (
    <section
      id="consultancy"
      className="relative overflow-hidden bg-forest pt-10 pb-20 lg:pt-12 lg:pb-28"
    >
      <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
        <HeroNetwork interactive={false} className="opacity-80" />
      </div>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_10%,rgba(184,139,54,0.08),transparent_50%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {hideIntro ? null : (
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.28em] text-gold uppercase">
              Consultancy
            </p>
            <h2 className="mt-4 font-serif text-4xl tracking-tight text-ivory sm:text-5xl">
              Capability with commercial intent.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-sage sm:text-lg">
              Each engagement is designed around operational clarity and
              measurable outcomes, not technology for its own sake.
            </p>
          </div>
        )}

        <div
          className={`grid gap-x-10 gap-y-12 md:grid-cols-2 xl:grid-cols-3 ${hideIntro ? "" : "mt-16"}`}
        >
          {services.map((service, index) => (
            <article
              key={service.title}
              className="group border-t border-[#d4af5a]/25 pt-8"
            >
              <div className="flex items-start justify-between gap-4">
                <p className="font-serif text-sm tracking-[0.2em] text-[#e0c078]/85">
                  {romanNumerals[index]}
                </p>
                <div className="h-12 w-12 text-[#e0c078] transition-transform duration-500 group-hover:scale-110 group-hover:text-[#f1e8d6]">
                  {serviceIcons[index]}
                </div>
              </div>
              <h3 className="mt-5 font-serif text-2xl tracking-tight text-ivory transition-colors group-hover:text-[#e0c078] sm:text-[1.65rem]">
                {service.title}
              </h3>
              <p className="mt-4 text-base leading-relaxed text-sage">
                {service.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
