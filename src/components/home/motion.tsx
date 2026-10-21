"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Adds `is-visible` the first time the element scrolls into view. Pure DOM, no state, so it never re-renders. */
function useRevealOnce<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      element.classList.add("is-visible");
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            element.classList.add("is-visible");
            observer.disconnect();
          }
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -6% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return ref;
}

/** Fades and lifts its content into place on first view. Children may also use `.is-visible` descendants. */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const ref = useRevealOnce<HTMLElement>();
  return (
    <Tag
      ref={ref as never}
      className={`reveal ${className}`.trim()}
      style={{ ["--reveal-delay" as string]: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

/** A wrapper whose only job is to mark itself `is-visible` so CSS-drawn graphics can start. */
export function DrawOnView({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRevealOnce<HTMLDivElement>();
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/** Counts up to a number when first seen, keeping the final value in the HTML for search engines and no-JS visitors. */
export function CountUp({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") return;

    const rect = element.getBoundingClientRect();
    const alreadyInView = rect.top < window.innerHeight && rect.bottom > 0;
    if (alreadyInView) return;
    element.textContent = `0${suffix}`;

    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        const start = performance.now();
        const duration = 1600;
        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - progress, 3);
          element.textContent = `${Math.round(target * eased)}${suffix}`;
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [target, suffix]);

  return (
    <span ref={ref}>
      {target}
      {suffix}
    </span>
  );
}

export type Stage = { number: string; title: string; description: string; image: string };

/**
 * The amphora showcase: a sticky image that reassembles from shards as you scroll through the four stages.
 * On small screens each stage simply shows its own picture above its text.
 */
export function StageShowcase({ stages }: { stages: readonly Stage[] }) {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const index = stepRefs.current.indexOf(entry.target as HTMLLIElement);
            if (index >= 0) setActive(index);
          }
        }
      },
      { rootMargin: "-42% 0px -42% 0px" },
    );
    for (const element of stepRefs.current) if (element) observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-16">
      <ol className="relative">
        <span
          className="absolute top-2 bottom-2 left-[1.05rem] hidden w-px bg-gradient-to-b from-[#d4af5a]/60 via-[#d4af5a]/25 to-[#d4af5a]/60 lg:block"
          aria-hidden
        />
        {stages.map((stage, index) => (
          <li
            key={stage.title}
            ref={(element) => {
              stepRefs.current[index] = element;
            }}
            className="relative flex flex-col gap-5 py-6 lg:min-h-[58vh] lg:justify-center lg:py-10 lg:pl-14"
          >
            <span
              aria-hidden
              className={`absolute top-1/2 left-[0.45rem] hidden h-[1.35rem] w-[1.35rem] -translate-y-1/2 rounded-full border transition-all duration-700 lg:block ${
                active === index
                  ? "border-[#e0c078] bg-[#d4af5a] shadow-[0_0_28px_rgba(224,192,120,0.85)]"
                  : active > index
                    ? "border-[#d4af5a]/70 bg-[#d4af5a]/50"
                    : "border-[#d4af5a]/40 bg-forest"
              }`}
            />
            <picture className="block overflow-hidden rounded-2xl border border-[#d4af5a]/30 lg:hidden">
              <source srcSet={stage.image.replace(/\.jpg$/, ".webp")} type="image/webp" />
              <img
                src={stage.image}
                alt=""
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] w-full object-cover object-center"
              />
            </picture>
            <div
              className={`transition-all duration-700 ${active === index ? "lg:translate-x-0 lg:opacity-100" : "lg:translate-x-2 lg:opacity-45"}`}
            >
              <p className="font-serif text-4xl leading-none text-[#d4af5a] sm:text-5xl">{stage.number}</p>
              <h3 className="mt-3 font-serif text-3xl text-[#e0c078] sm:text-4xl">{stage.title}</h3>
              <p className="mt-3 max-w-md text-base leading-relaxed text-ivory/85">{stage.description}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="relative hidden lg:block">
        <div className="sticky top-28 aspect-[3/4] overflow-hidden rounded-3xl border border-[#d4af5a]/40 shadow-[0_0_80px_rgba(212,175,90,0.18)]">
          {stages.map((stage, index) => (
            <picture key={stage.title}>
              <source srcSet={stage.image.replace(/\.jpg$/, ".webp")} type="image/webp" />
              <img
                src={stage.image}
                alt={`${stage.title}: stage ${stage.number}`}
                loading={index === 0 ? "eager" : "lazy"}
                decoding="async"
                className={`stage-image absolute inset-0 h-full w-full object-cover ${active === index ? "is-active" : ""}`}
              />
            </picture>
          ))}
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_60%,rgba(16,28,20,0.7)_100%)]"
            aria-hidden
          />
          <p className="absolute bottom-5 left-6 font-serif text-sm tracking-[0.3em] text-[#e0c078] uppercase">
            {stages[active]?.title}
          </p>
        </div>
      </div>
    </div>
  );
}
