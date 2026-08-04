import { credibility } from "@/data/site-content";

export function CredibilityStrip() {
  return (
    <section
      aria-label="Areas of focus"
      className="border-y border-ivory/10 bg-forest-secondary"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-6 py-8 lg:justify-between lg:px-8">
        {credibility.map((item) => (
          <p
            key={item}
            className="text-xs font-medium tracking-[0.22em] text-sage uppercase sm:text-[0.7rem]"
          >
            {item}
          </p>
        ))}
      </div>
    </section>
  );
}
