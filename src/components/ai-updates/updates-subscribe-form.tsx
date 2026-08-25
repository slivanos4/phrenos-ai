"use client";

import { FormEvent, useState } from "react";

type UpdatesSubscribeFormProps = {
  source?: string;
  compact?: boolean;
};

const fieldClass =
  "min-w-0 flex-1 rounded-full border border-[#d4af5a]/55 bg-[#101c14]/55 px-5 py-3 text-sm text-ivory outline-none transition-colors placeholder:text-sage/55 focus:border-[#e0c078] focus:bg-[#101c14]/75";

function SubscribeSuccessMark({ compact }: { compact: boolean }) {
  const size = compact ? "h-20 w-20" : "h-28 w-28";
  return (
    <div className={`relative mx-auto ${size}`} aria-hidden>
      <div className="absolute inset-[-12%] rounded-full bg-[radial-gradient(circle,rgba(212,175,90,0.28)_0%,rgba(212,175,90,0.08)_45%,transparent_70%)] animate-pulse-soft" />
      <svg
        viewBox="0 0 120 120"
        className="relative h-full w-full animate-fade-up"
        fill="none"
      >
        <circle
          cx="60"
          cy="60"
          r="52"
          stroke="#d4af5a"
          strokeOpacity="0.28"
          strokeWidth="1"
        />
        <circle
          cx="60"
          cy="60"
          r="42"
          stroke="#e0c078"
          strokeOpacity="0.7"
          strokeWidth="1.5"
        />
        {/* Soft fill disc */}
        <circle cx="60" cy="60" r="34" fill="#d4af5a" fillOpacity="0.1" />
        {/* Phi monogram */}
        <path
          d="M60 28v52M48 42c0-8 5.4-14 12-14s12 6 12 14-5.4 14-12 14c-4.2 0-7.8-2.4-9.8-6"
          stroke="#f1e8d6"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M48 70c2.2 4.2 6.2 7 12 7s9.8-2.8 12-7"
          stroke="#e0c078"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Accent sparks */}
        <circle cx="86" cy="38" r="2" fill="#e0c078" />
        <circle cx="34" cy="46" r="1.5" fill="#d4af5a" opacity="0.8" />
        <circle cx="88" cy="72" r="1.5" fill="#d4af5a" opacity="0.65" />
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

      <p className="mt-6 text-xs font-semibold tracking-[0.28em] text-gold uppercase animate-fade-up-delay-1">
        {already ? "Already with us" : "Subscription confirmed"}
      </p>

      <h2
        className={`mt-3 font-serif leading-snug text-ivory animate-fade-up-delay-1 ${
          compact ? "text-2xl" : "text-3xl sm:text-[2.25rem]"
        }`}
      >
        {already
          ? "Your curiosity is already on record."
          : "Curiosity looks good on you."}
      </h2>

      <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-sage animate-fade-up-delay-2 sm:text-base">
        {already
          ? "You're set. The next AI Update will arrive in your inbox the moment we publish."
          : "We'll write when there is something worth your attention. Intelligence over noise, every time."}
      </p>

      <div className="mt-8 animate-fade-up-delay-3">
        <button
          type="button"
          onClick={() => setAcknowledged(true)}
          className={`inline-flex items-center justify-center rounded-full px-8 py-3.5 text-sm font-semibold tracking-wide transition-all ${
            acknowledged
              ? "border border-[#d4af5a]/55 bg-[#d4af5a]/18 text-[#e0c078]"
              : "border border-gold bg-gold text-forest shadow-[0_0_28px_rgba(212,175,90,0.28)] hover:bg-[#e0c078] hover:scale-[1.03] active:scale-[0.98]"
          }`}
        >
          {acknowledged ? "Welcome to Phrenos." : "Congratulations!"}
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
