"use client";

import { ANALYTICS_COOKIES_ENABLED, resetConsent } from "@/lib/site/consent";

export function CookieSettingsButton({ className = "" }: { className?: string }) {
  if (!ANALYTICS_COOKIES_ENABLED) return null;
  return (
    <button type="button" onClick={resetConsent} className={className}>
      Cookie settings
    </button>
  );
}
