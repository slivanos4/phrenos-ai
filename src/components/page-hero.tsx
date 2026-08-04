type PageHeroProps = {
  /** Filename stem under /brand/pages/{stem}.{webp,jpg} */
  image: "consultancy" | "approach" | "work" | "contact" | "ai-updates" | "about";
  eyebrow?: string;
  title?: string;
  description?: string;
  /** CSS object-position for desktop */
  position?: string;
  /** CSS object-position for mobile image band */
  mobilePosition?: string;
  /** Shorter frame that blends into the section below */
  compact?: boolean;
  /** Softer overlays so the artwork stays visible */
  lightWash?: boolean;
  /** On mobile, sit copy on the art instead of a solid panel below */
  overlayMobileCopy?: boolean;
};

function HeroCopy({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
}) {
  return (
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
  );
}

export function PageHero({
  image,
  eyebrow,
  title,
  description,
  position = "center",
  mobilePosition = "center",
  compact = false,
  lightWash = false,
  overlayMobileCopy = false,
}: PageHeroProps) {
  const hasCopy = Boolean(eyebrow || title || description);
  const srcJpg = `/brand/pages/${image}.jpg?v=5`;
  const srcWebp = `/brand/pages/${image}.webp?v=5`;
  const desktopMin = compact ? "min-h-[58svh]" : "min-h-[100svh]";
  const desktopPad = compact ? "pt-32 pb-24" : "pt-40";
  const bottomFade = lightWash
    ? compact
      ? "linear-gradient(180deg, rgba(6,8,7,0.22) 0%, transparent 28%, transparent 55%, rgba(16,28,20,0.35) 78%, rgba(16,28,20,0.72) 100%)"
      : "linear-gradient(180deg, rgba(6,8,7,0.28) 0%, transparent 24%, transparent 78%, rgba(6,8,7,0.4) 100%)"
    : compact
      ? "linear-gradient(180deg, rgba(6,8,7,0.45) 0%, transparent 22%, transparent 48%, rgba(16,28,20,0.55) 72%, rgba(16,28,20,0.92) 88%, #101C14 100%)"
      : "linear-gradient(180deg, rgba(6,8,7,0.5) 0%, transparent 18%, transparent 78%, rgba(6,8,7,0.55) 100%)";
  const sideFade = lightWash
    ? "linear-gradient(90deg, rgba(6,8,7,0.42) 0%, rgba(6,8,7,0.18) 28%, rgba(6,8,7,0.05) 55%, rgba(6,8,7,0.12) 100%)"
    : "linear-gradient(90deg, rgba(6,8,7,0.72) 0%, rgba(6,8,7,0.4) 30%, rgba(6,8,7,0.12) 55%, rgba(6,8,7,0.28) 100%)";
  const mobileWash = overlayMobileCopy
    ? "bg-[linear-gradient(180deg,rgba(6,8,7,0.45)_0%,rgba(6,8,7,0.25)_35%,rgba(16,28,20,0.55)_100%)]"
    : lightWash
      ? "bg-[linear-gradient(180deg,rgba(6,8,7,0.28)_0%,transparent_40%,transparent_62%,rgba(16,28,20,0.55)_88%,#101C14_100%)]"
      : "bg-[linear-gradient(180deg,rgba(6,8,7,0.45)_0%,transparent_35%,transparent_55%,rgba(16,28,20,0.75)_82%,#101C14_100%)]";

  return (
    <section
      className={`relative isolate overflow-hidden bg-forest ${compact ? "z-0" : ""}`}
    >
      {/* Mobile / tablet */}
      <div className="lg:hidden">
        {overlayMobileCopy ? (
          <div className="relative w-full">
            <picture>
              <source srcSet={srcWebp} type="image/webp" />
              <img
                src={srcJpg}
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-center"
                style={{ objectPosition: mobilePosition }}
                decoding="async"
                fetchPriority="high"
              />
            </picture>
            <div
              className={`pointer-events-none absolute inset-0 ${mobileWash}`}
              aria-hidden
            />
            <div className="relative z-10 px-6 pt-24 pb-8 sm:px-8 sm:pt-28 sm:pb-10">
              {hasCopy ? (
                <HeroCopy
                  eyebrow={eyebrow}
                  title={title}
                  description={description}
                />
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <div
              className={`relative w-full ${compact ? "aspect-[16/11] sm:aspect-[16/9]" : "aspect-[5/4] sm:aspect-[16/10]"}`}
            >
              <picture>
                <source srcSet={srcWebp} type="image/webp" />
                <img
                  src={srcJpg}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ objectPosition: mobilePosition }}
                  decoding="async"
                  fetchPriority="high"
                />
              </picture>
              <div
                className={`pointer-events-none absolute inset-0 ${mobileWash}`}
                aria-hidden
              />
              <div className="h-20 sm:h-[5.25rem]" aria-hidden />
            </div>

            {hasCopy ? (
              <div
                className={`relative z-10 bg-forest px-6 sm:px-8 ${
                  compact
                    ? "pt-6 pb-10 sm:pt-7 sm:pb-12"
                    : "pt-8 pb-12 sm:pt-10 sm:pb-14"
                }`}
              >
                <HeroCopy
                  eyebrow={eyebrow}
                  title={title}
                  description={description}
                />
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Desktop: full-bleed cinematic hero with overlaid copy */}
      <div className={`relative hidden lg:block ${desktopMin}`}>
        <picture className="absolute inset-0">
          <source srcSet={srcWebp} type="image/webp" />
          <img
            src={srcJpg}
            alt=""
            className="h-full w-full object-cover"
            style={{ objectPosition: position }}
            decoding="async"
            fetchPriority="high"
          />
        </picture>

        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `${sideFade}, ${bottomFade}` }}
          aria-hidden
        />

        {hasCopy ? (
          <div
            className={`relative z-10 mx-auto flex ${desktopMin} max-w-7xl items-start px-8 ${desktopPad}`}
          >
            <HeroCopy
              eyebrow={eyebrow}
              title={title}
              description={description}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
