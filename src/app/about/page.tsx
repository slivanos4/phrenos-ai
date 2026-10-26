import type { Metadata } from "next";
import { AboutFocus } from "@/components/about-focus";
import { AboutStory } from "@/components/about-story";
import { AboutJourney } from "@/components/about-journey";
import { ContactCta } from "@/components/contact-cta";

const pageTitle = "About";
const pageDescription =
  "Sophia Livanos, founder of Phrenos.ai and AI strategy consultant, on why she helps people move from being impressed by AI to genuinely empowered by it.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/about" },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/about",
  },
  twitter: { card: "summary_large_image", title: pageTitle, description: pageDescription },
};

export default function AboutPage() {
  return (
    <>
      <AboutStory />
      <AboutJourney />
      <AboutFocus />
      <ContactCta
        heading="Let’s find where AI can make your people more capable."
        supporting="A short note is enough to begin. Tell us where the friction is, and we’ll help find the leverage."
      />
    </>
  );
}
