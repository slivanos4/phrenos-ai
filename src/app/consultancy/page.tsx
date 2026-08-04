import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { Services } from "@/components/services";

export const metadata: Metadata = {
  title: "Consultancy",
  description:
    "AI strategy, workflow automation, content systems, intelligence and team enablement from Phrenos.ai.",
};

export default function ConsultancyPage() {
  return (
    <>
      <PageHero
        image="consultancy"
        position="78% center"
        mobilePosition="70% center"
        lightWash
        eyebrow="Consultancy"
        title="Capability with commercial intent."
        description="Each engagement is designed around operational clarity and measurable outcomes, not technology for its own sake."
      />
      <Services hideIntro />
    </>
  );
}
