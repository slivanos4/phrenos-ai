import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/page-hero";

export const metadata: Metadata = {
  title: "AI Updates",
  description:
    "Thought leadership and updates on Generative AI strategy, automation and organisational enablement from Phrenos.ai.",
};

export default function AiUpdatesPage() {
  return (
    <>
      <PageHero
        image="ai-updates"
        position="center right"
        size="tall"
        eyebrow="AI Updates"
        title="Intelligence worth paying attention to."
        description="Notes on Generative AI, automation and the organisational judgement required to put them to work — coming soon."
      />

      <section className="bg-forest py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
          <p className="text-base leading-relaxed text-sage sm:text-lg">
            This space will gather reflections on how AI is reshaping work,
            decision-making and organisational capability.
          </p>
          <Link
            href="/contact"
            className="mt-10 inline-flex items-center justify-center rounded-full border border-gold px-7 py-3.5 text-sm font-semibold tracking-wide text-ivory transition-colors hover:bg-gold hover:text-forest"
          >
            Start a Conversation
          </Link>
        </div>
      </section>
    </>
  );
}
