"use client";

import { useEffect, useRef, useState } from "react";
import { approach } from "@/data/site-content";

type ApproachProps = {
  hideIntro?: boolean;
};

export function Approach({ hideIntro = false }: ApproachProps) {
  const listRef = useRef<HTMLOListElement>(null);
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
      { threshold: 0.18 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="approach"
      className="relative overflow-hidden bg-forest-secondary pt-10 pb-20 lg:pt-12 lg:pb-28"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(184,139,54,0.1),transparent_55%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {hideIntro ? null : (
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.28em] text-gold uppercase">
              Approach
            </p>
            <h2 className="mt-4 font-serif text-4xl tracking-tight text-ivory sm:text-5xl">
              From opportunity to lasting capability.
            </h2>
            <p className="mt-6 text-base leading-relaxed text-sage sm:text-lg">
              {approach.intro}
            </p>
          </div>
        )}

        <ol
          ref={listRef}
          className={`relative grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6 ${
            hideIntro ? "" : "mt-14"
          }`}
        >
          <div
            className={`approach-thread pointer-events-none absolute top-[38%] right-[8%] left-[8%] hidden h-px lg:block ${
              visible ? "is-visible" : ""
            }`}
            aria-hidden
          />

          {approach.stages.map((stage, index) => (
            <li
              key={stage.title}
              className={`approach-stage group relative ${visible ? "is-visible" : ""}`}
              style={{ transitionDelay: `${index * 120}ms` }}
            >
              <div className="relative overflow-hidden rounded-sm border border-[#d4af5a]/25 bg-[#0c1510]">
                <div className="relative aspect-[3/4] overflow-hidden bg-[#0a100c]">
                  <img
                    src={`${stage.image}?v=4`}
                    alt=""
                    className="h-full w-full object-cover object-[center_42%] transition-transform duration-700 group-hover:scale-[1.03]"
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                  <div
                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(8,12,10,0.12)_0%,transparent_30%,rgba(8,12,10,0.55)_100%)]"
                    aria-hidden
                  />
                  <p className="absolute top-3 left-3 font-serif text-3xl text-[#e0c078]/90 sm:top-4 sm:left-4 sm:text-4xl">
                    {stage.number}
                  </p>
                  {index === approach.stages.length - 1 ? (
                    <span
                      className="absolute top-3 right-3 font-serif text-2xl text-[#d4af5a]/75 sm:top-4 sm:right-4 sm:text-3xl"
                      aria-hidden
                    >
                      Φ
                    </span>
                  ) : null}
                </div>
                <div className="px-4 pt-4 pb-5 sm:px-5 sm:pb-6">
                  <h3 className="font-serif text-[1.65rem] font-semibold tracking-tight text-[#e0c078] sm:text-2xl">
                    {stage.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-sage">
                    {stage.description}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
