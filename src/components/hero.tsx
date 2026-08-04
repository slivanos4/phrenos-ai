import Link from "next/link";
import { HeroNetwork } from "@/components/hero-network";
import { hero } from "@/data/site-content";

function AiEmphasis({
  prefix,
  ai,
  suffix,
}: {
  prefix: string;
  ai: string;
  suffix: string;
}) {
  return (
    <>
      {prefix}
      <span className="text-[1.15em] font-semibold tracking-tight text-[#b88b36]">
        {ai}
      </span>
      {suffix}
    </>
  );
}

function HeroCopy({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "max-w-xl" : "max-w-xl lg:max-w-2xl"}>
      <p className="animate-fade-up text-xs font-semibold tracking-[0.28em] text-[#e0c078] uppercase">
        {hero.eyebrow}
      </p>

      <h1
        className={`animate-fade-up-delay-1 mt-5 font-serif leading-[1.05] tracking-tight text-ivory ${
          compact
            ? "text-4xl sm:text-5xl"
            : "mt-6 text-5xl sm:text-6xl lg:text-[4.25rem]"
        }`}
      >
        {hero.headline}
      </h1>

      <p
        className={`animate-fade-up-delay-2 max-w-xl leading-relaxed text-ivory/95 ${
          compact ? "mt-5 text-base sm:text-lg" : "mt-8 text-lg sm:text-xl"
        }`}
      >
        {hero.supporting}
      </p>

      <p
        className={`animate-fade-up-delay-2 max-w-xl leading-relaxed text-ivory/88 ${
          compact ? "mt-4 text-sm sm:text-base" : "mt-5 text-base"
        }`}
      >
        {hero.secondary.lead}
        <span className="font-medium text-[#e0c078]">
          {hero.secondary.emphasis}
        </span>
      </p>

      <div
        className={`animate-fade-up-delay-3 flex flex-col gap-3 sm:flex-row sm:items-center ${
          compact ? "mt-8" : "mt-10 gap-4"
        }`}
      >
        <Link
          href={hero.primaryCta.href}
          className="cta-shimmer inline-flex items-center justify-center rounded-full border border-[#d4af5a] bg-ivory px-6 py-3.5 text-sm font-semibold tracking-wide text-forest transition-transform duration-300 hover:scale-[1.02] hover:bg-[#f7f0e2]"
        >
          <AiEmphasis
            prefix={hero.primaryCta.prefix}
            ai={hero.primaryCta.ai}
            suffix={hero.primaryCta.suffix}
          />
        </Link>
        <Link
          href={hero.secondaryCta.href}
          className="inline-flex items-center justify-center rounded-full border border-[#d4af5a]/70 px-6 py-3.5 text-sm font-medium tracking-wide text-ivory transition-colors hover:border-[#e0c078] hover:bg-[#d4af5a]/10"
        >
          <AiEmphasis
            prefix={hero.secondaryCta.prefix}
            ai={hero.secondaryCta.ai}
            suffix={hero.secondaryCta.suffix}
          />
        </Link>
      </div>
    </div>
  );
}

function PhiRitual({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute z-[2] text-[#e0c078]/45 ${className}`}
      aria-hidden
    >
      <svg viewBox="0 0 240 240" className="phi-ritual h-full w-full">
        <circle
          cx="120"
          cy="120"
          r="100"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.8"
          className="phi-ring phi-ring-1"
        />
        <circle
          cx="120"
          cy="120"
          r="72"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.8"
          className="phi-ring phi-ring-2"
        />
        <circle
          cx="120"
          cy="120"
          r="44"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.9"
          className="phi-ring phi-ring-3"
        />
        <text
          x="120"
          y="132"
          textAnchor="middle"
          className="phi-mark fill-current font-serif text-[64px]"
        >
          Φ
        </text>
      </svg>
    </div>
  );
}

const heroSrcJpg = "/brand/hero-bg-v13.jpg?v=2";
const heroSrcWebp = "/brand/hero-bg-v13.webp?v=2";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-forest">
      {/* Mobile: artwork band with constellation, then solid readable copy */}
      <div className="lg:hidden">
        <div className="relative aspect-[4/5] w-full overflow-hidden sm:aspect-[16/10]">
          <picture>
            <source srcSet={heroSrcWebp} type="image/webp" />
            <img
              src={heroSrcJpg}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-[68%_center] sm:object-[72%_center]"
              decoding="async"
              fetchPriority="high"
            />
          </picture>

          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(16,28,20,0.28)_0%,transparent_30%,transparent_58%,rgba(16,28,20,0.72)_88%,#101C14_100%)]"
            aria-hidden
          />

          <HeroNetwork />
          <PhiRitual className="top-[14%] right-[6%] h-28 w-28 sm:h-36 sm:w-36" />

          <div className="relative z-[3] h-20 sm:h-[5.25rem]" aria-hidden />
        </div>

        <div className="bg-forest px-6 pt-7 pb-14 sm:px-8 sm:pt-9 sm:pb-16">
          <HeroCopy compact />
        </div>
      </div>

      {/* Desktop: full-bleed cinematic hero */}
      <div className="relative hidden min-h-[100svh] lg:block">
        <picture className="absolute inset-0">
          <source srcSet={heroSrcWebp} type="image/webp" />
          <img
            src={heroSrcJpg}
            alt=""
            className="h-full w-full scale-[1.01] object-cover object-center"
            decoding="async"
            fetchPriority="high"
          />
        </picture>

        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(16,28,20,0.82)_0%,rgba(16,28,20,0.55)_30%,rgba(16,28,20,0.18)_52%,rgba(16,28,20,0.08)_72%,rgba(16,28,20,0.28)_100%),linear-gradient(180deg,rgba(16,28,20,0.35)_0%,transparent_18%,transparent_86%,rgba(16,28,20,0.45)_100%)]"
          aria-hidden
        />

        <HeroNetwork />
        <PhiRitual className="top-[18%] right-[12%] hidden h-56 w-56 lg:block xl:right-[16%] xl:h-64 xl:w-64" />

        <div className="relative z-[3] mx-auto flex min-h-[100svh] max-w-7xl items-center px-8 pt-36 pb-28">
          <div className="-translate-y-16">
            <HeroCopy />
          </div>
        </div>
      </div>
    </section>
  );
}
