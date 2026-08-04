import type { Metadata } from "next";
import { AboutFocus } from "@/components/about-focus";
import { AboutStory } from "@/components/about-story";
import { ContactCta } from "@/components/contact-cta";
import { PageHero } from "@/components/page-hero";
import { aboutPage } from "@/data/site-content";

export const metadata: Metadata = {
  title: "About",
  description:
    "Sophia Livanos on why she builds Phrenos.ai: helping people move from being impressed by AI to genuinely empowered by it.",
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        image="about"
        position="72% center"
        eyebrow={aboutPage.eyebrow}
        title={aboutPage.heading}
        description={aboutPage.supporting}
      />
      <AboutStory hideIntro />
      <AboutFocus />
      <ContactCta />
    </>
  );
}
