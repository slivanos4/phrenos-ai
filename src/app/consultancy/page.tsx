import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { Services } from "@/components/services";

const pageTitle = "Consultancy";
const pageDescription =
  "AI strategy, workflow automation, content and digital systems, intelligence and team enablement from Phrenos.ai.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/consultancy" },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/consultancy",
    images: ["/opengraph-image"],
  },
  twitter: { card: "summary_large_image", title: pageTitle, description: pageDescription },
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
        description="Five capabilities. One goal: AI that changes what your business can do, not just how it talks about the future."
      />
      <Services hideIntro />
    </>
  );
}
