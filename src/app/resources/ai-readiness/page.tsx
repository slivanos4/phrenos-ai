import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { ReadinessCheck } from "@/components/resources/readiness-check";
import { leadMagnets } from "@/data/site-content";

const pageTitle = "AI Readiness Check";
const pageDescription =
  "What an AI readiness assessment is, and whether you need one before starting AI projects. A free eight-question check across strategy, data, workflows, people and governance, with what to do first.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/resources/ai-readiness" },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/resources/ai-readiness",
  },
  twitter: { card: "summary_large_image", title: pageTitle, description: pageDescription },
};

export default function AiReadinessPage() {
  return (
    <>
      <PageHero
        image="approach"
        position="center"
        mobilePosition="center 40%"
        compact
        lightWash
        copyGuard
        eyebrow={leadMagnets.readiness.eyebrow}
        title={leadMagnets.readiness.title}
        description={leadMagnets.readiness.description}
      />
      <section className="bg-forest pt-10 pb-20 lg:pt-12 lg:pb-28">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          <div className="mb-10 rounded-2xl border border-[#d4af5a]/25 bg-forest-secondary/50 p-6">
            <h2 className="font-serif text-2xl text-[#e0c078]">What is an AI readiness assessment?</h2>
            <p className="mt-3 text-base leading-relaxed text-ivory/85">
              An AI readiness assessment is a short, structured check of whether an organisation is set up to use AI
              well, across strategy, data, workflows, people and governance. Doing one before you start shows the gaps
              that tend to hold AI projects back, and what to fix first.
            </p>
            <p className="mt-3 text-base leading-relaxed text-ivory/85">
              This free check from Phrenos.ai asks eight quick questions. At the end you get a plain summary of where
              you stand in each of the five areas and what to do first, and you can talk it through on a free 15-minute
              intro call.
            </p>
          </div>
          <ReadinessCheck />
        </div>
      </section>
    </>
  );
}
