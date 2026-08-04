import Image from "next/image";
import { aboutPage } from "@/data/site-content";

export function AboutStory() {
  return (
    <section className="relative isolate overflow-hidden bg-forest lg:min-h-[100svh]">
      {/* Mobile */}
      <div className="lg:hidden">
        <div className="relative aspect-[4/5] w-full">
          <picture>
            <source srcSet="/brand/pages/about.webp?v=7" type="image/webp" />
            <img
              src="/brand/pages/about.jpg?v=7"
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-[88%_center]"
              decoding="async"
              fetchPriority="high"
            />
          </picture>
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(16,28,20,0.45)_0%,transparent_28%,transparent_58%,rgba(16,28,20,0.92)_100%)]"
            aria-hidden
          />
          <div className="h-20 sm:h-[5.25rem]" aria-hidden />
        </div>

        <div className="bg-forest px-6 pt-8 pb-16 sm:px-8">
          <p className="text-[0.65rem] font-semibold tracking-[0.28em] text-gold uppercase sm:text-xs">
            {aboutPage.eyebrow}
          </p>

          <div className="relative mt-6 aspect-[4/5] w-[9.5rem] overflow-hidden rounded-2xl border border-ivory/15 sm:w-[11rem]">
            <Image
              src={aboutPage.photo.src}
              alt={aboutPage.photo.alt}
              fill
              priority
              sizes="11rem"
              className="object-cover"
            />
          </div>

          <h1 className="mt-8 font-serif text-[1.65rem] leading-snug tracking-tight text-ivory sm:text-[2rem] sm:whitespace-nowrap">
            {aboutPage.heading}
          </h1>
          <p className="mt-3 font-serif text-lg leading-snug tracking-tight text-gold sm:text-2xl">
            {aboutPage.supporting}
          </p>

          <div className="mt-10 space-y-5">
            {aboutPage.narrative.map((paragraph) => (
              <p
                key={paragraph.slice(0, 32)}
                className="text-base leading-relaxed text-sage sm:text-lg"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop: About → portrait → headline/story on the left; owl clear on the right */}
      <div className="relative hidden min-h-[100svh] lg:block">
        <picture className="absolute inset-0" aria-hidden>
          <source srcSet="/brand/pages/about.webp?v=7" type="image/webp" />
          <img
            src="/brand/pages/about.jpg?v=7"
            alt=""
            className="h-full w-full object-cover object-[96%_center]"
            decoding="async"
            fetchPriority="high"
          />
        </picture>

        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(16,28,20,0.82)_0%,rgba(16,28,20,0.68)_42%,rgba(16,28,20,0.35)_58%,rgba(16,28,20,0.1)_70%,transparent_80%),linear-gradient(180deg,rgba(16,28,20,0.35)_0%,transparent_18%,transparent_86%,rgba(16,28,20,0.4)_100%)]"
          aria-hidden
        />

        <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl items-center px-8 pt-32 pb-24">
          <div className="w-full max-w-[36rem] xl:max-w-[38rem]">
            <p className="text-xs font-semibold tracking-[0.28em] text-gold uppercase">
              {aboutPage.eyebrow}
            </p>

            <div className="relative mt-6 aspect-[4/5] w-[12rem] overflow-hidden rounded-2xl border border-ivory/15 shadow-[0_24px_80px_rgba(0,0,0,0.45)] xl:w-[13.5rem]">
              <Image
                src={aboutPage.photo.src}
                alt={aboutPage.photo.alt}
                fill
                priority
                sizes="13.5rem"
                className="object-cover"
              />
            </div>

            <h1 className="mt-8 font-serif text-[2.15rem] tracking-tight text-ivory whitespace-nowrap xl:text-[2.45rem]">
              {aboutPage.heading}
            </h1>
            <p className="mt-4 font-serif text-2xl tracking-tight text-gold">
              {aboutPage.supporting}
            </p>

            <div className="mt-7 space-y-4">
              {aboutPage.narrative.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 32)}
                  className="text-[0.95rem] leading-relaxed text-ivory/92 xl:text-base"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
