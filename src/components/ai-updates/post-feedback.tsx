"use client";

import { useEffect, useState } from "react";

type Reaction = "up" | "down";

type PostFeedbackProps = {
  postId: string;
};

const STORAGE_PREFIX = "phrenos-post-feedback:";
const VISITOR_KEY = "phrenos-visitor-key";

function readStoredReaction(postId: string): Reaction | null {
  try {
    const value = window.localStorage.getItem(`${STORAGE_PREFIX}${postId}`);
    return value === "up" || value === "down" ? value : null;
  } catch {
    return null;
  }
}

function storeReaction(postId: string, reaction: Reaction) {
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${postId}`, reaction);
  } catch {
    // Ignore private-mode / blocked storage.
  }
}

function getOrCreateVisitorKey(): string {
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing && /^[a-zA-Z0-9_-]{8,64}$/.test(existing)) return existing;
    const created =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().replace(/-/g, "")
        : `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(VISITOR_KEY, created);
    return created;
  } catch {
    return `anon${Date.now().toString(36)}`;
  }
}

function GoldThumb({ direction }: { direction: "up" | "down" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-7 w-7 ${direction === "down" ? "rotate-180" : ""}`}
      fill="currentColor"
    >
      <path d="M9 21h7.28a2 2 0 0 0 1.92-1.45l2.15-7.5A1.5 1.5 0 0 0 18.9 10H14V5.5A2.5 2.5 0 0 0 11.5 3h-.17a1 1 0 0 0-.95.68L9 10H5.5A1.5 1.5 0 0 0 4 11.5v6A1.5 1.5 0 0 0 5.5 19H9v2Z" />
    </svg>
  );
}

export function PostFeedback({ postId }: PostFeedbackProps) {
  const [selected, setSelected] = useState<Reaction | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelected(readStoredReaction(postId));
  }, [postId]);

  async function vote(reaction: Reaction) {
    if (pending) return;
    setPending(true);
    setError(null);

    const previous = selected;
    setSelected(reaction);
    storeReaction(postId, reaction);

    try {
      const response = await fetch(
        `/api/phrenos-updates/posts/${postId}/feedback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reaction,
            visitorKey: getOrCreateVisitorKey(),
          }),
        }
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error || "Could not save feedback.");
      }
    } catch (err) {
      setSelected(previous);
      if (previous) storeReaction(postId, previous);
      else {
        try {
          window.localStorage.removeItem(`${STORAGE_PREFIX}${postId}`);
        } catch {
          // ignore
        }
      }
      setError(err instanceof Error ? err.message : "Could not save feedback.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-12 rounded-2xl border border-[#d4af5a]/25 bg-[#101c14]/60 px-6 py-8 text-center">
      <p className="text-xs font-semibold tracking-[0.28em] text-gold uppercase">
        Feedback
      </p>
      <p className="mt-3 text-base leading-relaxed text-ivory">
        Was this useful?
      </p>

      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          type="button"
          aria-label="Thumbs up, this was useful"
          aria-pressed={selected === "up"}
          disabled={pending}
          onClick={() => vote("up")}
          className={`inline-flex h-14 w-14 items-center justify-center rounded-full border transition-colors disabled:opacity-60 ${
            selected === "up"
              ? "border-[#e0c078] bg-[#d4af5a]/20 text-[#e0c078]"
              : "border-[#d4af5a]/50 text-[#d4af5a] hover:border-[#e0c078] hover:bg-[#d4af5a]/10 hover:text-[#e0c078]"
          }`}
        >
          <GoldThumb direction="up" />
        </button>
        <button
          type="button"
          aria-label="Thumbs down, this was not useful"
          aria-pressed={selected === "down"}
          disabled={pending}
          onClick={() => vote("down")}
          className={`inline-flex h-14 w-14 items-center justify-center rounded-full border transition-colors disabled:opacity-60 ${
            selected === "down"
              ? "border-[#e0c078] bg-[#d4af5a]/20 text-[#e0c078]"
              : "border-[#d4af5a]/50 text-[#d4af5a] hover:border-[#e0c078] hover:bg-[#d4af5a]/10 hover:text-[#e0c078]"
          }`}
        >
          <GoldThumb direction="down" />
        </button>
      </div>

      {selected ? (
        <p className="mt-5 text-sm text-sage">Thank you for the feedback.</p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-sage">{error}</p> : null}
    </div>
  );
}
