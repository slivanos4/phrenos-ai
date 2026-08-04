import Link from "next/link";
import { aboutPreview } from "@/data/site-content";

export function AboutPreview() {
  return (
    <section id="about" className="bg-forest-secondary py-24 lg:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-12 lg:gap-16 lg:px-8">
        <div className="lg:col-span-5">
          <p className="text-xs font-semibold tracking-[0.28em] text-gold uppercase">
            {aboutPreview.eyebrow}
          </p>
          <h2 className="mt-4 font-serif text-4xl tracking-tight text-ivory sm:text-5xl">
            {aboutPreview.heading}
          </h2>
          <Link
            href={aboutPreview.cta.href}
            className="mt-8 inline-flex text-sm font-medium tracking-wide text-gold transition-colors hover:text-[#c99a45]"
          >
            {aboutPreview.cta.label}
            <span aria-hidden className="ml-2">
              →
            </span>
          </Link>
        </div>

        <div className="space-y-6 lg:col-span-7 lg:pt-10">
          {aboutPreview.narrative.map((paragraph) => (
            <p
              key={paragraph.slice(0, 32)}
              className="text-base leading-relaxed text-sage sm:text-lg"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
