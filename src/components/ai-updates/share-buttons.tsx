"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/site/analytics";

const buttonClass =
  "inline-flex items-center justify-center rounded-full border border-[#d4af5a]/55 px-5 py-2.5 text-sm font-semibold tracking-wide text-ivory transition-colors hover:border-[#e0c078] hover:bg-[#d4af5a]/10";

/** Copy the link or share the article on LinkedIn. */
export function ShareButtons({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const area = document.createElement("textarea");
      area.value = url;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }
    trackEvent("share", { method: "copy_link", content_type: "article" });
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-[#d4af5a]/20 pt-6">
      <p className="mr-2 text-xs font-semibold tracking-[0.2em] text-sage uppercase">Share this article</p>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent("share", { method: "linkedin", content_type: "article" })}
        className={buttonClass}
      >
        Share on LinkedIn
      </a>
      <button type="button" onClick={() => void copy()} className={buttonClass} aria-live="polite">
        {copied ? "Link copied" : "Copy link"}
      </button>
    </div>
  );
}
