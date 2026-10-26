"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { readConsent, setConsent, subscribeConsent } from "@/lib/site/consent";

/** Asks once. Declining is as easy as accepting, and nothing but essentials runs until the visitor says yes. */
export function CookieBanner() {
  const pathname = usePathname();
  // On the server we assume a choice exists, so the banner never flashes into the page.
  const consent = useSyncExternalStore(subscribeConsent, readConsent, () => "granted" as const);
  if (consent !== null || pathname?.startsWith("/admin")) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie choices"
      className="fixed right-4 bottom-4 left-4 z-[60] rounded-2xl border border-[#d4af5a]/45 bg-[#0b140e]/95 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-md sm:right-auto sm:max-w-md"
    >
      <p className="font-serif text-xl text-[#e0c078]">Cookies</p>
      <p className="mt-2 text-sm leading-relaxed text-ivory/85">
        With your permission we use analytics cookies (Google Analytics and Microsoft Clarity) to see how the site is
        used and to improve it. Nothing else runs until you choose.{" "}
        <Link href="/privacy" className="text-[#e0c078] underline-offset-4 hover:underline">
          Privacy policy
        </Link>
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setConsent("granted")}
          className="rounded-full border border-gold bg-gold px-4 py-2.5 text-sm font-semibold text-forest transition-colors hover:bg-[#e0c078]"
        >
          Accept analytics
        </button>
        <button
          type="button"
          onClick={() => setConsent("denied")}
          className="rounded-full border border-gold px-4 py-2.5 text-sm font-semibold text-ivory transition-colors hover:bg-[#d4af5a]/10"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
