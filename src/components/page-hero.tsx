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

  return (
    <section className="relative isolate overflow-hidden bg-[#0a0c0b]">
      <div className="relative w-full">
        <picture>
          <source
            srcSet={`/brand/pages/${image}.webp`}
            type="image/webp"
          />
          <img
            src={`/brand/pages/${image}.jpg`}
            alt=""
            className="block h-auto w-full"
            style={{ objectPosition: position }}
            decoding="async"
            fetchPriority="high"
          />
        </picture>

        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(6,8,7,0.68)_0%,rgba(6,8,7,0.38)_32%,rgba(6,8,7,0.1)_55%,rgba(6,8,7,0.2)_100%),linear-gradient(180deg,rgba(6,8,7,0.42)_0%,transparent_18%,transparent_78%,rgba(6,8,7,0.55)_100%)]"
          aria-hidden
        />

        {hasCopy ? (
          <div className="absolute inset-0">
            <div className="mx-auto flex h-full max-w-7xl items-start px-6 pt-28 sm:pt-32 lg:px-8 lg:pt-36">
              <div className="max-w-2xl -translate-y-1 sm:translate-y-0 lg:translate-y-2">
                {eyebrow ? (
                  <p className="animate-fade-up text-xs font-semibold tracking-[0.28em] text-gold uppercase">
                    {eyebrow}
                  </p>
                ) : null}
                {title ? (
                  <h1 className="animate-fade-up-delay-1 mt-4 font-serif text-4xl tracking-tight text-ivory sm:text-5xl lg:text-[3.25rem]">
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
          </div>
        ) : null}
      </div>
    </section>
  );
}
