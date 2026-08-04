import type { Metadata } from "next";
import { AboutFocus } from "@/components/about-focus";
import { AboutStory } from "@/components/about-story";
import { ContactCta } from "@/components/contact-cta";

export const metadata: Metadata = {
  title: "About",
  description:
    "Sophia Livanos on why she builds Phrenos.ai: helping people move from being impressed by AI to genuinely empowered by it.",
};

export default function AboutPage() {
  return (
    <>
      <AboutStory />
      <AboutFocus />
      <ContactCta />
    </>
  );
}
