import type { Metadata } from "next";
import Link from "next/link";
import { ContactCta } from "@/components/contact-cta";
import { PageHero } from "@/components/page-hero";
import { Services } from "@/components/services";
import { guides } from "@/data/guides";
import { services } from "@/data/site-content";

const pageTitle = "Consultancy";
const pageDescription =
  "Phrenos.ai is an independent, UK-based AI consultancy led by Sophia Livanos. Five services for business leaders: AI strategy, workflow automation, content and digital systems, competitive intelligence and AI training.";

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
  founder: { "@type": "Person", name: "Sophia Livanos" },
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
        description="Phrenos.ai is an independent, UK-based AI consultancy led by Sophia Livanos. Five capabilities, one goal: AI that changes what your business can do, not just how it talks about the future."
      />
      <section className="bg-[#0a100c] pt-12 pb-2 lg:pt-16">
        <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
          <p className="text-base leading-relaxed text-ivory/90 sm:text-lg">
            We help business leaders introduce Generative AI, data and automation, from the first strategy to the
            systems and training that keep it working. Our proof is five AI systems in the solutions portfolio and
            more than 40 custom GPTs and AI assistants built.
          </p>
          <p className="mt-4 text-sm text-sage">
            The first step is free: a 15-minute intro call, or the{" "}
            <Link href="/resources/ai-readiness" className="text-[#e0c078] underline-offset-4 hover:underline">AI readiness check</Link>.
          </p>
        </div>
      </section>
      <Services hideIntro />
      <section className="bg-[#0a100c] pb-16 lg:pb-20">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <p className="text-xs font-semibold tracking-[0.28em] text-[#e0c078] uppercase">Guides</p>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            {guides.map((guide) => (
              <li key={guide.slug}>
                <Link
                  href={`/guides/${guide.slug}`}
                  className="group flex h-full flex-col rounded-2xl border border-[#d4af5a]/25 bg-forest-secondary/50 p-5 transition-all hover:-translate-y-0.5 hover:border-[#d4af5a]/55"
                >
                  <span className="font-serif text-xl leading-snug text-ivory">{guide.label}</span>
                  <span className="mt-2 text-sm leading-relaxed text-sage">{guide.description}</span>
                  <span className="mt-auto pt-4 text-xs font-semibold tracking-[0.18em] text-[#e0c078] uppercase">
                    Read the guide <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <ContactCta
        heading="Not sure which capability comes first?"
        supporting="Most organisations start with one. A free 15-minute intro call is the quickest way to find yours, or take the readiness check to see where you stand."
      />
    </>
  );
}
