import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "AI Updates",
  description:
    "Thought leadership and updates on Generative AI strategy, automation and organisational enablement from Phrenos.ai.",
};

export default function AiUpdatesPage() {
  return (
    <PageShell
      eyebrow="AI Updates"
      title="Intelligence worth paying attention to."
      description="Notes on Generative AI, automation and the organisational judgement required to put them to work — coming soon."
    />
  );
}
