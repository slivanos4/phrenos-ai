import Link from "next/link";
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
      <span className="text-[1.15em] font-semibold tracking-tight text-gold">
        {ai}
      </span>
      {suffix}
    </>
  );
}

export function Hero() {
  return (
    <section className="relative isolate min-h-[100svh] overflow-hidden bg-[#0a0c0b]">
      <div
        className="absolute inset-0 scale-[1.01] bg-cover bg-[position:70%_center] bg-no-repeat sm:bg-center"
        style={{
          backgroundImage:
            "image-set(url('/brand/hero-bg-v13.webp') type('image/webp'), url('/brand/hero-bg-v13.jpg') type('image/jpeg'))",
          imageRendering: "auto",
        }}
        aria-hidden
      />

      {/* Soft neutral wash for text readability — no colour cast */}
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(6,8,7,0.68)_0%,rgba(6,8,7,0.38)_28%,rgba(6,8,7,0.12)_50%,rgba(6,8,7,0.03)_70%,rgba(6,8,7,0.18)_100%),linear-gradient(180deg,rgba(6,8,7,0.28)_0%,transparent_18%,transparent_88%,rgba(6,8,7,0.38)_100%)]"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-[100svh] max-w-7xl items-center px-6 pt-32 pb-20 lg:px-8 lg:pt-36 lg:pb-28">
        <div className="max-w-xl -translate-y-14 lg:max-w-2xl lg:-translate-y-20">
          <p className="animate-fade-up text-xs font-semibold tracking-[0.28em] text-gold uppercase">
            {hero.eyebrow}
          </p>

          <h1 className="animate-fade-up-delay-1 mt-6 font-serif text-5xl leading-[1.05] tracking-tight text-ivory sm:text-6xl lg:text-[4.25rem]">
            {hero.headline}
          </h1>

          <p className="animate-fade-up-delay-2 mt-8 max-w-xl text-lg leading-relaxed text-ivory/90 sm:text-xl">
            {hero.supporting}
          </p>

          <p className="animate-fade-up-delay-2 mt-5 max-w-xl text-base leading-relaxed text-sage">
            {hero.secondary.lead}
            <span className="text-gold">{hero.secondary.emphasis}</span>
          </p>

          <div className="animate-fade-up-delay-3 mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href={hero.primaryCta.href}
              className="inline-flex items-center justify-center rounded-full border border-gold bg-ivory px-6 py-3.5 text-sm font-semibold tracking-wide text-forest transition-colors hover:bg-[#f7f0e2]"
            >
              <AiEmphasis
                prefix={hero.primaryCta.prefix}
                ai={hero.primaryCta.ai}
                suffix={hero.primaryCta.suffix}
              />
            </Link>
            <Link
              href={hero.secondaryCta.href}
              className="inline-flex items-center justify-center rounded-full border border-sage/70 px-6 py-3.5 text-sm font-medium tracking-wide text-ivory transition-colors hover:border-sage hover:bg-sage/10"
            >
              <AiEmphasis
                prefix={hero.secondaryCta.prefix}
                ai={hero.secondaryCta.ai}
                suffix={hero.secondaryCta.suffix}
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
