import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactCta } from "@/components/contact-cta";
import { DrawOnView, Reveal } from "@/components/home/motion";
import { PageHero } from "@/components/page-hero";
import { caseStudies, caseStudyBySlug } from "@/data/case-studies";
import { selectedWork } from "@/data/site-content";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return caseStudies.map((study) => ({ slug: study.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const study = caseStudyBySlug(slug);
  if (!study) return { title: "Case study" };
  return {
    title: study.name,
    description: study.summary,
    alternates: { canonical: `/work/${study.slug}` },
    openGraph: {
      title: study.name,
      description: study.summary,
      url: `/work/${study.slug}`,
    },
    twitter: { card: "summary_large_image", title: study.name, description: study.summary },
  };
}

const eyebrow = "text-xs font-semibold tracking-[0.28em] text-[#e0c078] uppercase";
const h2 = "mt-3 font-serif text-3xl leading-tight tracking-tight text-ivory sm:text-4xl";
const card = "rounded-2xl border border-[#d4af5a]/25 bg-forest-secondary/50 p-6";
const webp = (path: string) => path.replace(/\.jpg$/, ".webp");

export default async function CaseStudyPage({ params }: PageProps) {
  const { slug } = await params;
  const study = caseStudyBySlug(slug);
  if (!study) notFound();
  const work = selectedWork.find((item) => item.title === study.title);
  if (!work) notFound();

  const index = caseStudies.findIndex((item) => item.slug === study.slug);
  const others = caseStudies.filter((item) => item.slug !== study.slug);

  return (
    <>
      <PageHero
        image="work"
        position="center"
        mobilePosition="center 40%"
        compact
        lightWash
        copyGuard
        eyebrow={`Case study · ${work.tag}`}
        title={study.name}
        description={study.summary}
      />

      <section className="bg-forest pt-10 pb-6 lg:pt-12">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <Link
            href="/work"
            className="text-[11px] font-semibold tracking-[0.22em] text-sage uppercase transition-colors hover:text-[#e0c078]"
          >
            ← All case studies
          </Link>
          <dl className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-[#d4af5a]/30 bg-[#d4af5a]/20 sm:grid-cols-2 lg:grid-cols-4">
            {study.facts.map((fact) => (
              <div key={fact.label} className="bg-forest-secondary px-5 py-5">
                <dt className="text-[11px] font-semibold tracking-[0.2em] text-sage uppercase">{fact.label}</dt>
                <dd className="mt-2 text-sm leading-snug text-ivory">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* The problem */}
      <section className="bg-forest py-16 lg:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
          <Reveal>
            <p className={eyebrow}>The problem</p>
            <h2 className={h2}>What was getting in the way.</h2>
            <p className="mt-5 text-base leading-relaxed text-ivory/85 sm:text-lg">{study.problem}</p>
          </Reveal>
          <div>
            <Reveal>
              <p className="text-[11px] font-semibold tracking-[0.22em] text-sage uppercase">Why it was hard</p>
            </Reveal>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {study.hard.map((item, itemIndex) => (
                <Reveal key={item.title} delay={itemIndex * 90} className={card}>
                  <h3 className="font-serif text-xl text-[#e0c078]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-sage">{item.body}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* The solution */}
      <section className="border-y border-ivory/10 bg-forest-secondary py-16 lg:py-24">
        <div className="mx-auto grid max-w-6xl items-start gap-12 px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-16 lg:px-8">
          <Reveal>
            <p className={eyebrow}>The solution</p>
            <h2 className={h2}>What was built.</h2>
            <p className="mt-5 text-base leading-relaxed text-ivory/85 sm:text-lg">{study.solution}</p>
            <p className="mt-8 text-[11px] font-semibold tracking-[0.22em] text-sage uppercase">Design decisions</p>
            <ul className="mt-4 space-y-3">
              {study.decisions.map((decision) => (
                <li key={decision} className="flex gap-3 text-sm leading-relaxed text-ivory/90 sm:text-base">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d4af5a]" aria-hidden />
                  <span>{decision}</span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={150}>
            <picture className="block overflow-hidden rounded-3xl border border-[#d4af5a]/40 shadow-[0_0_70px_rgba(212,175,90,0.15)]">
              <source srcSet={webp(work.image)} type="image/webp" />
              <img
                src={work.image}
                alt={`${study.name}: the system`}
                loading="lazy"
                decoding="async"
                className="aspect-[3/4] w-full object-cover object-[50%_58%]"
              />
            </picture>
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-forest py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <Reveal>
            <p className={eyebrow}>How it works</p>
            <h2 className={h2}>From input to outcome.</h2>
          </Reveal>
          <DrawOnView className="relative mt-12">
            <span
              className="journey-line absolute top-3 bottom-3 left-[0.8rem] w-px bg-gradient-to-b from-[#d4af5a]/30 via-[#e0c078] to-[#d4af5a] lg:top-[0.8rem] lg:right-3 lg:bottom-auto lg:left-3 lg:h-px lg:w-auto lg:bg-gradient-to-r"
              aria-hidden
            />
            <ol
              className="relative grid gap-8 lg:gap-6 lg:[grid-template-columns:repeat(var(--steps),minmax(0,1fr))]"
              style={{ ["--steps" as string]: study.architecture.length }}
            >
              {study.architecture.map((step, stepIndex) => {
                const last = stepIndex === study.architecture.length - 1;
                return (
                  <li
                    key={step}
                    className="journey-node relative pl-12 lg:pt-12 lg:pl-0"
                    style={{ ["--step" as string]: stepIndex }}
                  >
                    <span
                      className={`absolute top-0.5 left-0 flex h-[1.65rem] w-[1.65rem] items-center justify-center rounded-full border lg:top-0 ${
                        last
                          ? "border-[#f0d9a0] bg-[#d4af5a] shadow-[0_0_32px_rgba(224,192,120,0.9)]"
                          : "border-[#d4af5a]/70 bg-forest"
                      }`}
                      aria-hidden
                    >
                      <span className={`h-2 w-2 rounded-full ${last ? "bg-forest" : "bg-[#d4af5a]"}`} />
                    </span>
                    <p className="lining font-serif text-sm text-[#d4af5a]">{String(stepIndex + 1).padStart(2, "0")}</p>
                    <h3 className="mt-1 font-serif text-xl leading-snug text-[#e0c078]">{step}</h3>
                  </li>
                );
              })}
            </ol>
          </DrawOnView>
          <Reveal>
            <p className="mt-10 max-w-2xl text-base leading-relaxed text-sage">{study.architectureNote}</p>
          </Reveal>
        </div>
      </section>

      {/* What it does */}
      <section className="border-y border-ivory/10 bg-forest-secondary py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <Reveal>
            <p className={eyebrow}>What it does</p>
            <h2 className={h2}>The capabilities.</h2>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {study.capabilities.map((item, itemIndex) => (
              <Reveal key={item.title} delay={(itemIndex % 3) * 90} className={`${card} bg-forest/60`}>
                <span className="block h-1.5 w-8 rounded-full bg-[#d4af5a]" aria-hidden />
                <h3 className="mt-5 font-serif text-xl leading-snug text-[#e0c078]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ivory/85">{item.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* The result */}
      <section className="bg-forest py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <Reveal>
            <p className={eyebrow}>The result</p>
            <h2 className={h2}>What changed.</h2>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-ivory/25 px-5 py-2 font-serif text-xl text-ivory/75 sm:text-2xl">
                {work.transformation.from}
              </span>
              <span className="text-2xl text-[#d4af5a]" aria-hidden>
                →
              </span>
              <span className="rounded-full border border-[#d4af5a]/70 bg-[#d4af5a]/12 px-5 py-2 font-serif text-xl text-[#f0d9a0] sm:text-2xl">
                {work.transformation.to}
              </span>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {study.results.map((item, itemIndex) => (
              <Reveal
                key={item.title}
                delay={itemIndex * 110}
                className="rounded-2xl border border-[#d4af5a]/35 bg-[linear-gradient(135deg,rgba(212,175,90,0.14),rgba(16,28,20,0.4))] p-6"
              >
                <h3 className="font-serif text-2xl text-[#e0c078]">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ivory/90">{item.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* What could this become */}
      <section className="border-y border-ivory/10 bg-forest-secondary py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <Reveal>
            <p className={eyebrow}>What could this become?</p>
            <ul className="mt-6 flex flex-wrap gap-3">
              {study.future.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-[#d4af5a]/40 px-4 py-2 text-sm text-ivory/90"
                >
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* The other case studies */}
      <section className="bg-forest py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className={eyebrow}>More work</p>
              <h2 className={h2}>The other systems.</h2>
            </div>
            <Link
              href="/work"
              className="text-xs font-semibold tracking-[0.18em] text-[#e0c078] uppercase underline-offset-4 hover:underline"
            >
              All case studies →
            </Link>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {others.map((item, itemIndex) => {
              const otherWork = selectedWork.find((entry) => entry.title === item.title);
              return (
                <Reveal key={item.slug} delay={itemIndex * 90} className="h-full">
                  <Link
                    href={`/work/${item.slug}`}
                    className={`${card} group flex h-full flex-col transition-all hover:-translate-y-1 hover:border-[#d4af5a]/55`}
                  >
                    <p className="text-[11px] font-semibold tracking-[0.2em] text-sage uppercase">{otherWork?.tag}</p>
                    <h3 className="mt-2 font-serif text-xl leading-snug text-ivory">{otherWork?.headline}</h3>
                    <p className="mt-auto pt-5 text-xs font-semibold tracking-[0.18em] text-[#e0c078] uppercase">
                      Read the case study{" "}
                      <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                    </p>
                  </Link>
                </Reveal>
              );
            })}
          </div>
          <p className="sr-only">
            Case study {index + 1} of {caseStudies.length}
          </p>
        </div>
      </section>

      <ContactCta
        heading="Facing something like this?"
        supporting="Describe the process in a short note. Every system here started with exactly that."
      />
    </>
  );
}
