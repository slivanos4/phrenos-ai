"use client";

import { credibility } from "@/data/site-content";

export function CredibilityStrip() {
  const items = [...credibility, ...credibility];

  return (
    <section
      aria-label="Areas of focus"
      className="relative overflow-hidden border-y border-ivory/10 bg-forest-secondary"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-forest-secondary to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-forest-secondary to-transparent" />

      <div className="flex overflow-hidden py-5">
        <div className="proof-marquee flex min-w-max items-center gap-10 px-6">
          {items.map((item, index) => (
            <div
              key={`${item}-${index}`}
              className="flex items-center gap-10"
            >
              <p className="proof-pass-shimmer text-xs font-medium tracking-[0.22em] uppercase sm:text-[0.7rem]">
                {item}
              </p>
              <span
                className="h-1.5 w-1.5 rounded-full bg-[#d4af5a]/70"
                aria-hidden
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
