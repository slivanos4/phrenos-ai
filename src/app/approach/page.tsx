import type { Metadata } from "next";
import { Approach } from "@/components/approach";

export const metadata: Metadata = {
  title: "Approach",
  description:
    "Understand, prioritise, build and embed — the Phrenos.ai method for responsible AI adoption.",
};

export default function ApproachPage() {
  return (
    <>
      <div className="h-20 sm:h-[5.25rem] lg:h-[5.5rem]" aria-hidden />
      <Approach />
    </>
  );
}
