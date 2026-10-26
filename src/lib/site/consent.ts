/** The visitor's cookie choice, kept in their own browser. Analytics only runs when this is "granted". */

/**
 * Analytics cookies (Google Analytics and Microsoft Clarity) are switched off. Without them the site sets no
 * non-essential cookies, so no cookie banner is needed. To turn them back on, set NEXT_PUBLIC_ANALYTICS_COOKIES=on
 * in Vercel: the banner returns and the scripts load only after a visitor accepts.
 */
export const ANALYTICS_COOKIES_ENABLED = process.env.NEXT_PUBLIC_ANALYTICS_COOKIES === "on";

export type Consent = "granted" | "denied" | null;

const KEY = "phrenos-cookie-consent";
const EVENT = "phrenos-cookie-consent-change";

export function readConsent(): Consent {
  try {
    const value = window.localStorage.getItem(KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function subscribeConsent(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

export function setConsent(value: "granted" | "denied"): void {
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    // Without storage the choice only lasts until the page is reloaded.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Forget the choice, so the banner asks again. Reloads so any analytics already running is switched off. */
export function resetConsent(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to forget.
  }
  window.location.reload();
}
