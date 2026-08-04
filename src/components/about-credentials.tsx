import { aboutPage } from "@/data/site-content";

export function AboutCredentials() {
  return (
    <section className="bg-forest py-24 lg:py-32">
      <div className="mx-auto grid max-w-7xl gap-16 px-6 lg:grid-cols-12 lg:gap-16 lg:px-8">
        <div className="lg:col-span-7">
          <p className="text-xs font-semibold tracking-[0.28em] text-gold uppercase">
            Track record
          </p>
          <h2 className="mt-4 font-serif text-3xl tracking-tight text-ivory sm:text-4xl">
            9+ years turning manual process into intelligent workflow.
          </h2>

          <ol className="mt-12 space-y-10 border-l border-ivory/15 pl-8">
            {aboutPage.trackRecord.map((item) => (
              <li key={item.role} className="relative">
                <span
                  aria-hidden
                  className="absolute -left-[2.15rem] top-1.5 h-2.5 w-2.5 rounded-full border border-gold bg-forest"
                />
                <p className="text-xs font-semibold tracking-[0.2em] text-gold/80 uppercase">
                  {item.period}
                </p>
                <h3 className="mt-2 font-serif text-xl tracking-tight text-ivory sm:text-2xl">
                  {item.role}
                </h3>
                <p className="mt-1 text-sm text-sage/80">{item.org}</p>
                <p className="mt-3 text-base leading-relaxed text-sage">
                  {item.description}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-14 lg:col-span-5">
          <div>
            <p className="text-xs font-semibold tracking-[0.28em] text-gold uppercase">
              Core expertise
            </p>
            <ul className="mt-6 space-y-3">
              {aboutPage.expertise.map((item) => (
                <li
                  key={item}
                  className="border-t border-ivory/15 pt-3 text-base text-ivory/90"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-[0.28em] text-gold uppercase">
              Education
            </p>
            <ul className="mt-6 space-y-4">
              {aboutPage.education.map((item) => (
                <li key={item.qualification}>
                  <p className="text-base text-ivory/90">
                    {item.qualification}
                  </p>
                  <p className="mt-0.5 text-sm text-sage/80">
                    {item.institution}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
