import Link from "next/link";
import { Reveal } from "@/components/home/motion";
import { caseStudies } from "@/data/case-studies";
import { selectedWork } from "@/data/site-content";

const webp = (path: string) => path.replace(/\.jpg$/, ".webp");

/** The five systems as cards, each opening its full case study. */
export function CaseStudyGrid() {
  return (
    <section className="relative z-10 mx-auto max-w-6xl px-6 pb-16 lg:px-8 lg:pb-24">
      <Reveal>
        <p className="text-xs font-semibold tracking-[0.28em] text-[#e0c078] uppercase">The full case studies</p>
        <h2 className="mt-3 font-serif text-3xl leading-tight tracking-tight text-ivory sm:text-4xl">
          The problem, the build and the result.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-sage">
          Each system, in detail: what was getting in the way, how it works, what it does and what changed.
        </p>
      </Reveal>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {caseStudies.map((study, index) => {
          const work = selectedWork.find((item) => item.title === study.title);
          if (!work) return null;
          return (
            <Reveal key={study.slug} delay={(index % 3) * 100} className="h-full">
              <Link
                href={`/work/${study.slug}`}
                data-track="case_study_click"
                data-track-location="work-grid"
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#d4af5a]/25 bg-forest-secondary/50 transition-all hover:-translate-y-1 hover:border-[#d4af5a]/55 hover:shadow-[0_18px_50px_rgba(212,175,90,0.12)]"
              >
                <picture className="relative block aspect-[4/3] overflow-hidden border-b border-[#d4af5a]/25">
                  <source srcSet={webp(work.image)} type="image/webp" />
                  <img
                    src={work.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover object-[50%_62%] transition-transform duration-[1400ms] group-hover:scale-105"
                  />
                  <span className="absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgba(16,28,20,0.85)_100%)]" aria-hidden />
                </picture>
                <div className="flex flex-1 flex-col p-6">
                  <p className="text-[11px] font-semibold tracking-[0.2em] text-sage uppercase">{work.tag}</p>
                  <h3 className="mt-2 font-serif text-2xl leading-snug text-ivory">{work.headline}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-sage">{study.summary}</p>
                  <p className="mt-auto pt-5 text-xs font-semibold tracking-[0.18em] text-[#e0c078] uppercase">
                    Read the case study{" "}
                    <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                  </p>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
