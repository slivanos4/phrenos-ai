import { aboutPage } from "@/data/site-content";

export function AboutFocus() {
  return (
    <section className="bg-forest py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-serif text-3xl tracking-tight text-ivory sm:text-4xl">
            {aboutPage.closing.lead}
          </p>
          <p className="mt-3 font-serif text-3xl tracking-tight text-gold sm:text-4xl">
            {aboutPage.closing.emphasis}
          </p>
        </div>

        <div className="mt-16">
          <p className="text-center text-xs font-semibold tracking-[0.28em] text-gold uppercase">
            Areas I work in
          </p>
          <ul className="mx-auto mt-8 grid max-w-4xl gap-x-10 gap-y-4 sm:grid-cols-2">
            {aboutPage.focusAreas.map((item) => (
              <li
                key={item}
                className="border-t border-ivory/15 pt-4 text-base text-ivory/90"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
