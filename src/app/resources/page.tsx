import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { ContactCta } from "@/components/contact-cta";
import { BriefSheetGate } from "@/components/resources/brief-sheet-gate";
import { leadMagnets } from "@/data/site-content";

const pageTitle = "Resources";
const pageDescription =
  "Free AI tools and cheat sheets from Phrenos.ai for leaders putting Generative AI to work, starting with How to Brief AI Like a Strategist.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/resources" },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/resources",
    images: ["/opengraph-image"],
  },
  twitter: { card: "summary_large_image", title: pageTitle, description: pageDescription },
};

const briefPdfHref = "/products/brief-ai-like-a-strategist.pdf";

export default function ResourcesPage() {
  return (
    <>
      <PageHero
        image="approach"
        position="center"
        mobilePosition="center 40%"
        compact
        lightWash
        copyGuard
        eyebrow="Resources"
        title="Tools you can use this week."
        description="Practical sheets for leaders who want clearer AI briefs, sharper judgement, and less prompt theatre."
      />

      <section className="bg-forest pt-10 pb-16 lg:pt-12 lg:pb-24">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <p className="text-xs font-semibold tracking-[0.28em] text-gold uppercase">
            Free cheat sheet
          </p>

          <div className="mt-8 border-t border-[#d4af5a]/25 pt-8 sm:pt-10">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-sage uppercase">
              Cheat sheet · 8 pages
            </p>
            <h2 className="mt-3 font-serif text-3xl leading-snug text-ivory sm:text-4xl">
              How to Brief AI Like a Strategist
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-sage sm:text-lg">
              AI does not need clever wording. It needs a clear brief: purpose,
              audience, scope and tone. This sheet gives you PAST, a reusable
              briefing template, upgrades that change quality, and prompt
              patterns for real work.
            </p>

            <ul className="mt-8 max-w-xl space-y-3 text-sm leading-relaxed text-ivory/85">
              <li className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
                PAST definitions you can apply before you type
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
                A copy-and-reuse briefing template
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
                Five upgrades, prompt patterns, red flags and a one-week practice
              </li>
            </ul>

            <BriefSheetGate
              pdfHref={briefPdfHref}
              downloadName="How-to-Brief-AI-Like-a-Strategist.pdf"
            />

            <p className="mt-6 max-w-xl text-sm leading-relaxed text-sage">
              Take it. Use it. Stress-test it. If it breaks, tell us where:{" "}
              <a
                href="mailto:hello@phrenosai.com?subject=Brief%20AI%20feedback"
                className="text-[#e0c078] underline-offset-4 hover:underline"
              >
                hello@phrenosai.com
              </a>
              .
            </p>
          </div>

          <div className="mt-16 border-t border-[#d4af5a]/25 pt-10 sm:pt-12">
            <p className="text-xs font-semibold tracking-[0.28em] text-gold uppercase">
              {leadMagnets.readiness.eyebrow}
            </p>
            <h2 className="mt-3 font-serif text-3xl leading-snug text-ivory sm:text-4xl">
              {leadMagnets.readiness.title}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-sage sm:text-lg">
              {leadMagnets.readiness.description}
            </p>
            <Link
              href={leadMagnets.readiness.href}
              data-track="cta_readiness_check"
              data-track-location="resources"
              className="mt-8 inline-flex items-center justify-center rounded-full border border-gold bg-gold px-7 py-3.5 text-sm font-semibold tracking-wide text-forest transition-colors hover:bg-[#e0c078]"
            >
              Take the readiness check
            </Link>
          </div>

          <div className="mt-16 border-t border-[#d4af5a]/20 pt-12">
            <p className="text-xs font-semibold tracking-[0.28em] text-gold uppercase">
              Keep going
            </p>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:gap-8">
              <Link
                href="/ai-updates"
                className="text-sm font-semibold tracking-wide text-ivory transition-colors hover:text-[#e0c078]"
              >
                Weekly AI Updates →
              </Link>
              <Link
                href="/contact"
                className="text-sm font-semibold tracking-wide text-ivory transition-colors hover:text-[#e0c078]"
              >
                Book a free AI call →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <ContactCta />
    </>
  );
}
