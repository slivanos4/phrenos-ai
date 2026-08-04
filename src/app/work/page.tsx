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
        eyebrow="Selected work"
        title="Systems that turn intelligence into action."
        description="A selection of engagements spanning competitive intelligence, content operations, governance and organisational knowledge."
      />
      <SelectedWork hideIntro />
    </>
  );
}
