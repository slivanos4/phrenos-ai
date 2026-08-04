"use client";

import { useEffect, useRef, useState } from "react";
import { aboutPage, romanNumerals } from "@/data/site-content";

const focusIcons = [
  // Strategy: radiating diamond
  <svg key="strategy" viewBox="0 0 48 48" fill="none" aria-hidden>
    <path d="M24 6 L42 24 L24 42 L6 24 Z" stroke="currentColor" strokeWidth="1.8" />
    <path d="M24 14 L34 24 L24 34 L14 24 Z" stroke="currentColor" strokeWidth="1.4" opacity="0.7" />
    <circle cx="24" cy="24" r="2.5" fill="currentColor" />
  </svg>,
  // Automation: linked nodes
  <svg key="auto" viewBox="0 0 48 48" fill="none" aria-hidden>
    <circle cx="12" cy="24" r="4.5" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="24" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="36" cy="24" r="4.5" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="24" cy="36" r="4.5" stroke="currentColor" strokeWidth="1.8" />
    <path d="M15.5 21.5 L20.5 15.5 M27.5 15.5 L32.5 21.5 M32.5 26.5 L27.5 32.5 M20.5 32.5 L15.5 26.5" stroke="currentColor" strokeWidth="1.5" />
  </svg>,
  // Assistants: twin arcs
  <svg key="assist" viewBox="0 0 48 48" fill="none" aria-hidden>
    <path d="M14 34 C14 24 20 18 24 18 C28 18 34 24 34 34" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="24" cy="14" r="5.5" stroke="currentColor" strokeWidth="1.8" />
    <path d="M10 36 C12 28 16 24 20 24" stroke="currentColor" strokeWidth="1.4" opacity="0.7" />
    <path d="M38 36 C36 28 32 24 28 24" stroke="currentColor" strokeWidth="1.4" opacity="0.7" />
  </svg>,
  // Search: concentric
  <svg key="search" viewBox="0 0 48 48" fill="none" aria-hidden>
    <circle cx="22" cy="22" r="11" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="22" cy="22" r="5" stroke="currentColor" strokeWidth="1.4" opacity="0.7" />
    <path d="M30 30 L39 39" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>,
  // Prompt: brackets
  <svg key="prompt" viewBox="0 0 48 48" fill="none" aria-hidden>
    <path d="M18 10 L10 24 L18 38" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M30 10 L38 24 L30 38" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M22 30 L26 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>,
  // Reporting: classical columns rising
  <svg key="report" viewBox="0 0 48 48" fill="none" aria-hidden>
    <path d="M10 38 V22 M20 38 V14 M30 38 V26 M38 38 V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M8 38 H40" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
  </svg>,
  // Training: open form / torch
  <svg key="train" viewBox="0 0 48 48" fill="none" aria-hidden>
    <path d="M24 8 C28 16 34 18 34 26 C34 32 29.5 36 24 36 C18.5 36 14 32 14 26 C14 18 20 16 24 8 Z" stroke="currentColor" strokeWidth="1.8" />
    <path d="M24 36 V42" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M18 42 H30" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>,
  // Product: blooming hex
  <svg key="product" viewBox="0 0 48 48" fill="none" aria-hidden>
    <path d="M24 8 L38 16 V32 L24 40 L10 32 V16 Z" stroke="currentColor" strokeWidth="1.8" />
    <path d="M24 16 L31 20 V28 L24 32 L17 28 V20 Z" stroke="currentColor" strokeWidth="1.4" opacity="0.75" />
  </svg>,
] as const;

function OrreryGraphic() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
      <div className="relative h-[min(58vw,22rem)] w-[min(58vw,22rem)] text-gold/40">
        <svg viewBox="0 0 400 400" className="animate-orrery h-full w-full">
          <circle cx="200" cy="200" r="170" stroke="currentColor" strokeWidth="0.6" fill="none" opacity="0.35" />
          <circle cx="200" cy="200" r="130" stroke="currentColor" strokeWidth="0.6" fill="none" opacity="0.45" />
          <circle cx="200" cy="200" r="90" stroke="currentColor" strokeWidth="0.7" fill="none" opacity="0.55" />
          <path d="M200 30 V70 M200 330 V370 M30 200 H70 M330 200 H370" stroke="currentColor" strokeWidth="0.7" opacity="0.4" />
          <circle cx="200" cy="30" r="3" fill="currentColor" className="opacity-80" />
          <circle cx="370" cy="200" r="2.5" fill="currentColor" className="opacity-70" />
          <circle cx="200" cy="370" r="2" fill="currentColor" className="opacity-60" />
          <circle cx="30" cy="200" r="2.5" fill="currentColor" className="opacity-70" />
        </svg>
        <svg
          viewBox="0 0 400 400"
          className="animate-orrery-reverse absolute inset-0 h-full w-full"
        >
          <ellipse cx="200" cy="200" rx="155" ry="70" stroke="currentColor" strokeWidth="0.55" fill="none" opacity="0.35" transform="rotate(28 200 200)" />
          <ellipse cx="200" cy="200" rx="155" ry="70" stroke="currentColor" strokeWidth="0.55" fill="none" opacity="0.28" transform="rotate(-34 200 200)" />
          <circle cx="320" cy="145" r="3.5" fill="currentColor" opacity="0.75" />
          <circle cx="95" cy="250" r="2.5" fill="currentColor" opacity="0.65" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-serif text-4xl text-gold/45 sm:text-5xl">Φ</span>
        </div>
      </div>
    </div>
  );
}

export function AboutFocus() {
  const listRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Manifesto: own stage */}
      <section className="relative isolate overflow-hidden bg-forest py-16 sm:py-20 lg:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(184,139,54,0.18),transparent_52%)]" />
        <OrreryGraphic />

        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center justify-center px-6 text-center lg:px-8">
          <p className="animate-fade-up text-xs font-semibold tracking-[0.32em] text-[#d4af5a] uppercase">
            The point of view
          </p>
          <h2 className="animate-fade-up-delay-1 mt-5 font-serif text-3xl leading-[1.15] tracking-tight text-ivory sm:text-4xl lg:text-[2.75rem]">
            {aboutPage.closing.lead}
          </h2>
          <p className="animate-fade-up-delay-2 mt-4 max-w-3xl font-serif text-2xl leading-snug tracking-tight text-[#e0c078] sm:text-3xl lg:text-[2.15rem] [text-shadow:0_1px_18px_rgba(16,28,20,0.85)]">
            {aboutPage.closing.emphasis}
          </p>
        </div>
      </section>

      {/* Disciplines: separate, graphic-led */}
      <section className="relative overflow-hidden bg-forest-secondary py-16 lg:py-20">
        <div
          className="pointer-events-none absolute top-0 left-1/2 h-px w-[min(70%,36rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#d4af5a] to-transparent"
          aria-hidden
        />

        <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold tracking-[0.28em] text-[#d4af5a] uppercase">
              Areas I work in
            </p>
            <h2 className="mt-3 font-serif text-3xl tracking-tight text-ivory sm:text-4xl">
              Eight disciplines. One mind.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-sage sm:text-base">
              Strategy, systems and enablement, designed to turn AI from
              spectacle into lasting capability.
            </p>
          </div>

          <div
            ref={listRef}
            className="mt-10 grid gap-3 sm:grid-cols-2"
          >
            {aboutPage.focusAreas.map((item, index) => (
              <article
                key={item}
                className={`focus-reveal group relative flex items-center gap-4 overflow-hidden border border-[#d4af5a]/35 bg-forest/55 px-4 py-4 transition-[border-color,background-color,transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-[#e0c078] hover:bg-forest/80 hover:shadow-[0_0_0_1px_rgba(224,192,120,0.25),0_18px_40px_rgba(0,0,0,0.35)] sm:gap-5 sm:px-5 sm:py-5 ${visible ? "is-visible" : ""}`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-[#d4af5a] transition-all duration-300 group-hover:w-1.5 group-hover:bg-[#e0c078]"
                  aria-hidden
                />

                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center border border-[#d4af5a]/55 bg-[#d4af5a]/10 text-[#e0c078] transition-colors duration-300 group-hover:border-[#e0c078] group-hover:bg-[#d4af5a]/20 sm:h-16 sm:w-16">
                  <span className="h-8 w-8 sm:h-9 sm:w-9">{focusIcons[index]}</span>
                </div>

                <div className="min-w-0 flex-1 pr-1">
                  <p className="font-serif text-sm tracking-[0.18em] text-[#e0c078]">
                    {romanNumerals[index]}
                  </p>
                  <h3 className="mt-1 font-serif text-lg leading-snug tracking-tight text-ivory transition-colors duration-300 group-hover:text-[#f0d9a0] sm:text-xl">
                    {item}
                  </h3>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
