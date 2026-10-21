"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/site/analytics";

/**
 * Turns any element with a data-track attribute into an analytics event when clicked, so server
 * components and article HTML can be tracked without becoming client components.
 * Optional data-track-location says where on the page the click happened.
 */
export function TrackClicks() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const element = target.closest<HTMLElement>("[data-track]");
      if (!element) return;
      const name = element.dataset.track;
      if (!name) return;
      trackEvent(name, {
        location: element.dataset.trackLocation,
        page: window.location.pathname,
      });
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
