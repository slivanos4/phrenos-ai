import type { Metadata } from "next";
import Link from "next/link";
import { ContactCta } from "@/components/contact-cta";
import { PageHero } from "@/components/page-hero";
import { guides } from "@/data/guides";

const pageTitle = "Guides";
const pageDescription =
  "Plain-English guides from Phrenos.ai, an independent UK-based AI consultancy: automating monthly reporting, in-house AI lead or consultancy, AI training for teams and AI competitive intelligence.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/guides" },
  openGraph: { title: pageTitle, description: pageDescription, url: "/guides" },
  twitter: { card: "summary_large_image", title: pageTitle, description: pageDescription },
};

export default function GuidesPage() {
  return (
    <>
      <PageHero
        image="approach"
        position="center"
        mobilePosition="center 40%"
        compact
        lightWash
        copyGuard
        eyebrow="Guides"
        title="Straight answers on putting AI to work."
        description="Short guides that answer the question first, then show the work behind it."
      />
      <section className="bg-forest pt-10 pb-16 lg:pt-12 lg:pb-24">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <ul className="grid gap-5 sm:grid-cols-2">
            {guides.map((guide) => (
              <li key={guide.slug}>
                <Link
                  href={`/guides/${guide.slug}`}
                  className="group flex h-full flex-col rounded-2xl border border-[#d4af5a]/25 bg-forest-secondary/50 p-6 transition-all hover:-translate-y-0.5 hover:border-[#d4af5a]/55"
                >
                  <span className="text-[11px] font-semibold tracking-[0.2em] text-sage uppercase">{guide.eyebrow}</span>
                  <span className="mt-2 font-serif text-2xl leading-snug text-ivory">{guide.title}</span>
                  <span className="mt-3 text-sm leading-relaxed text-sage">{guide.description}</span>
                  <span className="mt-auto pt-5 text-xs font-semibold tracking-[0.18em] text-[#e0c078] uppercase">
                    Read the guide <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <ContactCta />
    </>
  );
}
