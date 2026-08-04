import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { SelectedWork } from "@/components/selected-work";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Selected Phrenos.ai engagements across competitive intelligence, content systems, governance and knowledge assistants.",
};

export default function WorkPage() {
  return (
    <>
      <PageHero
        image="work"
        position="center"
        compact
        lightWash
        overlayMobileCopy
        eyebrow="Selected work"
        title="Systems that turn intelligence into action."
        description="Five AI systems from the portfolio: competitive intelligence, brand governance, knowledge, content hubs and reporting."
      />
      <SelectedWork hideIntro />
    </>
  );
}
