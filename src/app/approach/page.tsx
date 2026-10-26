import type { Metadata } from "next";
import { ContactCta } from "@/components/contact-cta";
import { StageShowcase } from "@/components/home/motion";
import { PageHero } from "@/components/page-hero";
import { approach } from "@/data/site-content";

const pageTitle = "Approach";
const pageDescription =
  "Understand, prioritise, build and embed: the Phrenos.ai method for AI adoption and implementation, done responsibly.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/approach" },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/approach",
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
      <section className="relative bg-forest-secondary pt-10 pb-20 lg:pt-12 lg:pb-28">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(184,139,54,0.1),transparent_55%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
          <StageShowcase stages={approach.stages} />
        </div>
      </section>
      <ContactCta
        heading="Every engagement starts with Understand."
        supporting="A short note, then a free call. We’ll map where AI, data and automation can create real leverage in your organisation."
      />
    </>
  );
}
