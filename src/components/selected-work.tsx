import { selectedWork } from "@/data/site-content";

export function SelectedWork() {
  return (
    <section id="work" className="bg-forest py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.28em] text-gold uppercase">
            Selected work
          </p>
          <h2 className="mt-4 font-serif text-4xl tracking-tight text-ivory sm:text-5xl">
            Systems that turn intelligence into action.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-sage sm:text-lg">
            A selection of engagements spanning competitive intelligence,
            content operations, governance and organisational knowledge.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          {selectedWork.map((item) => (
            <article
              key={item.title}
              className="flex flex-col border-l border-gold/40 bg-forest-secondary/40 py-8 pl-6 pr-4 sm:pl-8"
            >
              <h3 className="font-serif text-2xl tracking-tight text-ivory sm:text-[1.7rem]">
                {item.title}
              </h3>

              <dl className="mt-8 space-y-5 text-sm leading-relaxed sm:text-base">
                <div>
                  <dt className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">
                    Problem
                  </dt>
                  <dd className="mt-2 text-sage">{item.problem}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">
                    Solution
                  </dt>
                  <dd className="mt-2 text-sage">{item.solution}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">
                    Impact
                  </dt>
                  <dd className="mt-2 text-ivory/85">{item.impact}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
