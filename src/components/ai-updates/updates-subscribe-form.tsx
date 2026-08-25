"use client";

import { FormEvent, useState } from "react";

type UpdatesSubscribeFormProps = {
  source?: string;
  compact?: boolean;
};

const fieldClass =
  "min-w-0 flex-1 rounded-full border border-[#d4af5a]/55 bg-[#101c14]/55 px-5 py-3 text-sm text-ivory outline-none transition-colors placeholder:text-sage/55 focus:border-[#e0c078] focus:bg-[#101c14]/75";

export function UpdatesSubscribeForm({
  source = "ai-updates",
  compact = false,
}: UpdatesSubscribeFormProps) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [already, setAlready] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    if (String(data.get("website") || "")) {
      setDone(true);
      return;
    }

    const value = email.trim();
    if (!value) {
      setError("Please enter your email.");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/phrenos-updates/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, source }),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        alreadySubscribed?: boolean;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(result.error || "Something went wrong. Please try again.");
      }
      setAlready(Boolean(result.alreadySubscribed));
      setDone(true);
      setEmail("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <p className="text-sm leading-relaxed text-sage" role="status">
        {already
          ? "You are already on the list. We will email you when the next article goes live."
          : "You are on the list. We will email you when a new AI Update is published."}
      </p>
    );
  }

  return (
    <div className={compact ? "" : "max-w-xl"}>
      {!compact ? (
        <>
          <p className="text-xs font-semibold tracking-[0.28em] text-gold uppercase">
            Stay informed
          </p>
          <h2 className="mt-3 font-serif text-2xl leading-snug text-ivory sm:text-3xl">
            Get new articles by email
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-sage">
            Occasional notes when we publish. No weekly noise, unsubscribe any
            time.
          </p>
        </>
      ) : (
        <p className="text-sm leading-relaxed text-sage">
          Want the next update by email?
        </p>
      )}

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className={compact ? "mt-4" : "mt-6"}
      >
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor={`subscribe-email-${source}`}>
            Email
          </label>
          <input
            id={`subscribe-email-${source}`}
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            className={fieldClass}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending}
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-gold px-6 py-3 text-sm font-semibold tracking-wide text-ivory transition-colors hover:bg-gold hover:text-forest disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? "Saving..." : "Subscribe"}
          </button>
        </div>
        {error ? (
          <p className="mt-3 text-sm text-[#e8b4a0]" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
