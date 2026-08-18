import type { Metadata } from "next";
import { AiUpdatesPanel } from "@/components/admin/ai-updates-panel";

export const metadata: Metadata = {
  title: "Admin · AI Updates",
  robots: { index: false, follow: false },
};

export default function AdminAiUpdatesPage() {
  return (
    <section className="relative isolate min-h-[100svh] overflow-hidden bg-[#0a100c]">
      {/* Artwork sits to the right so the desk stays readable on the left */}
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-[position:72%_center] sm:bg-[position:78%_center]"
        style={{ backgroundImage: "url(/brand/admin-desk.jpg?v=1)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#0a100c_0%,rgba(10,16,12,0.92)_38%,rgba(10,16,12,0.55)_62%,rgba(10,16,12,0.28)_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,16,12,0.55)_0%,transparent_18%,transparent_72%,rgba(10,16,12,0.75)_100%)]"
        aria-hidden
      />

      {/* Clear the fixed site header */}
      <div className="relative z-10 mx-auto max-w-6xl px-5 pt-28 pb-16 sm:px-8 sm:pt-32 lg:pt-36 lg:pb-24">
        <p className="text-xs font-semibold tracking-[0.28em] text-[#d4af5a] uppercase">
          Private
        </p>
        <h1 className="mt-4 max-w-xl font-serif text-3xl tracking-tight text-[#f1e8d6] sm:text-4xl">
          AI Updates Portal
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#a9b0a3] sm:text-base">
          Research, draft, approve and publish weekly Gen AI updates for
          phrenosai.com.
        </p>
        <div className="mt-10 max-w-3xl">
          <AiUpdatesPanel />
        </div>
      </div>
    </section>
  );
}
