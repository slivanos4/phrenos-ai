"use client";

import { FormEvent, useState, useSyncExternalStore } from "react";
import { leadMagnets } from "@/data/site-content";
import { trackEvent } from "@/lib/site/analytics";
import { isEmail, joinBriefing, submitLead } from "@/lib/site/lead";

const STORAGE_KEY = "phrenos-brief-sheet-unlocked";
const CHANGE_EVENT = "phrenos-brief-sheet-unlocked-change";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function readUnlocked(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

const fieldClass =
  "min-w-0 flex-1 rounded-full border border-[#d4af5a]/55 bg-[#101c14]/55 px-5 py-3 text-sm text-ivory outline-none transition-colors placeholder:text-sage/55 focus:border-[#e0c078] focus:bg-[#101c14]/75";

/**
 * The cheat sheet is free, in exchange for an email address. Once someone has given theirs, this browser
 * remembers it and shows the download straight away next time.
 */
export function BriefSheetGate({ pdfHref, downloadName }: { pdfHref: string; downloadName: string }) {
  const unlocked = useSyncExternalStore(subscribe, readUnlocked, () => false);
  const [email, setEmail] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    if (String(data.get("website") || "")) return;

    if (!isEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setSending(true);
    await submitLead({
      source: "Cheat sheet: How to Brief AI Like a Strategist",
      email,
      details: { newsletter_opt_in: optIn ? "yes" : "no" },
    });
    if (optIn) await joinBriefing(email, "cheat-sheet");
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // The download still appears below this visit.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
    setSending(false);
  }

  if (unlocked) {
    return (
      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
        <a
          href={pdfHref}
          download={downloadName}
          data-track="download_brief_pdf"
          className="inline-flex items-center justify-center rounded-full border border-gold bg-gold px-7 py-3.5 text-sm font-semibold tracking-wide text-forest transition-colors hover:bg-[#e0c078]"
        >
          Download the PDF
        </a>
        <a
          href={pdfHref}
          target="_blank"
          rel="noopener noreferrer"
          data-track="open_brief_pdf"
          className="inline-flex items-center justify-center rounded-full border border-[#d4af5a]/55 px-7 py-3.5 text-sm font-semibold tracking-wide text-ivory transition-colors hover:border-[#e0c078] hover:bg-[#d4af5a]/10"
        >
          Open in browser
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      onFocus={() => trackEvent("lead_form_start", { form: "cheat-sheet" })}
      className="mt-10 max-w-xl rounded-2xl border border-[#d4af5a]/35 bg-[#d4af5a]/[0.07] p-5 sm:p-6"
    >
      <p className="font-serif text-2xl text-[#e0c078]">{leadMagnets.briefSheet.heading}</p>
      <p className="mt-2 text-sm leading-relaxed text-ivory/85">{leadMagnets.briefSheet.description}</p>
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="brief-sheet-email">
          Email
        </label>
        <input
          id="brief-sheet-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          className={fieldClass}
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending}
          className="inline-flex shrink-0 items-center justify-center rounded-full border border-gold bg-gold px-7 py-3 text-sm font-semibold tracking-wide text-forest transition-colors hover:bg-[#e0c078] disabled:cursor-wait disabled:opacity-70"
        >
          {sending ? "One moment..." : leadMagnets.briefSheet.button}
        </button>
      </div>
      <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm leading-snug text-sage">
        <input
          type="checkbox"
          checked={optIn}
          onChange={(event) => setOptIn(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#d4af5a]"
        />
        <span>{leadMagnets.briefSheet.newsletterOptIn}</span>
      </label>
      {error ? (
        <p className="mt-3 text-sm text-[#e8b4a0]" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
