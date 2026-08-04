import type { Metadata } from "next";
import { AboutPreview } from "@/components/about-preview";

export const metadata: Metadata = {
  title: "About",
  description:
    "The Phrenos.ai story — from medicine, neuroscience and neurolinguistics to Generative AI strategy and organisational enablement.",
};

export default function AboutPage() {
  return (
    <>
      <div className="h-20 sm:h-[5.25rem] lg:h-[5.5rem]" aria-hidden />
      <AboutPreview />
    </>
  );
}
