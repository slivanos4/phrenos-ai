import Image from "next/image";
import { aboutPage } from "@/data/site-content";

type AboutStoryProps = {
  hideIntro?: boolean;
};

export function AboutStory({ hideIntro = false }: AboutStoryProps) {
  return (
    <section className="bg-forest-secondary pt-10 pb-16 lg:pt-12 lg:pb-24">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-12 lg:gap-16 lg:px-8">
        <div className="lg:col-span-7">
          {hideIntro ? null : (
            <>
              <p className="text-xs font-semibold tracking-[0.28em] text-gold uppercase">
                {aboutPage.eyebrow}
              </p>
              <h1 className="mt-4 font-serif text-4xl tracking-tight text-ivory sm:text-5xl">
                {aboutPage.heading}
              </h1>
              <p className="mt-4 font-serif text-2xl tracking-tight text-gold sm:text-3xl">
                {aboutPage.supporting}
              </p>
            </>
          )}

          <div className={hideIntro ? "space-y-5" : "mt-8 space-y-5"}>
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
