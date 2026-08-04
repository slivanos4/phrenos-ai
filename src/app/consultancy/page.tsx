import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Consultancy",
  description:
    "AI strategy, workflow automation, content systems, intelligence and team enablement from Phrenos.ai.",
};

export default function ConsultancyPage() {
  return (
    <PageShell
      eyebrow="Consultancy"
      title="Capability with commercial intent."
      description="Explore how Phrenos.ai helps organisations adopt Generative AI, automation and intelligence with clarity, judgement and measurable impact."
    />
  );
}
