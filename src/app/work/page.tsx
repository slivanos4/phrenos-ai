import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Selected Phrenos.ai engagements across competitive intelligence, content systems, governance and knowledge assistants.",
};

export default function WorkPage() {
  return (
    <PageShell
      eyebrow="Selected work"
      title="Systems that turn intelligence into action."
      description="Case studies spanning competitive intelligence, enterprise content generation, brand governance and organisational knowledge."
    />
  );
}
