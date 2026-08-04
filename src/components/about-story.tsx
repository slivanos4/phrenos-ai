import Image from "next/image";
import Link from "next/link";
import { aboutPage } from "@/data/site-content";

export function AboutStory() {
  return (
    <section className="bg-forest-secondary py-24 lg:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-12 lg:gap-16 lg:px-8">
        <div className="lg:col-span-7">
          <p className="text-xs font-semibold tracking-[0.28em] text-gold uppercase">
            {aboutPage.eyebrow}
          </p>
          <h1 className="mt-4 font-serif text-4xl tracking-tight text-ivory sm:text-5xl">
            {aboutPage.heading}
          </h1>

          <div className="mt-8 space-y-5">
            {aboutPage.narrative.map((paragraph) => (
              <p
                key={paragraph.slice(0, 32)}
                className="text-base leading-relaxed text-sage sm:text-lg"
              >
                {paragraph}
              </p>
            ))}
          </div>

          <Link
            href={aboutPage.cta.href}
            className="mt-8 inline-flex text-sm font-medium tracking-wide text-gold transition-colors hover:text-[#c99a45]"
          >
            {aboutPage.cta.label}
            <span aria-hidden className="ml-2">
              →
            </span>
          </Link>
        </div>

        <div className="lg:col-span-5">
          <div className="relative mx-auto aspect-[4/5] max-w-sm overflow-hidden rounded-2xl border border-ivory/10 lg:max-w-none">
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
