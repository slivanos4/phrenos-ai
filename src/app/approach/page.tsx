import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Approach",
  description:
    "Understand, prioritise, build and embed — the Phrenos.ai method for responsible AI adoption.",
};

export default function ApproachPage() {
  return (
    <PageShell
      eyebrow="Approach"
      title="From opportunity to lasting capability."
      description="A structured method for identifying high-value AI opportunities, designing practical systems and helping teams adopt them successfully."
    />
  );
}
