import type { Metadata } from "next";
import { ContactCta } from "@/components/contact-cta";
import { CredibilityStrip } from "@/components/credibility-strip";
import { Hero } from "@/components/hero";
import {
  ApproachPreviewSection,
  LatestUpdatesSection,
  OutcomesSection,
  ProblemSection,
  ProofSection,
} from "@/components/home/sections";
import { isServiceRoleConfigured, listPublishedPosts } from "@/lib/phrenos-updates";
import type { PublishedPost } from "@/lib/phrenos-updates/types";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// New AI Updates should show up on the home page within the hour.
export const revalidate = 3600;

async function loadLatestPosts(): Promise<PublishedPost[]> {
  if (!isServiceRoleConfigured()) return [];
  try {
    return await listPublishedPosts(3);
  } catch (error) {
    console.error("home: could not load the latest AI updates:", error);
    return [];
  }
}

export default async function Home() {
  const posts = await loadLatestPosts();
  return (
    <>
      <Hero />
      <CredibilityStrip />
      <ProblemSection />
      <OutcomesSection />
      <ProofSection />
      <LatestUpdatesSection posts={posts} />
      <ApproachPreviewSection />
      <ContactCta />
    </>
  );
}
