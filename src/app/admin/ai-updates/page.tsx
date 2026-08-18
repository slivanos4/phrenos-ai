import type { Metadata } from "next";
import { AiUpdatesPanel } from "@/components/admin/ai-updates-panel";

export const metadata: Metadata = {
  title: "Admin · AI Updates",
  robots: { index: false, follow: false },
};

export default function AdminAiUpdatesPage() {
  return (
    <section className="bg-[#0a100c] min-h-[80vh] py-10">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <p className="text-xs font-semibold tracking-[0.28em] text-[#d4af5a] uppercase">Private</p>
        <h1 className="mt-3 font-serif text-3xl text-[#f1e8d6]">AI Updates desk</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#a9b0a3]">
          Research, draft, approve and publish weekly Gen AI updates for phrenosai.com.
        </p>
        <div className="mt-8">
          <AiUpdatesPanel />
        </div>
      </div>
    </section>
  );
}
