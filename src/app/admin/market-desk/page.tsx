import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { MarketDeskPanel } from "@/components/admin/market-desk-panel";

export const metadata: Metadata = {
  title: "Admin · Market Desk",
  robots: { index: false, follow: false },
  manifest: "/market-desk.webmanifest",
};

export default function AdminMarketDeskPage() {
  return (
    <section className="relative isolate min-h-[100svh] bg-[#0a100c]">
      <div className="relative z-10 mx-auto max-w-5xl px-5 pt-28 pb-16 sm:px-8 sm:pt-32 lg:pt-36 lg:pb-24">
        <AdminNav current="markets" />
        <p className="text-xs font-semibold tracking-[0.28em] text-[#d4af5a] uppercase">Private</p>
        <h1 className="mt-4 font-serif text-3xl tracking-tight text-[#f1e8d6] sm:text-4xl">Market Desk</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#a9b0a3] sm:text-base">
          Track stocks, crypto, currencies and metals. Weekly research with the evidence, a safest-to-riskiest scale, and warnings on what you hold.
        </p>
        <div className="mt-10">
          <MarketDeskPanel />
        </div>
      </div>
    </section>
  );
}
