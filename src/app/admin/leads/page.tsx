import type { Metadata } from "next";
import Link from "next/link";
import { LeadsPanel } from "@/components/admin/leads-panel";

export const metadata: Metadata = {
  title: "Admin · Leads",
  robots: { index: false, follow: false },
};

export default function AdminLeadsPage() {
  return (
    <section className="relative isolate min-h-[100svh] bg-[#0a100c]">
      <div className="relative z-10 mx-auto max-w-4xl px-5 pt-28 pb-16 sm:px-8 sm:pt-32 lg:pt-36 lg:pb-24">
        <p className="text-xs font-semibold tracking-[0.28em] text-[#d4af5a] uppercase">Private</p>
        <h1 className="mt-4 font-serif text-3xl tracking-tight text-[#f1e8d6] sm:text-4xl">Leads</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#a9b0a3] sm:text-base">
          Everyone who sent the contact form, finished the readiness check or asked for the cheat sheet.
        </p>
        <p className="mt-3 text-xs font-semibold tracking-[0.18em] uppercase">
          <Link href="/admin/ai-updates" className="text-[#e0c078] underline-offset-4 hover:underline">
            ← AI Updates portal
          </Link>
        </p>
        <div className="mt-10">
          <LeadsPanel />
        </div>
      </div>
    </section>
  );
}
