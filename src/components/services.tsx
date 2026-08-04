import { romanNumerals, services } from "@/data/site-content";

type ServicesProps = {
  hideIntro?: boolean;
};

export function Services({ hideIntro = false }: ServicesProps) {
  return (
    <section
      id="consultancy"
      className="bg-forest pt-10 pb-16 lg:pt-12 lg:pb-24"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {hideIntro ? null : (
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.28em] text-gold uppercase">
              Consultancy
            </p>
            <h2 className="mt-4 font-serif text-4xl tracking-tight text-ivory sm:text-5xl">
              Capability with commercial intent.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-sage sm:text-lg">
              Each engagement is designed around operational clarity and
              measurable outcomes — not technology for its own sake.
            </p>
          </div>
        )}

        <div
          className={`grid gap-x-10 gap-y-12 md:grid-cols-2 xl:grid-cols-3 ${hideIntro ? "" : "mt-16"}`}
        >
          {services.map((service, index) => (
            <article
              key={service.title}
              className="group border-t border-ivory/15 pt-8"
            >
              <p className="font-serif text-sm tracking-[0.2em] text-gold/80">
                {romanNumerals[index]}
              </p>
              <h3 className="mt-4 font-serif text-2xl tracking-tight text-ivory transition-colors group-hover:text-gold sm:text-[1.65rem]">
                {service.title}
              </h3>
              <p className="mt-4 text-base leading-relaxed text-sage">
                {service.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
