"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { ANALYTICS_COOKIES_ENABLED, readConsent, setConsent, subscribeConsent } from "@/lib/site/consent";

/** Asks once. Declining is as easy as accepting, and nothing but essentials runs until the visitor says yes. */
export function CookieBanner() {
  const pathname = usePathname();
  // On the server we assume a choice exists, so the banner never flashes into the page.
  const consent = useSyncExternalStore(subscribeConsent, readConsent, () => "granted" as const);
  if (!ANALYTICS_COOKIES_ENABLED || consent !== null || pathname?.startsWith("/admin")) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie choices"
      className="fixed right-4 bottom-4 left-4 z-[60] flex flex-col gap-3 rounded-2xl border border-[#d4af5a]/45 bg-[#0b140e]/95 px-5 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-md sm:right-auto sm:max-w-2xl sm:flex-row sm:items-center sm:gap-5"
    >
      <p className="text-sm leading-snug text-ivory/90">
        We use analytics cookies to improve this site.{" "}
        <Link href="/privacy" className="whitespace-nowrap text-[#e0c078] underline-offset-4 hover:underline">
          Privacy policy
        </Link>
      </p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => setConsent("granted")}
          className="rounded-full border border-gold bg-gold px-4 py-2 text-sm font-semibold text-forest transition-colors hover:bg-[#e0c078]"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={() => setConsent("denied")}
          className="rounded-full border border-gold px-4 py-2 text-sm font-semibold text-ivory transition-colors hover:bg-[#d4af5a]/10"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
