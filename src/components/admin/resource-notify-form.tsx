"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

const panelClass =
  "rounded-2xl border border-[#d4af5a]/25 bg-[#101c14]/88 p-5 backdrop-blur-md sm:p-6";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full border border-[#d4af5a] bg-[#d4af5a] px-4 py-2 text-xs font-semibold tracking-wide text-[#0a100c] transition-colors hover:bg-[#e0c078] disabled:cursor-not-allowed disabled:opacity-50";
const fieldClass =
  "w-full rounded-xl border border-[#d4af5a]/55 bg-[#0a100c]/70 px-4 py-2.5 text-sm text-[#f1e8d6] outline-none transition-colors placeholder:text-[#a9b0a3]/60 focus:border-[#e0c078]";
const labelClass =
  "block text-[10px] font-semibold tracking-[0.18em] text-[#a9b0a3] uppercase";

type NotifyResult = { sent: number; skipped: boolean };

export function ResourceNotifyForm() {
  const [authenticated, setAuthenticated] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("/resources");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NotifyResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const response = await fetch("/api/phrenos-updates/auth");
        const payload = (await response.json().catch(() => null)) as {
          authenticated?: boolean;
        } | null;
        if (!cancelled) setAuthenticated(Boolean(payload?.authenticated));
      } catch {
        if (!cancelled) setAuthenticated(false);
      }
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/phrenos-updates/resources/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, url }),
      });
      const payload = (await response.json().catch(() => null)) as
        | (NotifyResult & { error?: string })
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? `Request failed with status ${response.status}`);
      }

      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to notify subscribers");
    } finally {
      setSending(false);
    }
  }

  if (!authenticated) {
    return (
      <section className={panelClass}>
        <p className="text-xs font-semibold tracking-[0.22em] text-[#d4af5a] uppercase">
          Resources
        </p>
        <h2 className="mt-2 font-serif text-xl text-[#f1e8d6]">
          Notify subscribers about a new resource
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#a9b0a3]">
          Sign in above, then refresh this page to use this.
        </p>
      </section>
    );
  }

  return (
    <section className={panelClass}>
      <p className="text-xs font-semibold tracking-[0.22em] text-[#d4af5a] uppercase">
        Resources
      </p>
      <h2 className="mt-2 font-serif text-xl text-[#f1e8d6]">
        Notify subscribers about a new resource
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[#a9b0a3]">
        Use this whenever a new tool or cheat sheet goes up on{" "}
        <span className="text-[#e0c078]">/resources</span>. It emails every
        active AI Updates subscriber the same way a new blog post does.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <label className="block space-y-2">
          <span className={labelClass}>Resource title</span>
          <input
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={fieldClass}
            placeholder="How to Brief AI Like a Strategist"
          />
        </label>

        <label className="block space-y-2">
          <span className={labelClass}>Short description (optional)</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className={`${fieldClass} min-h-[4.5rem] resize-y`}
            placeholder="One or two sentences on what it is and who it's for."
          />
        </label>

        <label className="block space-y-2">
          <span className={labelClass}>Link</span>
          <input
            required
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className={fieldClass}
            placeholder="/resources"
          />
        </label>

        <button type="submit" disabled={sending} className={primaryButtonClass}>
          {sending ? "Sending…" : "Notify subscribers"}
        </button>

        {error ? (
          <p className="text-sm text-[#e8b4a0]" role="alert">
            {error}
          </p>
        ) : null}

        {result ? (
          <p className="text-sm text-[#a9b0a3]" role="status">
            {result.skipped
              ? "No email sent (Resend is not configured on this environment)."
              : `Sent to ${result.sent} subscriber${result.sent === 1 ? "" : "s"}.`}
          </p>
        ) : null}
      </form>
    </section>
  );
}
