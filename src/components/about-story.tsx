import Image from "next/image";
import { aboutPage } from "@/data/site-content";

export function AboutStory() {
  return (
    <section className="relative isolate overflow-hidden bg-[#0a0c0b]">
      <picture className="absolute inset-0">
        <source srcSet="/brand/pages/about.webp?v=6" type="image/webp" />
        <img
          src="/brand/pages/about.jpg?v=6"
          alt=""
          className="h-full w-full object-cover object-[68%_center]"
          decoding="async"
          fetchPriority="high"
        />
      </picture>

      {/* Soft wash so copy and portrait stay readable over the artwork */}
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(6,8,7,0.82)_0%,rgba(6,8,7,0.62)_38%,rgba(6,8,7,0.28)_62%,rgba(6,8,7,0.45)_100%),linear-gradient(180deg,rgba(6,8,7,0.55)_0%,transparent_16%,transparent_82%,rgba(6,8,7,0.7)_100%)]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto grid max-w-7xl gap-12 px-6 pt-32 pb-20 lg:grid-cols-12 lg:gap-16 lg:px-8 lg:pt-40 lg:pb-28">
        <div className="lg:col-span-7">
          <p className="text-xs font-semibold tracking-[0.28em] text-gold uppercase">
            {aboutPage.eyebrow}
          </p>
          <h1 className="mt-4 font-serif text-4xl tracking-tight text-ivory sm:text-5xl">
            {aboutPage.heading}
          </h1>
          <p className="mt-4 font-serif text-2xl tracking-tight text-gold sm:text-3xl">
            {aboutPage.supporting}
          </p>

          <div className="mt-8 space-y-5">
            {aboutPage.narrative.map((paragraph) => (
              <p
                key={paragraph.slice(0, 32)}
                className="text-base leading-relaxed text-ivory/85 sm:text-lg"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 lg:pt-10">
          <div className="relative mx-auto aspect-[4/5] max-w-sm overflow-hidden rounded-2xl border border-ivory/15 shadow-[0_24px_80px_rgba(0,0,0,0.45)] lg:max-w-none">
            <Image
              src={aboutPage.photo.src}
              alt={aboutPage.photo.alt}
              fill
              priority
              sizes="(min-width: 1024px) 33vw, 80vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
