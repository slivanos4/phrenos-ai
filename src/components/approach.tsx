import { approach } from "@/data/site-content";

type ApproachProps = {
  hideIntro?: boolean;
};

export function Approach({ hideIntro = false }: ApproachProps) {
  return (
    <section id="approach" className="bg-forest-secondary py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div
          className={
            hideIntro
              ? ""
              : "grid gap-12 lg:grid-cols-12 lg:gap-16"
          }
        >
          {hideIntro ? null : (
            <div className="lg:col-span-4">
              <p className="text-xs font-semibold tracking-[0.28em] text-gold uppercase">
                Approach
              </p>
              <h2 className="mt-4 font-serif text-4xl tracking-tight text-ivory sm:text-5xl">
                From opportunity to lasting capability.
              </h2>
              <p className="mt-6 text-base leading-relaxed text-sage sm:text-lg">
                {approach.intro}
              </p>
            </div>
          )}

          <ol
            className={`grid gap-10 sm:grid-cols-2 ${hideIntro ? "lg:grid-cols-4" : "lg:col-span-8"}`}
          >
            {approach.stages.map((stage) => (
              <li key={stage.title} className="relative">
                <p className="font-serif text-5xl text-gold/25">{stage.number}</p>
                <h3 className="mt-2 font-serif text-2xl text-ivory">
                  {stage.title}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-sage">
                  {stage.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
