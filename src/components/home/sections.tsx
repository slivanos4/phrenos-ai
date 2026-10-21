import Link from "next/link";
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
    <section className="bg-forest py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <SectionHeading label={problems.eyebrow} heading={problems.heading} />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {problems.items.map((item) => (
            <div key={item.title} className={card}>
              <span className="block h-1.5 w-8 rounded-full bg-[#d4af5a]" aria-hidden />
              <h3 className="mt-5 font-serif text-xl leading-snug text-[#e0c078]">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-sage">{item.body}</p>
            </div>
          ))}
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
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading label={outcomes.eyebrow} heading={outcomes.heading} />
          <Link href={outcomes.link.href} className={sectionLink}>
            {outcomes.link.label} →
          </Link>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {outcomes.items.map((item, index) => (
            <Link
              key={item.title}
              href="/consultancy"
              className={`${card} group flex flex-col bg-forest/60`}
            >
              <span className="font-serif text-sm text-[#d4af5a]">
                {["I", "II", "III", "IV", "V"][index]}
              </span>
              <h3 className="mt-3 font-serif text-2xl leading-snug text-[#e0c078]">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ivory/85">{item.body}</p>
              <p className="mt-auto pt-5 text-[11px] font-semibold tracking-[0.18em] text-sage uppercase transition-colors group-hover:text-[#e0c078]">
                {item.service}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ProofSection() {
  const { proof } = homePage;
  const cases = selectedWork.filter((item) =>
    ["Monthly Report Automation", "Competitive Intelligence", "Content Buddy"].includes(item.title),
  );
  return (
    <section className="bg-forest py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading label={proof.eyebrow} heading={proof.heading} />
          <Link href={proof.link.href} className={sectionLink}>
            {proof.link.label} →
          </Link>
        </div>

        <dl className="mt-10 grid gap-5 sm:grid-cols-3">
          {proof.stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-[#d4af5a]/35 bg-[#d4af5a]/[0.07] px-6 py-6">
              <dt
                className={`font-serif leading-none text-[#e0c078] ${stat.value.length > 6 ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl"}`}
              >
                {stat.value}
              </dt>
              <dd className="mt-3 text-sm leading-snug text-ivory/85">{stat.label}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {cases.map((item) => (
            <Link key={item.title} href="/work" className={`${card} flex flex-col`}>
              <p className="text-[11px] font-semibold tracking-[0.2em] text-sage uppercase">{item.tag}</p>
              <h3 className="mt-2 font-serif text-2xl leading-snug text-ivory">{item.headline}</h3>
              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-ivory/20 px-3 py-1 text-ivory/70">
                  {item.transformation.from}
                </span>
                <span className="text-[#d4af5a]" aria-hidden>
                  →
                </span>
                <span className="rounded-full border border-[#d4af5a]/60 bg-[#d4af5a]/12 px-3 py-1 font-semibold text-[#e0c078]">
                  {item.transformation.to}
                </span>
              </div>
            </Link>
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
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading label={latest.eyebrow} heading={latest.heading} />
          <Link href={latest.link.href} className={sectionLink}>
            {latest.link.label} →
          </Link>
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/ai-updates/${post.slug}`}
              data-track="home_update_click"
              className={`${card} flex flex-col bg-forest/60`}
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
          ))}
        </div>
      </div>
    </section>
  );
}

export function ApproachPreviewSection() {
  const section = homePage.approach;
  return (
    <section className="bg-forest py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading label={section.eyebrow} heading={section.heading} />
          <Link href={section.link.href} className={sectionLink}>
            {section.link.label} →
          </Link>
        </div>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-sage">{approach.intro}</p>
        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {approach.stages.map((stage) => (
            <li key={stage.title} className={card}>
              <span className="font-serif text-3xl text-[#d4af5a]">{stage.number}</span>
              <h3 className="mt-2 font-serif text-2xl text-[#e0c078]">{stage.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-sage">{stage.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
