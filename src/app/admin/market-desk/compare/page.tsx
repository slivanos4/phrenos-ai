import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { ComparePanel } from "@/components/admin/market-desk-compare";

export const metadata: Metadata = {
  title: "Admin · Market Desk compare",
  robots: { index: false, follow: false },
};

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ keys?: string }> }) {
  const { keys } = await searchParams;
  return (
    <section className="relative isolate min-h-[100svh] bg-[#0a100c]">
      <div className="relative z-10 mx-auto max-w-5xl px-5 pt-28 pb-16 sm:px-8 sm:pt-32 lg:pt-36 lg:pb-24">
        <AdminNav current="markets" />
        <ComparePanel initialKeys={(keys ?? "").split(",").filter(Boolean)} />
      </div>
    </section>
  );
}
