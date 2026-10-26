"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useSyncExternalStore } from "react";
import { ANALYTICS_COOKIES_ENABLED, readConsent, subscribeConsent } from "@/lib/site/consent";

// The public ID of the Phrenos.ai website in Umami Cloud (EU). It is not a secret.
const UMAMI_WEBSITE_ID =
  process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID?.trim() || "4aaa4b47-44b9-4d15-8444-5492381457fb";

/**
 * Analytics.
 * - Umami: counts visits and clicks without cookies, so it needs no banner. It only runs on the real domain
 *   (not local or preview builds) and never on the private admin pages.
 * - Google Analytics and Microsoft Clarity set cookies, so they stay off unless NEXT_PUBLIC_ANALYTICS_COOKIES=on,
 *   and then only after a visitor accepts the cookie banner.
 *   NEXT_PUBLIC_GA_MEASUREMENT_ID and NEXT_PUBLIC_CLARITY_PROJECT_ID hold their IDs.
 */
export function SiteAnalytics() {
  const pathname = usePathname();
  const consent = useSyncExternalStore(subscribeConsent, readConsent, () => null);
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim();
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  const cookiesAllowed = ANALYTICS_COOKIES_ENABLED && consent === "granted";
  const isAdmin = pathname?.startsWith("/admin");

  return (
    <>
      {!isAdmin ? (
        <Script
          id="umami"
          src="https://cloud.umami.is/script.js"
          data-website-id={UMAMI_WEBSITE_ID}
          data-domains="www.phrenosai.com,phrenosai.com"
          strategy="afterInteractive"
        />
      ) : null}

      {cookiesAllowed && clarityId ? (
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", ${JSON.stringify(clarityId)});`}
        </Script>
      ) : null}

      {cookiesAllowed && gaId ? (
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
