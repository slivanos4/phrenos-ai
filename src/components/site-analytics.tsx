"use client";

import Script from "next/script";
import { useSyncExternalStore } from "react";
import { readConsent, subscribeConsent } from "@/lib/site/consent";

/**
 * Optional free analytics, loaded only after the visitor accepts cookies. Set IDs in env to enable; omit to keep the site clean.
 * - NEXT_PUBLIC_CLARITY_PROJECT_ID → Microsoft Clarity (heatmaps / replays)
 * - NEXT_PUBLIC_GA_MEASUREMENT_ID → Google Analytics 4 (e.g. G-XXXXXXXX)
 */
export function SiteAnalytics() {
  const consent = useSyncExternalStore(subscribeConsent, readConsent, () => null);
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim();
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

  if (consent !== "granted") return null;
  if (!clarityId && !gaId) return null;

  return (
    <>
      {clarityId ? (
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", ${JSON.stringify(clarityId)});`}
        </Script>
      ) : null}

      {gaId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', ${JSON.stringify(gaId)});`}
          </Script>
        </>
      ) : null}
    </>
  );
}
