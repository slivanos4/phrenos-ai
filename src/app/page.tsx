import type { Metadata } from "next";
import { CredibilityStrip } from "@/components/credibility-strip";
import { Hero } from "@/components/hero";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <>
      <Hero />
      <CredibilityStrip />
    </>
  );
}
