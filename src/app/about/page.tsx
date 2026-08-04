import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "About",
  description:
    "The Phrenos.ai story — from medicine, neuroscience and neurolinguistics to Generative AI strategy and organisational enablement.",
};

export default function AboutPage() {
  return (
    <PageShell
      eyebrow="About"
      title="Meet the AI Mind."
      description="The founder’s route into AI began in medicine, neuroscience and neurolinguistics. That understanding of language, cognition and human behaviour shapes how Phrenos.ai designs systems people can actually use."
    />
  );
}
