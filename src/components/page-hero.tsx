type PageHeroProps = {
  /** Filename stem under /brand/pages/{stem}.{webp,jpg} */
  image: "consultancy" | "approach" | "work" | "contact" | "ai-updates";
  eyebrow?: string;
  title?: string;
  description?: string;
  /** CSS background-position */
  position?: string;
  /** Taller hero for pages with less content below */
  size?: "default" | "tall";
};

export function PageHero({
  image,
  eyebrow,
  title,
  description,
  position = "center",
  size = "default",
}: PageHeroProps) {
  const hasCopy = Boolean(eyebrow || title || description);
  const height =
    size === "tall"
      ? "min-h-[70svh] lg:min-h-[78svh]"
      : "min-h-[42svh] sm:min-h-[48svh] lg:min-h-[52svh]";

  return (
    <section
      className={`relative isolate overflow-hidden bg-[#0a0c0b] ${height}`}
    >
      <div
        className="absolute inset-0 scale-[1.01] bg-cover bg-no-repeat"
        style={{
          backgroundImage: `image-set(url('/brand/pages/${image}.webp') type('image/webp'), url('/brand/pages/${image}.jpg') type('image/jpeg'))`,
          backgroundPosition: position,
        }}
        aria-hidden
      />

      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(6,8,7,0.72)_0%,rgba(6,8,7,0.42)_34%,rgba(6,8,7,0.12)_58%,rgba(6,8,7,0.22)_100%),linear-gradient(180deg,rgba(6,8,7,0.45)_0%,transparent_22%,transparent_72%,rgba(6,8,7,0.72)_100%)]"
        aria-hidden
      />

      {hasCopy ? (
        <div className="relative mx-auto flex h-full min-h-[inherit] max-w-7xl items-end px-6 pb-14 pt-28 sm:pb-16 lg:px-8 lg:pb-20 lg:pt-36">
          <div className="max-w-2xl">
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
      ) : (
        <div className="h-20 sm:h-[5.25rem] lg:h-[5.5rem]" aria-hidden />
      )}
    </section>
  );
}
