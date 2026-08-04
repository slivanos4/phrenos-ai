import type { Metadata } from "next";
import { SelectedWork } from "@/components/selected-work";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Selected Phrenos.ai engagements across competitive intelligence, content systems, governance and knowledge assistants.",
};

export default function WorkPage() {
  return (
    <>
      <div className="h-20 sm:h-[5.25rem] lg:h-[5.5rem]" aria-hidden />
      <SelectedWork />
    </>
  );
}
