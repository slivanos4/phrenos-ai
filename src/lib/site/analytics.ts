type EventParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
    umami?: { track: (name: string, data?: Record<string, string | number | boolean>) => void };
  }
}

/**
 * Send a named event to Umami (cookieless, always on), and to Google Analytics and Microsoft Clarity when
 * those are switched on. Safe when none is loaded.
 */
export function trackEvent(name: string, params: EventParams = {}): void {
  if (typeof window === "undefined") return;
  try {
    const data = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined)) as Record<
      string,
      string | number | boolean
    >;
    window.umami?.track(name, data);
    window.gtag?.("event", name, params);
    window.clarity?.("event", name);
  } catch {
    // Analytics must never get in the way of the page.
  }
}
