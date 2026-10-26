import type { Metadata } from "next";
import { ContactCta } from "@/components/contact-cta";
import { PageHero } from "@/components/page-hero";
import { Services } from "@/components/services";
import { services } from "@/data/site-content";

const pageTitle = "Consultancy";
const pageDescription =
  "AI consultancy services from Phrenos.ai: AI strategy, workflow automation, content & digital systems, competitive intelligence and team enablement.";

const servicesJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "AI consultancy",
  provider: {
    "@type": "ProfessionalService",
    name: "Phrenos.ai",
    url: "https://phrenosai.com",
  },
  areaServed: "Worldwide",
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Phrenos.ai Consultancy Services",
    itemListElement: services.map((service) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: service.title,
        description: service.description,
      },
    })),
  },
};

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/consultancy" },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/consultancy",
  },
  twitter: { card: "summary_large_image", title: pageTitle, description: pageDescription },
};

export default function ConsultancyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(servicesJsonLd) }}
      />
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
      <ContactCta
        heading="Not sure which capability comes first?"
        supporting="Most organisations start with one. A free 15-minute intro call is the quickest way to find yours, or take the readiness check to see where you stand."
      />
    </>
  );
}
