import { AboutPreview } from "@/components/about-preview";
import { Approach } from "@/components/approach";
import { ContactCta } from "@/components/contact-cta";
import { CredibilityStrip } from "@/components/credibility-strip";
import { Hero } from "@/components/hero";
import { SelectedWork } from "@/components/selected-work";
import { Services } from "@/components/services";

export default function Home() {
  return (
    <>
      <Hero />
      <CredibilityStrip />
      <Services />
      <Approach />
      <SelectedWork />
      <AboutPreview />
      <ContactCta />
    </>
  );
}
