import type { Metadata } from "next";
import { Services } from "@/components/services";

export const metadata: Metadata = {
  title: "Consultancy",
  description:
    "AI strategy, workflow automation, content systems, intelligence and team enablement from Phrenos.ai.",
};

export default function ConsultancyPage() {
  return (
    <>
      <div className="h-20 sm:h-[5.25rem] lg:h-[5.5rem]" aria-hidden />
      <Services />
    </>
  );
}
