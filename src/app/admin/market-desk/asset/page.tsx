import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { AssetDetailPanel } from "@/components/admin/market-desk-detail";

export const metadata: Metadata = {
  title: "Admin · Market Desk detail",
  robots: { index: false, follow: false },
};

export default async function AssetDetailPage({ searchParams }: { searchParams: Promise<{ key?: string; alert?: string }> }) {
  const { key, alert } = await searchParams;
  return (
    <section className="relative isolate min-h-[100svh] bg-[#0a100c]">
      <div className="relative z-10 mx-auto max-w-4xl px-5 pt-28 pb-16 sm:px-8 sm:pt-32 lg:pt-36 lg:pb-24">
        <AdminNav current="markets" />
        <AssetDetailPanel assetKey={key ?? ""} alertId={alert ?? null} />
      </div>
    </section>
  );
}
