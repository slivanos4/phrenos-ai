type PageHeroProps = {
  /** Filename stem under /brand/pages/{stem}.{webp,jpg} */
  image: "consultancy" | "approach" | "work" | "contact" | "ai-updates";
  eyebrow?: string;
  title?: string;
  description?: string;
  /** CSS object-position for the image */
  position?: string;
};

export function PageHero({
  image,
  eyebrow,
  title,
  description,
  position = "center",
}: PageHeroProps) {
  const hasCopy = Boolean(eyebrow || title || description);
  const srcJpg = `/brand/pages/${image}.jpg?v=3`;
  const srcWebp = `/brand/pages/${image}.webp?v=3`;

  return (
    <section className="relative isolate overflow-hidden bg-[#0a0c0b]">
      {/* Tall frame so the full artwork fits without cropping */}
      <div className="relative flex min-h-[88svh] w-full items-center justify-center lg:min-h-[92svh]">
        <picture className="absolute inset-0">
          <source srcSet={srcWebp} type="image/webp" />
          <img
            src={srcJpg}
            alt=""
            className="h-full w-full object-contain"
            style={{ objectPosition: position }}
            decoding="async"
            fetchPriority="high"
          />
        </picture>

        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(6,8,7,0.72)_0%,rgba(6,8,7,0.4)_30%,rgba(6,8,7,0.12)_55%,rgba(6,8,7,0.28)_100%),linear-gradient(180deg,rgba(6,8,7,0.55)_0%,transparent_20%,transparent_75%,rgba(6,8,7,0.7)_100%)]"
          aria-hidden
        />

        {hasCopy ? (
          <div className="relative z-10 mx-auto flex h-full min-h-[88svh] w-full max-w-7xl items-start self-stretch px-6 pt-28 sm:pt-32 lg:min-h-[92svh] lg:px-8 lg:pt-40">
            <div className="max-w-2xl">
              {eyebrow ? (
                <p className="animate-fade-up text-xs font-semibold tracking-[0.28em] text-gold uppercase">
                  {eyebrow}
                </p>
              ) : null}
              {title ? (
                <h1 className="animate-fade-up-delay-1 mt-4 font-serif text-4xl tracking-tight text-ivory sm:text-5xl lg:text-[3.35rem]">
                  {title}
                </h1>
              ) : null}
              {description ? (
                <p className="animate-fade-up-delay-2 mt-5 max-w-xl text-base leading-relaxed text-sage sm:text-lg">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
