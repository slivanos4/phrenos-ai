"use client";

import { FormEvent, useState } from "react";

type UpdatesSubscribeFormProps = {
  source?: string;
  compact?: boolean;
};

const fieldClass =
  "min-w-0 flex-1 rounded-full border border-[#d4af5a]/55 bg-[#101c14]/55 px-5 py-3 text-sm text-ivory outline-none transition-colors placeholder:text-sage/55 focus:border-[#e0c078] focus:bg-[#101c14]/75";

function SubscribeSuccessMark({ compact }: { compact: boolean }) {
  const size = compact ? "h-16 w-16" : "h-24 w-24";
  return (
    <div className={`relative mx-auto ${size}`} aria-hidden>
      <div className="absolute inset-0 rounded-full bg-[#d4af5a]/15 blur-md animate-pulse-soft" />
      <svg
        viewBox="0 0 96 96"
        className="relative h-full w-full animate-fade-up"
        fill="none"
      >
        <circle
          cx="48"
          cy="48"
          r="44"
          stroke="#d4af5a"
          strokeOpacity="0.35"
          strokeWidth="1.5"
        />
        <circle
          cx="48"
          cy="48"
          r="34"
          stroke="#e0c078"
          strokeOpacity="0.55"
          strokeWidth="1.25"
          className="origin-center animate-orrery"
          style={{ transformOrigin: "48px 48px" }}
          strokeDasharray="8 10"
        />
        {/* Envelope */}
        <path
          d="M28 40h40v24H28V40Z"
          stroke="#e0c078"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
        <path
          d="M28 40l20 14 20-14"
          stroke="#e0c078"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
        {/* Phi spark */}
        <path
          d="M48 28v12M44 34c0-2.5 1.8-4.5 4-4.5s4 2 4 4.5-1.8 4.5-4 4.5"
          stroke="#f1e8d6"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Signal arcs */}
        <path
          d="M62 30c4 3 6.5 7.5 6.5 12.5"
          stroke="#d4af5a"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M67 26c6 4.5 9.5 11 9.5 18"
          stroke="#d4af5a"
          strokeWidth="1.25"
          strokeLinecap="round"
          opacity="0.45"
        />
      </svg>
    </div>
  );
}

function SubscribeSuccess({
  already,
  compact,
}: {
  already: boolean;
  compact: boolean;
}) {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <div
      className={`animate-fade-up text-center ${compact ? "max-w-md" : "max-w-xl"}`}
      role="status"
    >
      <SubscribeSuccessMark compact={compact} />

      <p className="mt-5 text-xs font-semibold tracking-[0.28em] text-gold uppercase animate-fade-up-delay-1">
        {already ? "Already tuned in" : "You're on the list"}
      </p>

      <h2
        className={`mt-3 font-serif leading-snug text-ivory animate-fade-up-delay-1 ${
          compact ? "text-2xl" : "text-3xl sm:text-[2.15rem]"
        }`}
      >
        {already ? "Still with us. Good." : "You're in."}
      </h2>

      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-sage animate-fade-up-delay-2 sm:text-base">
        {already
          ? "Your place is saved. The next AI Update will land in your inbox the moment it goes live."
          : "Fresh intelligence, straight to you when we publish. Sharp minds get first look."}
      </p>

      <div className="mt-7 animate-fade-up-delay-3">
        <button
          type="button"
          onClick={() => setAcknowledged(true)}
          className={`inline-flex items-center justify-center rounded-full px-7 py-3.5 text-sm font-semibold tracking-wide transition-all ${
            acknowledged
              ? "border border-[#d4af5a]/50 bg-[#d4af5a]/15 text-[#e0c078]"
              : "border border-gold bg-gold text-forest hover:bg-[#e0c078] hover:scale-[1.02] active:scale-[0.98]"
          }`}
        >
          {acknowledged
            ? "You're all set"
            : already
              ? "Nice one"
              : "Congratulations"}
        </button>
      </div>
    </div>
  );
}

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
    return <SubscribeSuccess already={already} compact={compact} />;
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
