import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { ReadinessCheck } from "@/components/resources/readiness-check";
import { leadMagnets } from "@/data/site-content";

const pageTitle = "AI Readiness Check";
const pageDescription =
  "Eight quick questions to see how ready your organisation is for AI across strategy, data, workflows, people and governance, and what to do first.";

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
          <ReadinessCheck />
        </div>
      </section>
    </>
  );
}
