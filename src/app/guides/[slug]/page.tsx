import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactCta } from "@/components/contact-cta";
import { PageHero } from "@/components/page-hero";
import { caseStudyBySlug } from "@/data/case-studies";
import { guideBySlug, guides } from "@/data/guides";

type PageProps = { params: Promise<{ slug: string }> };

const siteUrl = "https://phrenosai.com";

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = guideBySlug(slug);
  if (!guide) return { title: "Guide" };
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: { title: guide.title, description: guide.description, url: `/guides/${guide.slug}`, type: "article" },
    twitter: { card: "summary_large_image", title: guide.title, description: guide.description },
  };
}

const eyebrow = "text-xs font-semibold tracking-[0.28em] text-[#e0c078] uppercase";

export default async function GuidePage({ params }: PageProps) {
  const { slug } = await params;
  const guide = guideBySlug(slug);
  if (!guide) notFound();

  const study = guide.caseStudy ? caseStudyBySlug(guide.caseStudy) : undefined;
  const others = guides.filter((item) => item.slug !== guide.slug);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: guide.title,
      description: guide.description,
      mainEntityOfPage: `${siteUrl}/guides/${guide.slug}`,
      author: { "@type": "Person", name: "Sophia Livanos" },
      publisher: { "@type": "ProfessionalService", name: "Phrenos.ai", url: siteUrl },
    },
    ...(guide.faq
      ? [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: guide.faq.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: { "@type": "Answer", text: item.answer },
            })),
          },
        ]
      : []),
  ];

  return (
    <>
      {jsonLd.map((block, index) => (
        <script
          key={index}
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
      <PageHero image="consultancy" position="78% center" mobilePosition="70% center" compact lightWash copyGuard eyebrow={guide.eyebrow} title={guide.title} />

      <article className="bg-forest pt-10 pb-16 lg:pt-12 lg:pb-24">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          <Link href="/consultancy" className="text-[11px] font-semibold tracking-[0.22em] text-sage uppercase transition-colors hover:text-[#e0c078]">
            ← Consultancy
          </Link>

          <p className="mt-8 font-serif text-2xl leading-snug text-balance text-ivory sm:text-[1.75rem]">{guide.lead}</p>
          <p className="mt-4 text-xs text-sage">By Sophia Livanos, Phrenos.ai, an independent UK-based AI consultancy.</p>

          <div className="mt-12 space-y-12">
            {guide.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="font-serif text-2xl leading-tight text-[#e0c078] sm:text-3xl">{section.heading}</h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="mt-4 text-base leading-relaxed text-ivory/85 sm:text-lg">{paragraph}</p>
                ))}
                {section.bullets ? (
                  <ul className="mt-4 space-y-3">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3 text-base leading-relaxed text-ivory/85 sm:text-lg">
                        <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d4af5a]" aria-hidden />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>

          {study ? (
            <div className="mt-12 rounded-2xl border border-[#d4af5a]/30 bg-forest-secondary/60 p-6">
              <p className={eyebrow}>The case study</p>
              <p className="mt-3 text-base leading-relaxed text-ivory/85">{study.summary}</p>
              <Link href={`/work/${study.slug}`} className="mt-4 inline-block text-xs font-semibold tracking-[0.18em] text-[#e0c078] uppercase underline-offset-4 hover:underline">
                Read the case study →
              </Link>
            </div>
          ) : null}

          {guide.faq ? (
            <section className="mt-12 border-t border-[#d4af5a]/20 pt-10">
              <p className={eyebrow}>In short</p>
              <dl className="mt-4 space-y-6">
                {guide.faq.map((item) => (
                  <div key={item.question}>
                    <dt className="font-serif text-xl text-ivory">{item.question}</dt>
                    <dd className="mt-2 text-base leading-relaxed text-ivory/85">{item.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          <section className="mt-12 border-t border-[#d4af5a]/20 pt-10">
            <p className={eyebrow}>More guides</p>
            <ul className="mt-4 space-y-2">
              {others.map((item) => (
                <li key={item.slug}>
                  <Link href={`/guides/${item.slug}`} className="text-base text-ivory transition-colors hover:text-[#e0c078]">
                    {item.label} →
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </article>

      <ContactCta />
    </>
  );
}
