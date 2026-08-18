"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatSourcePublishedDate } from "@/lib/phrenos-updates/source-dates";
import {
  SECTION_LABELS,
  type ContentSuggestion,
  type ResearchRun,
  type ResearchSection,
  type ResearchSource,
  type ResearchStory,
  type SuggestionStatus,
} from "@/lib/phrenos-updates/types";

type AuthState = "loading" | "unconfigured" | "signed-out" | "signed-in";

type RepairResult = {
  repaired: number;
  total: number;
  remaining: number;
  complete: boolean;
  processingStoryTitle: string | null;
};

type PublishResponse = {
  published: number;
  skipped: number;
  posts: { id: string; title: string; slug: string }[];
};

const RESEARCH_STEPS = [
  "Find recent headlines",
  "Read full articles",
  "Extract source facts",
  "Curate six stories",
];

const CONTENT_STEPS = [
  "Review story sources",
  "Draft post ideas",
  "Write featured posts",
  "Save to your batch",
];

const RESEARCH_STEP_MS = 15000;
const CONTENT_STEP_MS = 7000;
const POLL_MS = 4000;
const MAX_CONTENT_PASSES = 30;

const SECTION_ORDER: ResearchSection[] = ["models_research", "products_industry"];

const panelClass =
  "rounded-2xl border border-[#d4af5a]/25 bg-[#101c14]/88 p-5 backdrop-blur-md sm:p-6";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full border border-[#d4af5a] bg-[#d4af5a] px-4 py-2 text-xs font-semibold tracking-wide text-[#0a100c] transition-colors hover:bg-[#e0c078] disabled:cursor-not-allowed disabled:opacity-50";
const ghostButtonClass =
  "inline-flex items-center justify-center rounded-full border border-[#d4af5a]/55 px-4 py-2 text-xs font-semibold tracking-wide text-[#f1e8d6] transition-colors hover:border-[#e0c078] hover:bg-[#d4af5a]/10 disabled:cursor-not-allowed disabled:opacity-50";
const microButtonClass =
  "inline-flex items-center justify-center rounded-full border border-[#d4af5a]/45 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[#e0c078] transition-colors hover:border-[#e0c078] hover:bg-[#d4af5a]/10 disabled:cursor-not-allowed disabled:opacity-50";
const inputClass =
  "w-full rounded-full border border-[#d4af5a]/55 bg-[#0a100c]/70 px-5 py-3 text-sm text-[#f1e8d6] outline-none transition-colors placeholder:text-[#a9b0a3]/60 focus:border-[#e0c078]";

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;

  if (!response.ok) {
    throw new ApiError(
      payload?.error ?? `Request failed with status ${response.status}`,
      response.status,
    );
  }

  return payload as T;
}

function formatDateTime(value: string | null): string {
  if (!value) return "Not started";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatWeek(run: ResearchRun): string {
  if (run.lookback_start && run.lookback_end) {
    const start = formatSourcePublishedDate(run.lookback_start);
    const end = formatSourcePublishedDate(run.lookback_end);
    return `${start} to ${end}`;
  }
  return formatDateTime(run.created_at);
}

function summaryBullets(summary: string): string[] {
  if (!summary?.trim()) return [];

  const listItems = [...summary.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (listItems.length > 0) return listItems;

  return summary
    .split("\n")
    .map((line) => line.trim().replace(/^[-•]\s*/, "").trim())
    .filter((line) => line.length > 0 && !/^<[a-z]/i.test(line));
}

function htmlToText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(html: string): number {
  const text = htmlToText(html);
  return text ? text.split(" ").length : 0;
}

function statusTone(status: SuggestionStatus | ResearchRun["status"]): string {
  switch (status) {
    case "approved":
    case "completed":
      return "border-[#8fbf9f]/45 text-[#8fbf9f]";
    case "rejected":
    case "failed":
      return "border-[#e8b4a0]/45 text-[#e8b4a0]";
    case "published":
    case "running":
      return "border-[#d4af5a]/55 text-[#e0c078]";
    default:
      return "border-[#a9b0a3]/35 text-[#a9b0a3]";
  }
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.14em] uppercase ${tone}`}
    >
      {children}
    </span>
  );
}

/** Owns its own step timer, so mounting it while an action runs restarts the sequence. */
function ProgressBanner({
  label,
  steps,
  intervalMs,
  cycle = false,
  detail,
}: {
  label: string;
  steps: string[];
  intervalMs: number;
  cycle?: boolean;
  detail?: string | null;
}) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((current) =>
        cycle
          ? (current + 1) % steps.length
          : Math.min(current + 1, steps.length - 1),
      );
    }, intervalMs);
    return () => clearInterval(timer);
  }, [cycle, intervalMs, steps.length]);

  return (
    <div className="rounded-xl border border-[#d4af5a]/35 bg-[#0a100c]/80 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-[10px] font-semibold tracking-[0.22em] text-[#a9b0a3] uppercase">
          {label}
        </span>
        <span className="text-sm text-[#f1e8d6]">
          {steps[step]}{" "}
          <span className="text-[#a9b0a3]">
            (step {step + 1} of {steps.length})
          </span>
        </span>
      </div>
      {detail ? (
        <p className="mt-1.5 text-xs text-[#a9b0a3]">{detail}</p>
      ) : null}
      <div className="mt-3 flex gap-1.5">
        {steps.map((name, index) => (
          <span
            key={name}
            className={`h-1 flex-1 rounded-full ${
              index <= step ? "bg-[#d4af5a]" : "bg-[#d4af5a]/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function SourceRow({ source }: { source: ResearchSource }) {
  return (
    <li className="rounded-lg border border-[#d4af5a]/15 bg-[#0a100c]/60 px-3 py-2.5">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer noopener"
          className="text-xs font-medium text-[#e0c078] underline-offset-2 hover:underline"
        >
          {source.title || source.url}
        </a>
        <span className="text-[11px] text-[#a9b0a3]">
          {formatSourcePublishedDate(source.published_at)}
        </span>
      </div>
      <p className="mt-1 truncate text-[11px] text-[#a9b0a3]/80">{source.url}</p>
      {source.extracted_facts ? (
        <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-[#c9c6ba]">
          {source.extracted_facts}
        </p>
      ) : source.snapshot_excerpt ? (
        <p className="mt-2 text-xs leading-relaxed text-[#c9c6ba]">
          {source.snapshot_excerpt}
        </p>
      ) : null}
    </li>
  );
}

function SuggestionCard({
  suggestion,
  busy,
  onExpandIdea,
  onSetStatus,
}: {
  suggestion: ContentSuggestion;
  busy: boolean;
  onExpandIdea: (id: string) => void;
  onSetStatus: (id: string, status: "approved" | "rejected") => void;
}) {
  const [showBody, setShowBody] = useState(false);
  const isIdea = !suggestion.is_full_draft;

  return (
    <div className="rounded-xl border border-[#d4af5a]/20 bg-[#0a100c]/55 px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="border-[#d4af5a]/40 text-[#d4af5a]">
          {suggestion.suggestion_type === "blog" ? "Blog" : "LinkedIn"}
        </Badge>
        <Badge tone="border-[#a9b0a3]/35 text-[#a9b0a3]">
          {isIdea ? "Idea" : "Featured draft"}
        </Badge>
        <Badge tone={statusTone(suggestion.status)}>{suggestion.status}</Badge>
        {!isIdea ? (
          <span className="text-[11px] text-[#a9b0a3]">
            {countWords(suggestion.body_html)} words
          </span>
        ) : null}
      </div>

      <p className="mt-2.5 text-sm font-semibold text-[#f1e8d6]">
        {suggestion.title}
      </p>
      {suggestion.hook ? (
        <p className="mt-1 text-xs leading-relaxed text-[#c9c6ba]">
          {suggestion.hook}
        </p>
      ) : null}

      {!isIdea && !showBody && suggestion.body_html ? (
        <p className="mt-2 text-xs leading-relaxed text-[#a9b0a3]">
          {htmlToText(suggestion.body_html).slice(0, 260)}...
        </p>
      ) : null}

      {!isIdea && showBody ? (
        <div
          className="mt-3 space-y-3 border-t border-[#d4af5a]/15 pt-3 text-xs leading-relaxed text-[#c9c6ba] [&_a]:text-[#e0c078] [&_h2]:mt-4 [&_h2]:font-serif [&_h2]:text-base [&_h2]:text-[#f1e8d6] [&_h3]:mt-3 [&_h3]:font-serif [&_h3]:text-sm [&_h3]:text-[#f1e8d6] [&_li]:ml-4 [&_li]:list-disc [&_strong]:text-[#f1e8d6]"
          dangerouslySetInnerHTML={{ __html: suggestion.body_html }}
        />
      ) : null}

      {!isIdea && suggestion.cta ? (
        <p className="mt-3 text-[11px] text-[#a9b0a3]">
          <span className="tracking-[0.16em] uppercase">Call to action</span>{" "}
          {suggestion.cta}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {isIdea ? (
          <button
            type="button"
            className={microButtonClass}
            disabled={busy}
            onClick={() => onExpandIdea(suggestion.id)}
          >
            {busy ? "Expanding..." : "Expand into featured post"}
          </button>
        ) : (
          <>
            <button
              type="button"
              className={microButtonClass}
              onClick={() => setShowBody((current) => !current)}
            >
              {showBody ? "Hide draft" : "Read draft"}
            </button>
            <button
              type="button"
              className={microButtonClass}
              disabled={busy || suggestion.status === "published"}
              onClick={() => onSetStatus(suggestion.id, "approved")}
            >
              Approve
            </button>
            <button
              type="button"
              className={microButtonClass}
              disabled={busy || suggestion.status === "published"}
              onClick={() => onSetStatus(suggestion.id, "rejected")}
            >
              Reject
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function StoryCard({
  story,
  index,
  busyIds,
  onExpandIdea,
  onSetStatus,
}: {
  story: ResearchStory;
  index: number;
  busyIds: Set<string>;
  onExpandIdea: (id: string) => void;
  onSetStatus: (id: string, status: "approved" | "rejected") => void;
}) {
  const [showSources, setShowSources] = useState(false);

  const bullets = summaryBullets(story.summary_html);
  const ideas = story.suggestions.filter((item) => !item.is_full_draft);
  const drafts = story.suggestions.filter((item) => item.is_full_draft);

  return (
    <article className="rounded-2xl border border-[#d4af5a]/20 bg-[#101c14]/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold tracking-[0.22em] text-[#d4af5a] uppercase">
          {SECTION_LABELS[story.section] ?? story.section}
        </span>
        <span className="text-[11px] text-[#a9b0a3]">Story {index + 1}</span>
        {story.topic_tags?.map((tag) => (
          <Badge key={tag} tone="border-[#a9b0a3]/30 text-[#a9b0a3]">
            {tag}
          </Badge>
        ))}
      </div>

      <h3 className="mt-2 font-serif text-xl leading-snug text-[#f1e8d6]">
        {story.title}
      </h3>

      {bullets.length > 0 ? (
        <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-[#c9c6ba]">
          {bullets.map((bullet) => (
            <li key={bullet} className="flex gap-2">
              <span aria-hidden className="text-[#d4af5a]">
                •
              </span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      ) : story.summary_html ? (
        <div
          className="mt-3 text-sm leading-relaxed text-[#c9c6ba] [&_li]:ml-4 [&_li]:list-disc [&_p]:mt-2"
          dangerouslySetInnerHTML={{ __html: story.summary_html }}
        />
      ) : (
        <p className="mt-3 text-sm text-[#a9b0a3]">No summary saved yet.</p>
      )}

      <div className="mt-4 border-t border-[#d4af5a]/15 pt-3">
        <button
          type="button"
          className="text-[11px] font-semibold tracking-[0.16em] text-[#e0c078] uppercase"
          onClick={() => setShowSources((current) => !current)}
        >
          {showSources ? "Hide" : "Show"} sources ({story.sources.length})
        </button>
        {showSources ? (
          <ul className="mt-3 space-y-2">
            {story.sources.map((source) => (
              <SourceRow key={source.id} source={source} />
            ))}
          </ul>
        ) : null}
      </div>

      {drafts.length > 0 ? (
        <div className="mt-4">
          <p className="text-[10px] font-semibold tracking-[0.22em] text-[#a9b0a3] uppercase">
            Featured drafts
          </p>
          <div className="mt-2 space-y-2.5">
            {drafts.map((draft) => (
              <SuggestionCard
                key={draft.id}
                suggestion={draft}
                busy={busyIds.has(draft.id)}
                onExpandIdea={onExpandIdea}
                onSetStatus={onSetStatus}
              />
            ))}
          </div>
        </div>
      ) : null}

      {ideas.length > 0 ? (
        <div className="mt-4">
          <p className="text-[10px] font-semibold tracking-[0.22em] text-[#a9b0a3] uppercase">
            Post ideas
          </p>
          <div className="mt-2 grid gap-2.5 lg:grid-cols-2">
            {ideas.map((idea) => (
              <SuggestionCard
                key={idea.id}
                suggestion={idea}
                busy={busyIds.has(idea.id)}
                onExpandIdea={onExpandIdea}
                onSetStatus={onSetStatus}
              />
            ))}
          </div>
        </div>
      ) : null}

      {story.suggestions.length === 0 ? (
        <p className="mt-4 text-sm text-[#a9b0a3]">
          No content yet for this story. Use Generate content to write the pack.
        </p>
      ) : null}
    </article>
  );
}

export function AiUpdatesPanel() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  const [runs, setRuns] = useState<ResearchRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [run, setRun] = useState<ResearchRun | null>(null);
  const [loadingRun, setLoadingRun] = useState(false);

  const [startingRun, setStartingRun] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const [contentProgress, setContentProgress] = useState<RepairResult | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reportError = useCallback((cause: unknown) => {
    if (cause instanceof ApiError && cause.status === 401) {
      setAuthState("signed-out");
      setError("Your session has expired. Please sign in again.");
      return;
    }
    setError(cause instanceof Error ? cause.message : "Something went wrong.");
  }, []);

  const loadRuns = useCallback(
    async (quiet = false) => {
      try {
        const result = await requestJson<{ runs: ResearchRun[] }>(
          "/api/phrenos-updates/runs",
        );
        setRuns(result.runs);
        setSelectedRunId((current) => current ?? result.runs[0]?.id ?? null);
      } catch (cause) {
        if (!quiet) reportError(cause);
      }
    },
    [reportError],
  );

  const loadRun = useCallback(
    async (runId: string, quiet = false) => {
      if (!quiet) setLoadingRun(true);
      try {
        const result = await requestJson<{ run: ResearchRun }>(
          `/api/phrenos-updates/runs/${runId}`,
        );
        setRun(result.run);
      } catch (cause) {
        if (!quiet) reportError(cause);
      } finally {
        if (!quiet) setLoadingRun(false);
      }
    },
    [reportError],
  );

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const result = await requestJson<{
          authenticated: boolean;
          configured: boolean;
        }>("/api/phrenos-updates/auth");
        if (cancelled) return;
        if (!result.configured) {
          setAuthState("unconfigured");
        } else {
          setAuthState(result.authenticated ? "signed-in" : "signed-out");
        }
      } catch {
        if (!cancelled) setAuthState("signed-out");
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (authState !== "signed-in") return;

    async function bootstrap() {
      await loadRuns();
    }

    void bootstrap();
  }, [authState, loadRuns]);

  useEffect(() => {
    if (authState !== "signed-in" || !selectedRunId) return;

    async function bootstrap(runId: string) {
      await loadRun(runId);
    }

    void bootstrap(selectedRunId);
  }, [authState, selectedRunId, loadRun]);

  const runActive = run?.status === "pending" || run?.status === "running";

  useEffect(() => {
    const runId = selectedRunId;
    if (!runActive || !runId) return;
    const timer = setInterval(() => {
      void loadRun(runId, true);
      void loadRuns(true);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [runActive, selectedRunId, loadRun, loadRuns]);

  const storiesBySection = useMemo(() => {
    const stories = run?.stories ?? [];
    return SECTION_ORDER.map((section) => ({
      section,
      stories: stories.filter((story) => story.section === section),
    })).filter((group) => group.stories.length > 0);
  }, [run]);

  const draftCounts = useMemo(() => {
    const stories = run?.stories ?? [];
    const withDrafts = stories.filter((story) =>
      story.suggestions.some((item) => item.is_full_draft),
    ).length;
    const approved = stories.reduce(
      (total, story) =>
        total +
        story.suggestions.filter(
          (item) =>
            item.is_full_draft &&
            item.suggestion_type === "blog" &&
            item.status === "approved",
        ).length,
      0,
    );
    return { total: stories.length, withDrafts, approved };
  }, [run]);

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSigningIn(true);
    setError(null);
    try {
      await requestJson("/api/phrenos-updates/auth", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setPassword("");
      setAuthState("signed-in");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not sign you in.",
      );
    } finally {
      setSigningIn(false);
    }
  }

  async function handleSignOut() {
    try {
      await requestJson("/api/phrenos-updates/auth", { method: "DELETE" });
    } catch {
      // Signing out locally is enough if the request fails.
    }
    setAuthState("signed-out");
    setRuns([]);
    setRun(null);
    setSelectedRunId(null);
    setNotice(null);
    setError(null);
  }

  async function handleNewRun() {
    setStartingRun(true);
    setError(null);
    setNotice(null);
    setContentProgress(null);
    try {
      const result = await requestJson<{
        run: { id: string; status: string };
        message?: string;
      }>("/api/phrenos-updates/runs", { method: "POST" });
      setRun(null);
      setSelectedRunId(result.run.id);
      setNotice(result.message ?? "Research started.");
      await loadRuns(true);
    } catch (cause) {
      reportError(cause);
    } finally {
      setStartingRun(false);
    }
  }

  async function handleRerun() {
    if (!selectedRunId) return;
    setRerunning(true);
    setError(null);
    setNotice(null);
    setContentProgress(null);
    try {
      const result = await requestJson<{ message?: string }>(
        `/api/phrenos-updates/runs/${selectedRunId}/rerun`,
        { method: "POST" },
      );
      setNotice(result.message ?? "Re-run started.");
      await loadRun(selectedRunId, true);
    } catch (cause) {
      reportError(cause);
    } finally {
      setRerunning(false);
    }
  }

  async function handleGenerateContent() {
    if (!selectedRunId) return;
    setGenerating(true);
    setError(null);
    setNotice(null);
    setContentProgress(null);
    try {
      for (let pass = 0; pass < MAX_CONTENT_PASSES; pass += 1) {
        const result = await requestJson<RepairResult>(
          `/api/phrenos-updates/runs/${selectedRunId}/repair-drafts`,
          { method: "POST", body: JSON.stringify({ maxStories: 1 }) },
        );
        setContentProgress(result);
        await loadRun(selectedRunId, true);

        if (result.complete) {
          setNotice(
            `Content ready for all ${result.total} stories in this batch.`,
          );
          break;
        }
      }
    } catch (cause) {
      reportError(cause);
    } finally {
      setGenerating(false);
    }
  }

  async function handlePublish() {
    if (!selectedRunId) return;
    setPublishing(true);
    setError(null);
    setNotice(null);
    try {
      const result = await requestJson<PublishResponse>(
        "/api/phrenos-updates/publish",
        { method: "POST", body: JSON.stringify({ runId: selectedRunId }) },
      );
      if (result.published === 0) {
        setNotice(
          "Nothing new to publish. Approve a featured blog draft first.",
        );
      } else {
        setNotice(
          `Published ${result.published} post${result.published === 1 ? "" : "s"} to /ai-updates${
            result.skipped > 0 ? `. Skipped ${result.skipped}.` : "."
          }`,
        );
      }
      await loadRun(selectedRunId, true);
    } catch (cause) {
      reportError(cause);
    } finally {
      setPublishing(false);
    }
  }

  function markBusy(id: string, busy: boolean) {
    setBusyIds((current) => {
      const next = new Set(current);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleExpandIdea(suggestionId: string) {
    markBusy(suggestionId, true);
    setError(null);
    setNotice(null);
    try {
      await requestJson(
        `/api/phrenos-updates/suggestions/${suggestionId}/generate`,
        { method: "POST" },
      );
      setNotice("Featured draft written from that idea.");
      if (selectedRunId) await loadRun(selectedRunId, true);
    } catch (cause) {
      reportError(cause);
    } finally {
      markBusy(suggestionId, false);
    }
  }

  async function handleSetStatus(
    suggestionId: string,
    status: "approved" | "rejected",
  ) {
    markBusy(suggestionId, true);
    setError(null);
    try {
      await requestJson(`/api/phrenos-updates/suggestions/${suggestionId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      if (selectedRunId) await loadRun(selectedRunId, true);
    } catch (cause) {
      reportError(cause);
    } finally {
      markBusy(suggestionId, false);
    }
  }

  if (authState === "loading") {
    return (
      <div className={panelClass}>
        <p className="text-sm text-[#a9b0a3]">Checking your session...</p>
      </div>
    );
  }

  if (authState === "unconfigured") {
    return (
      <div className={panelClass}>
        <h2 className="font-serif text-2xl text-[#f1e8d6]">
          Admin access is not configured
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[#a9b0a3]">
          Set <code className="text-[#e0c078]">PHRENOS_ADMIN_PASSWORD</code> in
          your environment, then reload this page. Add{" "}
          <code className="text-[#e0c078]">PHRENOS_ADMIN_SECRET</code> as well if
          you want session cookies signed with a separate key.
        </p>
      </div>
    );
  }

  if (authState === "signed-out") {
    return (
      <div className={`${panelClass} max-w-md`}>
        <h2 className="font-serif text-2xl text-[#f1e8d6]">Sign in</h2>
        <p className="mt-2 text-sm text-[#a9b0a3]">
          This desk is private. Enter the admin password to continue.
        </p>
        <form onSubmit={handleSignIn} className="mt-5 space-y-3">
          <label className="block space-y-2">
            <span className="text-[11px] font-semibold tracking-[0.18em] text-[#e0c078] uppercase">
              Password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClass}
              required
            />
          </label>
          {error ? (
            <p className="text-sm text-[#e8b4a0]" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            className={primaryButtonClass}
            disabled={signingIn}
          >
            {signingIn ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    );
  }

  const anyBusy = startingRun || rerunning || generating || publishing;

  return (
    <div className="space-y-5">
      <div className={panelClass}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.22em] text-[#a9b0a3] uppercase">
              Weekly batches
            </p>
            <p className="mt-1 text-sm text-[#f1e8d6]">
              {runs.length > 0
                ? `${runs.length} batch${runs.length === 1 ? "" : "es"} on record`
                : "No batches yet"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className={ghostButtonClass}
          >
            Sign out
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={primaryButtonClass}
            onClick={handleNewRun}
            disabled={anyBusy}
          >
            {startingRun ? "Starting..." : "Run new week"}
          </button>
          <button
            type="button"
            className={ghostButtonClass}
            onClick={handleRerun}
            disabled={anyBusy || !selectedRunId}
          >
            {rerunning ? "Re-running..." : "Re-run this week"}
          </button>
          <button
            type="button"
            className={ghostButtonClass}
            onClick={handleGenerateContent}
            disabled={anyBusy || !selectedRunId || runActive}
          >
            {generating ? "Generating..." : "Generate content"}
          </button>
          <button
            type="button"
            className={ghostButtonClass}
            onClick={handlePublish}
            disabled={anyBusy || !selectedRunId}
          >
            {publishing ? "Publishing..." : "Publish approved blogs"}
          </button>
        </div>

        {runs.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {runs.map((item) => {
              const selected = item.id === selectedRunId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === selectedRunId) return;
                    setRun(null);
                    setContentProgress(null);
                    setNotice(null);
                    setError(null);
                    setSelectedRunId(item.id);
                  }}
                  className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                    selected
                      ? "border-[#d4af5a] bg-[#d4af5a]/12"
                      : "border-[#d4af5a]/20 hover:border-[#d4af5a]/50"
                  }`}
                >
                  <span className="block text-xs font-medium text-[#f1e8d6]">
                    {formatWeek(item)}
                  </span>
                  <span className="mt-1 flex items-center gap-2">
                    <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                    <span className="text-[10px] text-[#a9b0a3]">
                      {item.trigger_type}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {error ? (
        <div
          className="rounded-xl border border-[#e8b4a0]/40 bg-[#e8b4a0]/5 px-4 py-3 text-sm text-[#e8b4a0]"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {notice ? (
        <div
          className="rounded-xl border border-[#8fbf9f]/35 bg-[#8fbf9f]/5 px-4 py-3 text-sm text-[#cfe0d1]"
          role="status"
        >
          {notice}
        </div>
      ) : null}

      {runActive ? (
        <ProgressBanner
          label="Research"
          steps={RESEARCH_STEPS}
          intervalMs={RESEARCH_STEP_MS}
          detail="This runs in the background and can take a few minutes. The page refreshes itself."
        />
      ) : null}

      {generating ? (
        <ProgressBanner
          label="Content"
          steps={CONTENT_STEPS}
          intervalMs={CONTENT_STEP_MS}
          cycle
          detail={
            contentProgress
              ? `${contentProgress.repaired} of ${contentProgress.total} stories ready${
                  contentProgress.processingStoryTitle
                    ? `. Now on "${contentProgress.processingStoryTitle}"`
                    : ""
                }${contentProgress.remaining > 0 ? `. ${contentProgress.remaining} to go.` : "."}`
              : "Keep this tab open while the batch is written."
          }
        />
      ) : null}

      {!generating && contentProgress ? (
        <div className="rounded-xl border border-[#d4af5a]/25 bg-[#0a100c]/70 px-4 py-3 text-sm text-[#c9c6ba]">
          Content pass finished: {contentProgress.repaired} of{" "}
          {contentProgress.total} stories have a full pack
          {contentProgress.remaining > 0
            ? `, ${contentProgress.remaining} still to write.`
            : "."}
        </div>
      ) : null}

      {run ? (
        <div className={panelClass}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Badge tone={statusTone(run.status)}>{run.status}</Badge>
            <span className="text-sm text-[#f1e8d6]">{formatWeek(run)}</span>
            <span className="text-xs text-[#a9b0a3]">
              Started {formatDateTime(run.started_at)}
            </span>
            {run.completed_at ? (
              <span className="text-xs text-[#a9b0a3]">
                Finished {formatDateTime(run.completed_at)}
              </span>
            ) : null}
            {run.retry_count > 0 ? (
              <span className="text-xs text-[#a9b0a3]">
                Retries {run.retry_count}
              </span>
            ) : null}
          </div>

          {draftCounts.total > 0 ? (
            <p className="mt-3 text-xs text-[#a9b0a3]">
              {draftCounts.withDrafts} of {draftCounts.total} stories have
              featured drafts. {draftCounts.approved} blog draft
              {draftCounts.approved === 1 ? "" : "s"} approved and ready to
              publish.
            </p>
          ) : null}

          {run.error_message ? (
            <p className="mt-3 rounded-lg border border-[#e8b4a0]/35 bg-[#e8b4a0]/5 px-3 py-2 text-xs text-[#e8b4a0]">
              {run.error_message}
            </p>
          ) : null}
        </div>
      ) : null}

      {loadingRun && !run ? (
        <div className={panelClass}>
          <p className="text-sm text-[#a9b0a3]">Loading this batch...</p>
        </div>
      ) : null}

      {run && storiesBySection.length === 0 && !runActive ? (
        <div className={panelClass}>
          <p className="text-sm text-[#a9b0a3]">
            No stories saved for this batch yet. Run a new week, or re-run this
            one.
          </p>
        </div>
      ) : null}

      {storiesBySection.map((group) => (
        <section key={group.section} className="space-y-3">
          <h2 className="font-serif text-2xl text-[#f1e8d6]">
            {SECTION_LABELS[group.section]}
          </h2>
          <div className="space-y-3">
            {group.stories.map((story, index) => (
              <StoryCard
                key={story.id}
                story={story}
                index={index}
                busyIds={busyIds}
                onExpandIdea={handleExpandIdea}
                onSetStatus={handleSetStatus}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
