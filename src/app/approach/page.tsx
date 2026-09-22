import type { Metadata } from "next";
import { Approach } from "@/components/approach";
import { PageHero } from "@/components/page-hero";
import { approach } from "@/data/site-content";

const pageTitle = "Approach";
const pageDescription =
  "Understand, prioritise, build and embed: the Phrenos.ai method for responsible AI adoption.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/approach" },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/approach",
    images: ["/opengraph-image"],
  },
  twitter: { card: "summary_large_image", title: pageTitle, description: pageDescription },
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
