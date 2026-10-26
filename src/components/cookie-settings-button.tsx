"use client";

import { resetConsent } from "@/lib/site/consent";

export function CookieSettingsButton({ className = "" }: { className?: string }) {
  return (
    <button type="button" onClick={resetConsent} className={className}>
      Cookie settings
    </button>
  );
}
