import type { Metadata } from "next";
import { Approach } from "@/components/approach";
import { PageHero } from "@/components/page-hero";
import { approach } from "@/data/site-content";

export const metadata: Metadata = {
  title: "Approach",
  description:
    "Understand, prioritise, build and embed: the Phrenos.ai method for responsible AI adoption.",
};

export default function ApproachPage() {
  return (
    <>
      <PageHero
        image="approach"
        position="center"
        mobilePosition="center 40%"
        lightWash
        copyGuard
        eyebrow="Approach"
        title="From opportunity to lasting capability."
        description={approach.intro}
      />
      <Approach hideIntro />
    </>
  );
}
