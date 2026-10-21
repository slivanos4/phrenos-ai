import Link from "next/link";
import { ServiceIcon, SignalNoise } from "@/components/home/graphics";
import { CountUp, Reveal, StageShowcase } from "@/components/home/motion";
import { approach, homePage, selectedWork } from "@/data/site-content";
import type { PublishedPost } from "@/lib/phrenos-updates/types";

const eyebrow = "text-xs font-semibold tracking-[0.28em] text-[#e0c078] uppercase";
const card =
  "rounded-2xl border border-[#d4af5a]/25 bg-forest-secondary/50 p-6 transition-colors hover:border-[#d4af5a]/55";
const sectionLink =
  "text-xs font-semibold tracking-[0.18em] text-[#e0c078] uppercase underline-offset-4 hover:underline";

function SectionHeading({ label, heading }: { label: string; heading: string }) {
  return (
    <div className="max-w-2xl">
      <p className={eyebrow}>{label}</p>
      <h2 className="mt-3 font-serif text-3xl leading-tight tracking-tight text-ivory sm:text-4xl lg:text-[2.75rem]">
        {heading}
      </h2>
    </div>
  );
}

export function ProblemSection() {
  const { problems } = homePage;
  return (
    <section className="relative overflow-hidden bg-forest py-20 lg:py-28">
      <div
        className="pointer-events-none absolute -top-40 -right-40 h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle,rgba(212,175,90,0.12),transparent_65%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
        <Reveal>
          <SectionHeading label={problems.eyebrow} heading={problems.heading} />
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {problems.items.map((item, index) => (
            <Reveal key={item.title} delay={index * 110} className={card}>
              <span className="block h-1.5 w-8 rounded-full bg-[#d4af5a]" aria-hidden />
              <h3 className="mt-5 font-serif text-xl leading-snug text-[#e0c078]">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-sage">{item.body}</p>
            </Reveal>
          ))}
        </div>

        <div className="mt-16 lg:mt-20">
          <SignalNoise from={problems.bridge.from} to={problems.bridge.to} />
          <Reveal className="mt-6 text-center">
            <p className="font-serif text-2xl text-ivory sm:text-3xl">{problems.bridge.line}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function OutcomesSection() {
  const { outcomes } = homePage;
  return (
    <section className="border-y border-ivory/10 bg-forest-secondary py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading label={outcomes.eyebrow} heading={outcomes.heading} />
          <Link href={outcomes.link.href} className={sectionLink}>
            {outcomes.link.label} →
          </Link>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {outcomes.items.map((item, index) => (
            <Reveal key={item.title} delay={index * 90} className="h-full">
              <Link
                href="/consultancy"
                className={`${card} group flex h-full flex-col bg-forest/60 hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(212,175,90,0.12)]`}
              >
                <span className="text-[#d4af5a] transition-colors group-hover:text-[#f0d9a0]">
                  <ServiceIcon index={index} />
                </span>
                <h3 className="mt-5 font-serif text-2xl leading-snug text-[#e0c078]">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ivory/85">{item.body}</p>
                <p className="mt-auto pt-5 text-[11px] font-semibold tracking-[0.18em] text-sage uppercase transition-colors group-hover:text-[#e0c078]">
                  {item.service}
                </p>
              </Link>
            </Reveal>
          ))}
          <Reveal delay={outcomes.items.length * 90} className="h-full">
            <Link
              href="/resources/ai-readiness"
              data-track="cta_readiness_check"
              data-track-location="home-outcomes"
              className="group flex h-full flex-col justify-between rounded-2xl border border-[#d4af5a]/50 bg-[linear-gradient(145deg,rgba(212,175,90,0.28),rgba(16,28,20,0.85))] p-6 transition-all hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(212,175,90,0.2)]"
            >
              <div>
                <p className="text-[11px] font-semibold tracking-[0.22em] text-[#e0c078] uppercase">
                  Not sure where to start?
                </p>
                <h3 className="mt-4 font-serif text-3xl leading-snug text-[#f0d9a0]">
                  See where you stand in eight questions.
                </h3>
              </div>
              <p className="mt-8 text-xs font-semibold tracking-[0.18em] text-[#e0c078] uppercase">
                Take the free AI readiness check{" "}
                <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </p>
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

const webp = (path: string) => path.replace(/\.jpg$/, ".webp");

function TransformViz({ title, from, to }: { title: string; from: string; to: string }) {
  if (title === "Content Buddy") {
    // Seven systems merging into one place: the number comes from the case study itself.
    return (
      <div className="dot-merge mt-5" aria-label="Seven systems merged into one chat">
        <div className="flex items-center gap-2">
          {Array.from({ length: 7 }).map((_, index) => (
            <span
              key={index}
              style={{ ["--dot-shift" as string]: `${(6 - index) * 22}px` }}
              className={`h-3 w-3 rounded-full ${
                index === 6 ? "bg-[#e0c078] shadow-[0_0_18px_rgba(224,192,120,0.9)]" : "dot-extra bg-sage/70"
              }`}
            />
          ))}
        </div>
        <div className="mt-3 flex justify-between text-[11px] tracking-[0.12em] text-sage uppercase">
          <span>{from}</span>
          <span className="text-[#e0c078]">{to}</span>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-5 space-y-3" role="img" aria-label={`${from}, then ${to}`}>
      <div>
        <div className="mb-1 flex justify-between text-[11px] tracking-[0.12em] text-sage uppercase">
          <span>Before</span>
          <span>{from}</span>
        </div>
        <div className="h-2 rounded-full bg-sage/50" />
      </div>
      <div>
        <div className="mb-1 flex justify-between text-[11px] tracking-[0.12em] text-[#e0c078] uppercase">
          <span>After</span>
          <span>{to}</span>
        </div>
        <div className="h-2 rounded-full bg-ivory/10">
          <div className="time-bar-after h-full rounded-full bg-gradient-to-r from-[#d4af5a] to-[#f0d9a0] shadow-[0_0_16px_rgba(224,192,120,0.7)]" />
        </div>
      </div>
    </div>
  );
}

export function ProofSection() {
  const { proof } = homePage;
  const cases = ["Competitive Intelligence", "Content Buddy", "Monthly Report Automation"]
    .map((title) => selectedWork.find((item) => item.title === title))
    .filter((item): item is (typeof selectedWork)[number] => Boolean(item));
  const counts = [
    { target: 40, suffix: "+" },
    { target: 5, suffix: "" },
  ];
  return (
    <section className="bg-forest py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading label={proof.eyebrow} heading={proof.heading} />
          <Link href={proof.link.href} className={sectionLink}>
            {proof.link.label} →
          </Link>
        </Reveal>

        <dl className="mt-10 grid gap-5 sm:grid-cols-3">
          {proof.stats.map((stat, index) => (
            <Reveal
              key={stat.label}
              delay={index * 120}
              className="rounded-2xl border border-[#d4af5a]/35 bg-[linear-gradient(135deg,rgba(212,175,90,0.14),rgba(16,28,20,0.4))] px-6 py-6"
            >
              <dt
                className={`font-serif leading-none text-[#e0c078] ${stat.value.length > 6 ? "text-3xl sm:text-4xl" : "text-5xl sm:text-6xl"}`}
              >
                {counts[index] ? (
                  <CountUp target={counts[index].target} suffix={counts[index].suffix} />
                ) : (
                  stat.value
                )}
              </dt>
              <dd className="mt-3 text-sm leading-snug text-ivory/85">{stat.label}</dd>
            </Reveal>
          ))}
        </dl>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {cases.map((item, index) => (
            <Reveal key={item.title} delay={index * 120} className="h-full">
              <Link
                href="/work"
                className={`${card} group flex h-full flex-col overflow-hidden p-0 hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(212,175,90,0.12)]`}
              >
                <picture className="relative block aspect-[4/3] overflow-hidden border-b border-[#d4af5a]/25">
                  <source srcSet={webp(item.image)} type="image/webp" />
                  <img
                    src={item.image}
                    alt={`${item.title}: a screenshot of the system`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover object-[50%_62%] transition-transform duration-[1400ms] group-hover:scale-105"
                  />
                  <span className="absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgba(16,28,20,0.85)_100%)]" aria-hidden />
                </picture>
                <div className="flex flex-1 flex-col p-6">
                  <p className="text-[11px] font-semibold tracking-[0.2em] text-sage uppercase">{item.tag}</p>
                  <h3 className="mt-2 font-serif text-2xl leading-snug text-ivory">{item.headline}</h3>
                  <TransformViz title={item.title} from={item.transformation.from} to={item.transformation.to} />
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(value),
  );
}

export function LatestUpdatesSection({ posts }: { posts: PublishedPost[] }) {
  const { latest } = homePage;
  if (posts.length === 0) return null;
  return (
    <section className="border-y border-ivory/10 bg-forest-secondary py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading label={latest.eyebrow} heading={latest.heading} />
          <Link href={latest.link.href} className={sectionLink}>
            {latest.link.label} →
          </Link>
        </Reveal>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {posts.map((post, index) => (
            <Reveal key={post.id} delay={index * 110} className="h-full">
            <Link
              href={`/ai-updates/${post.slug}`}
              data-track="home_update_click"
              className={`${card} flex h-full flex-col bg-forest/60 hover:-translate-y-1`}
            >
              <p className="text-[11px] font-semibold tracking-[0.2em] text-[#d4af5a] uppercase">
                {formatDate(post.published_at)}
              </p>
              <h3 className="mt-3 font-serif text-2xl leading-snug text-ivory">{post.title}</h3>
              {post.hook ? (
                <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-sage">{post.hook}</p>
              ) : null}
              <p className="mt-auto pt-5 text-xs font-semibold tracking-[0.18em] text-[#e0c078] uppercase">
                Read the update →
              </p>
            </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ApproachPreviewSection() {
  const section = homePage.approach;
  return (
    <section className="relative bg-forest py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading label={section.eyebrow} heading={section.heading} />
          <Link href={section.link.href} className={sectionLink}>
            {section.link.label} →
          </Link>
        </Reveal>
        <Reveal>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-sage">{approach.intro}</p>
        </Reveal>
        <StageShowcase stages={approach.stages} />
      </div>
    </section>
  );
}
