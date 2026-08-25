"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatSourcePublishedDate } from "@/lib/phrenos-updates/source-dates";
import {
  hasFeaturedBlogDraft,
  isWeekHeroStory,
  WEEK_HERO_TAG,
} from "@/lib/phrenos-updates/week-hero-shared";
import {
  SECTION_LABELS,
  type ContentSuggestion,
  type ResearchRun,
  type ResearchSection,
  type ResearchSource,
  type ResearchStory,
  type SuggestionStatus,
} from "@/lib/phrenos-updates/types";

type WeeklyBriefSummary = {
  id: string;
  title: string;
  lookback_start: string | null;
  lookback_end: string | null;
  status: "received" | "verified" | "needs_review" | "rejected";
  verification_notes: string;
  ideas: { suggestion_type: string; title: string }[];
  source_urls: string[];
  created_at: string;
};

type AuthState = "loading" | "unconfigured" | "signed-out" | "signed-in";

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
const fieldClass =
  "w-full rounded-xl border border-[#d4af5a]/55 bg-[#0a100c]/70 px-4 py-2.5 text-sm text-[#f1e8d6] outline-none transition-colors placeholder:text-[#a9b0a3]/60 focus:border-[#e0c078]";
const labelClass =
  "block text-[10px] font-semibold tracking-[0.18em] text-[#a9b0a3] uppercase";

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

function slugifyFilename(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "phrenos-content"
  );
}

function formatSuggestionPlainText(suggestion: ContentSuggestion): string {
  const kind = suggestion.suggestion_type === "blog" ? "Blog" : "LinkedIn";
  const tier = suggestion.is_full_draft ? "Featured draft" : "Idea";
  const body = suggestion.is_full_draft
    ? htmlToText(suggestion.body_html)
    : htmlToText(suggestion.body_html || suggestion.hook || "");

  return [
    `${kind} · ${tier}`,
    suggestion.title,
    "",
    suggestion.hook ? `Hook: ${suggestion.hook}` : null,
    suggestion.hook ? "" : null,
    body,
    suggestion.cta ? "" : null,
    suggestion.cta ? `CTA: ${suggestion.cta}` : null,
    suggestion.hashtags ? `Hashtags: ${suggestion.hashtags}` : null,
    suggestion.image_ideas ? `Image ideas: ${suggestion.image_ideas}` : null,
  ]
    .filter((line) => line != null)
    .join("\n")
    .trim();
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}

function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
  onPublish,
  onSave,
}: {
  suggestion: ContentSuggestion;
  busy: boolean;
  onExpandIdea: (id: string) => void;
  onSetStatus: (id: string, status: "approved" | "rejected") => void;
  onPublish: (id: string) => void;
  onSave: (
    id: string,
    fields: {
      title: string;
      hook: string;
      body_html: string;
      cta: string;
      hashtags: string;
      image_ideas: string;
    },
  ) => Promise<void>;
}) {
  const [showBody, setShowBody] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [title, setTitle] = useState(suggestion.title);
  const [hook, setHook] = useState(suggestion.hook);
  const [bodyHtml, setBodyHtml] = useState(suggestion.body_html);
  const [cta, setCta] = useState(suggestion.cta);
  const [hashtags, setHashtags] = useState(suggestion.hashtags);
  const [imageIdeas, setImageIdeas] = useState(suggestion.image_ideas);

  useEffect(() => {
    if (editing) return;
    setTitle(suggestion.title);
    setHook(suggestion.hook);
    setBodyHtml(suggestion.body_html);
    setCta(suggestion.cta);
    setHashtags(suggestion.hashtags);
    setImageIdeas(suggestion.image_ideas);
  }, [suggestion, editing]);

  const isIdea = !suggestion.is_full_draft;
  const canPublish =
    !isIdea &&
    suggestion.suggestion_type === "blog" &&
    (suggestion.status === "approved" || suggestion.status === "published");

  async function handleCopy() {
    const ok = await copyTextToClipboard(formatSuggestionPlainText(suggestion));
    setCopyState(ok ? "copied" : "failed");
    window.setTimeout(() => setCopyState("idle"), 1600);
  }

  function handleDownload() {
    const kind = suggestion.suggestion_type === "blog" ? "blog" : "linkedin";
    const tier = suggestion.is_full_draft ? "draft" : "idea";
    downloadTextFile(
      `${slugifyFilename(suggestion.title || kind)}-${kind}-${tier}.txt`,
      formatSuggestionPlainText(suggestion),
    );
  }

  function startEditing() {
    setTitle(suggestion.title);
    setHook(suggestion.hook);
    setBodyHtml(suggestion.body_html);
    setCta(suggestion.cta);
    setHashtags(suggestion.hashtags);
    setImageIdeas(suggestion.image_ideas);
    setEditing(true);
    if (!isIdea) setShowBody(true);
  }

  function cancelEditing() {
    setEditing(false);
    setTitle(suggestion.title);
    setHook(suggestion.hook);
    setBodyHtml(suggestion.body_html);
    setCta(suggestion.cta);
    setHashtags(suggestion.hashtags);
    setImageIdeas(suggestion.image_ideas);
  }

  async function saveEditing() {
    setSaving(true);
    try {
      await onSave(suggestion.id, {
        title,
        hook,
        body_html: bodyHtml,
        cta,
        hashtags,
        image_ideas: imageIdeas,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

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

      {editing ? (
        <div className="mt-3 space-y-3">
          <label className="block space-y-1.5">
            <span className={labelClass}>Title</span>
            <input
              className={fieldClass}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>Hook</span>
            <textarea
              className={`${fieldClass} min-h-[4.5rem] resize-y`}
              value={hook}
              onChange={(event) => setHook(event.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>
              {isIdea ? "Idea notes" : "Body (HTML)"}
            </span>
            <textarea
              className={`${fieldClass} min-h-[10rem] resize-y font-mono text-[12px] leading-relaxed`}
              value={bodyHtml}
              onChange={(event) => setBodyHtml(event.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>
              Call to action (primary line, then supporting copy)
            </span>
            <textarea
              className={`${fieldClass} min-h-[5.5rem] resize-y`}
              value={cta}
              onChange={(event) => setCta(event.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>Hashtags</span>
            <input
              className={fieldClass}
              value={hashtags}
              onChange={(event) => setHashtags(event.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>Image concept (for LinkedIn / social)</span>
            <textarea
              className={`${fieldClass} min-h-[4rem] resize-y`}
              value={imageIdeas}
              onChange={(event) => setImageIdeas(event.target.value)}
            />
          </label>
        </div>
      ) : (
        <>
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
            <p className="mt-3 whitespace-pre-wrap text-[11px] leading-relaxed text-[#a9b0a3]">
              <span className="tracking-[0.16em] uppercase">Call to action</span>
              {"\n"}
              {suggestion.cta}
            </p>
          ) : null}
        </>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {editing ? (
          <>
            <button
              type="button"
              className={microButtonClass}
              disabled={busy || saving}
              onClick={() => void saveEditing()}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              className={microButtonClass}
              disabled={saving}
              onClick={cancelEditing}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            className={microButtonClass}
            disabled={busy}
            onClick={startEditing}
          >
            Edit
          </button>
        )}
        <button type="button" className={microButtonClass} onClick={handleCopy}>
          {copyState === "copied"
            ? "Copied"
            : copyState === "failed"
              ? "Copy failed"
              : "Copy"}
        </button>
        <button
          type="button"
          className={microButtonClass}
          onClick={handleDownload}
        >
          Download
        </button>
        {isIdea ? (
          <button
            type="button"
            className={microButtonClass}
            disabled={busy || editing}
            onClick={() => onExpandIdea(suggestion.id)}
          >
            {busy ? "Expanding..." : "Expand into featured post"}
          </button>
        ) : (
          <>
            {!editing ? (
              <button
                type="button"
                className={microButtonClass}
                onClick={() => setShowBody((current) => !current)}
              >
                {showBody ? "Hide draft" : "Read draft"}
              </button>
            ) : null}
            <button
              type="button"
              className={microButtonClass}
              disabled={busy || editing || suggestion.status === "published"}
              onClick={() => onSetStatus(suggestion.id, "approved")}
            >
              Approve
            </button>
            <button
              type="button"
              className={microButtonClass}
              disabled={busy || editing || suggestion.status === "published"}
              onClick={() => onSetStatus(suggestion.id, "rejected")}
            >
              Reject
            </button>
            {canPublish ? (
              <button
                type="button"
                className={microButtonClass}
                disabled={busy || editing}
                onClick={() => onPublish(suggestion.id)}
              >
                {busy
                  ? "Publishing..."
                  : suggestion.status === "published"
                    ? "Refresh on site"
                    : "Publish to site"}
              </button>
            ) : null}
            {suggestion.status === "published" ? (
              <span className="self-center text-[11px] text-[#8fbf9f]">
                Marked live
                {editing ? " · edits sync when you refresh on site" : ""}
              </span>
            ) : null}
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
  runActive,
  onGenerate,
  onExpandIdea,
  onSetStatus,
  onPublish,
  onSaveSuggestion,
  onSaveStory,
}: {
  story: ResearchStory;
  index: number;
  busyIds: Set<string>;
  runActive: boolean;
  onGenerate: (storyId: string, mode?: "full" | "hero-blog") => void;
  onExpandIdea: (id: string) => void;
  onSetStatus: (id: string, status: "approved" | "rejected") => void;
  onPublish: (id: string) => void;
  onSaveSuggestion: (
    id: string,
    fields: {
      title: string;
      hook: string;
      body_html: string;
      cta: string;
      hashtags: string;
      image_ideas: string;
    },
  ) => Promise<void>;
  onSaveStory: (
    id: string,
    fields: { title: string; summary_html: string },
  ) => Promise<void>;
}) {
  const [showSources, setShowSources] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(story.title);
  const [summaryText, setSummaryText] = useState(
    summaryBullets(story.summary_html).map((bullet) => `- ${bullet}`).join("\n"),
  );

  useEffect(() => {
    if (editing) return;
    setTitle(story.title);
    setSummaryText(
      summaryBullets(story.summary_html).map((bullet) => `- ${bullet}`).join("\n"),
    );
  }, [story, editing]);

  const bullets = summaryBullets(story.summary_html);
  const ideas = story.suggestions.filter((item) => !item.is_full_draft);
  const drafts = story.suggestions.filter((item) => item.is_full_draft);
  const hasContent = story.suggestions.length > 0;
  const generating = busyIds.has(story.id);
  const isHero = isWeekHeroStory(story);
  const displayTags = (story.topic_tags ?? []).filter((tag) => tag !== WEEK_HERO_TAG);
  const retryHeroBlog = isHero && !hasFeaturedBlogDraft(story);
  const generateLabel = generating
    ? "Generating..."
    : hasContent
      ? "Regenerate content"
      : retryHeroBlog
        ? "Generate full pack"
        : "Generate content";

  function startEditing() {
    setTitle(story.title);
    setSummaryText(
      summaryBullets(story.summary_html).map((bullet) => `- ${bullet}`).join("\n"),
    );
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setTitle(story.title);
    setSummaryText(
      summaryBullets(story.summary_html).map((bullet) => `- ${bullet}`).join("\n"),
    );
  }

  async function saveEditing() {
    setSaving(true);
    try {
      await onSaveStory(story.id, {
        title,
        summary_html: summaryText,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <article
      className={`rounded-2xl border bg-[#101c14]/60 p-4 sm:p-5 ${
        isHero
          ? "border-[#d4af5a]/55 shadow-[0_0_0_1px_rgba(212,175,90,0.12)]"
          : "border-[#d4af5a]/20"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {isHero ? (
          <Badge tone="border-[#d4af5a] bg-[#d4af5a]/15 text-[#e0c078]">
            This week&apos;s feature
          </Badge>
        ) : null}
        <span className="text-[10px] font-semibold tracking-[0.22em] text-[#d4af5a] uppercase">
          {SECTION_LABELS[story.section] ?? story.section}
        </span>
        <span className="text-[11px] text-[#a9b0a3]">Story {index + 1}</span>
        {displayTags.map((tag) => (
          <Badge key={tag} tone="border-[#a9b0a3]/30 text-[#a9b0a3]">
            {tag}
          </Badge>
        ))}
      </div>

      {editing ? (
        <div className="mt-3 space-y-3">
          <label className="block space-y-1.5">
            <span className={labelClass}>Story title</span>
            <input
              className={fieldClass}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>Summary (one bullet per line)</span>
            <textarea
              className={`${fieldClass} min-h-[8rem] resize-y`}
              value={summaryText}
              onChange={(event) => setSummaryText(event.target.value)}
            />
          </label>
        </div>
      ) : (
        <>
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
        </>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#d4af5a]/15 pt-3">
        {editing ? (
          <>
            <button
              type="button"
              className={primaryButtonClass}
              disabled={saving || generating || runActive}
              onClick={() => void saveEditing()}
            >
              {saving ? "Saving..." : "Save story"}
            </button>
            <button
              type="button"
              className={ghostButtonClass}
              disabled={saving}
              onClick={cancelEditing}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={ghostButtonClass}
              disabled={generating || runActive}
              onClick={startEditing}
            >
              Edit story
            </button>
            <button
              type="button"
              className={hasContent ? ghostButtonClass : primaryButtonClass}
              disabled={generating || runActive}
              onClick={() => onGenerate(story.id, "full")}
            >
              {generateLabel}
            </button>
          </>
        )}
        <button
          type="button"
          className="text-[11px] font-semibold tracking-[0.16em] text-[#e0c078] uppercase"
          onClick={() => setShowSources((current) => !current)}
        >
          {showSources ? "Hide" : "Show"} sources ({story.sources.length})
        </button>
      </div>

      {showSources ? (
        <ul className="mt-3 space-y-2">
          {story.sources.map((source) => (
            <SourceRow key={source.id} source={source} />
          ))}
        </ul>
      ) : null}

      {generating ? (
        <div className="mt-4">
          <ProgressBanner
            label="Content"
            steps={CONTENT_STEPS}
            intervalMs={CONTENT_STEP_MS}
            cycle
            detail={`Writing the pack for "${story.title}". Keep this tab open.`}
          />
        </div>
      ) : null}

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
                onPublish={onPublish}
                onSave={onSaveSuggestion}
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
                onPublish={onPublish}
                onSave={onSaveSuggestion}
              />
            ))}
          </div>
        </div>
      ) : null}

      {!hasContent && !generating ? (
        <p className="mt-4 text-sm text-[#a9b0a3]">
          {isHero
            ? "This week's feature is selected. Generate the full pack for blog and LinkedIn drafts, or wait for the automatic pass after research."
            : "No content yet for this story. Generate content when you are ready."}
        </p>
      ) : null}
    </article>
  );
}

function DeskBriefsPanel({
  briefs,
  busy,
  onRefresh,
  onVerify,
}: {
  briefs: WeeklyBriefSummary[];
  busy: boolean;
  onRefresh: () => void;
  onVerify: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className={panelClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.22em] text-[#a9b0a3] uppercase">
            Desk briefs
          </p>
          <p className="mt-1 text-sm text-[#f1e8d6]">
            Generated automatically with each research run
          </p>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-[#a9b0a3]">
            No paste needed. Running a new week drafts desk angles first, then
            research uses them automatically.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={microButtonClass}
            disabled={busy}
            onClick={onRefresh}
          >
            Refresh
          </button>
          <button
            type="button"
            className={microButtonClass}
            onClick={() => setOpen((current) => !current)}
          >
            {open ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {open ? (
        <div className="mt-5 space-y-2.5">
          {briefs.length === 0 ? (
            <p className="text-sm text-[#a9b0a3]">
              No desk briefs yet. Run a new week and one will appear here
              automatically.
            </p>
          ) : (
            briefs.map((brief) => (
              <div
                key={brief.id}
                className="rounded-xl border border-[#d4af5a]/20 bg-[#0a100c]/55 px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    tone={
                      brief.status === "verified"
                        ? statusTone("completed")
                        : brief.status === "needs_review"
                          ? statusTone("failed")
                          : statusTone("running")
                    }
                  >
                    {brief.status.replace(/_/g, " ")}
                  </Badge>
                  <span className="text-[11px] text-[#a9b0a3]">
                    {brief.lookback_start && brief.lookback_end
                      ? `${brief.lookback_start} → ${brief.lookback_end}`
                      : formatDateTime(brief.created_at)}
                  </span>
                  <span className="text-[11px] text-[#a9b0a3]">
                    {brief.ideas.length} angle
                    {brief.ideas.length === 1 ? "" : "s"} ·{" "}
                    {brief.source_urls.length} source
                    {brief.source_urls.length === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-[#f1e8d6]">
                  {brief.title}
                </p>
                {brief.verification_notes ? (
                  <p className="mt-1 text-xs leading-relaxed text-[#a9b0a3]">
                    {brief.verification_notes}
                  </p>
                ) : null}
                {brief.ideas.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs text-[#c9c6ba]">
                    {brief.ideas.slice(0, 4).map((idea) => (
                      <li key={`${brief.id}-${idea.title}`}>
                        <span className="text-[#d4af5a]">
                          {idea.suggestion_type === "blog" ? "Blog" : "LinkedIn"}
                        </span>{" "}
                        {idea.title}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {brief.status !== "verified" ? (
                  <button
                    type="button"
                    className={`${microButtonClass} mt-3`}
                    disabled={busy}
                    onClick={() => onVerify(brief.id)}
                  >
                    Verify brief
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
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
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [briefs, setBriefs] = useState<WeeklyBriefSummary[]>([]);

  const reportError = useCallback((cause: unknown) => {
    if (cause instanceof ApiError && cause.status === 401) {
      setAuthState("signed-out");
      setError("Your session has expired. Please sign in again.");
      return;
    }
    setError(cause instanceof Error ? cause.message : "Something went wrong.");
  }, []);

  const loadBriefs = useCallback(
    async (quiet = false) => {
      try {
        const result = await requestJson<{ briefs: WeeklyBriefSummary[] }>(
          "/api/phrenos-updates/briefs",
        );
        setBriefs(result.briefs);
      } catch (cause) {
        if (!quiet) reportError(cause);
      }
    },
    [reportError],
  );

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
        if (
          result.run.status === "completed" ||
          result.run.status === "failed"
        ) {
          setNotice((current) => {
            if (!current) return current;
            if (
              current.includes("Research started") ||
              current.includes("Re-run started") ||
              current.includes("refreshes while the batch")
            ) {
              return result.run.status === "completed"
                ? "Research complete. Selecting this week's strongest story and drafting blog + LinkedIn."
                : null;
            }
            return current;
          });
        }
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
      await Promise.all([loadRuns(), loadBriefs(true)]);
    }

    void bootstrap();
  }, [authState, loadRuns, loadBriefs]);

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

  const heroStory = useMemo(() => {
    return (run?.stories ?? []).find((story) => isWeekHeroStory(story)) ?? null;
  }, [run]);

  const heroDraftPending = Boolean(
    run &&
      !runActive &&
      run.status === "completed" &&
      heroStory &&
      !hasFeaturedBlogDraft(heroStory),
  );

  const heroCompletedRecently = Boolean(
    run?.completed_at &&
      Date.now() - new Date(run.completed_at).getTime() < 12 * 60 * 1000,
  );

  const heroWriting = heroDraftPending && heroCompletedRecently;

  useEffect(() => {
    const runId = selectedRunId;
    if (!heroWriting || !runId) return;
    const timer = setInterval(() => {
      void loadRun(runId, true);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [heroWriting, selectedRunId, loadRun]);

  useEffect(() => {
    if (!run || runActive) return;
    if (heroStory && hasFeaturedBlogDraft(heroStory)) {
      setNotice((current) => {
        if (
          !current ||
          current.includes("Selecting this week's") ||
          current.includes("drafting its featured") ||
          current.includes("Writing this week's featured")
        ) {
          return `Featured blog and LinkedIn ready for "${heroStory.title}". Approve the blog when you want it live.`;
        }
        return current;
      });
      return;
    }
    if (heroWriting) {
      setNotice(
        "Writing this week's featured blog and LinkedIn. This page refreshes while it drafts.",
      );
    } else if (heroDraftPending) {
      setNotice(
        `Featured drafts did not finish for "${heroStory?.title ?? "this week's story"}". Use Generate full pack on that card.`,
      );
    }
  }, [run, runActive, heroStory, heroWriting, heroDraftPending]);

  const storiesBySection = useMemo(() => {
    const stories = (run?.stories ?? []).filter((story) => !isWeekHeroStory(story));
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

  async function handleVerifyBrief(briefId: string) {
    markBusy(briefId, true);
    setError(null);
    setNotice(null);
    try {
      await requestJson(`/api/phrenos-updates/briefs/${briefId}/verify`, {
        method: "POST",
      });
      setNotice("Desk brief verified.");
      await loadBriefs(true);
    } catch (cause) {
      reportError(cause);
    } finally {
      markBusy(briefId, false);
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

  async function handleDraftWeekHero() {
    if (!selectedRunId) return;
    markBusy(`week-hero:${selectedRunId}`, true);
    setError(null);
    setNotice(
      "Selecting this week's strongest story and drafting blog + LinkedIn...",
    );
    try {
      const result = await requestJson<{ title: string | null }>(
        `/api/phrenos-updates/runs/${selectedRunId}/week-hero`,
        { method: "POST" },
      );
      setNotice(
        result.title
          ? `Featured blog and LinkedIn ready for "${result.title}". Approve the blog when you want it live.`
          : "Featured drafts are ready.",
      );
      await loadRun(selectedRunId, true);
    } catch (cause) {
      reportError(cause);
    } finally {
      markBusy(`week-hero:${selectedRunId}`, false);
    }
  }

  async function handleGenerateStory(
    storyId: string,
    mode: "full" | "hero-blog" = "full",
  ) {
    markBusy(storyId, true);
    setError(null);
    setNotice(null);
    try {
      const result = await requestJson<{ title: string; suggestionCount: number }>(
        `/api/phrenos-updates/stories/${storyId}/generate`,
        {
          method: "POST",
          body: JSON.stringify({ mode }),
        },
      );
      setNotice(
        mode === "hero-blog"
          ? `Featured blog and LinkedIn ready for "${result.title}".`
          : `Content ready for "${result.title}" (${result.suggestionCount} drafts and ideas).`,
      );
      if (selectedRunId) await loadRun(selectedRunId, true);
    } catch (cause) {
      reportError(cause);
    } finally {
      markBusy(storyId, false);
    }
  }

  async function handlePublishSuggestion(suggestionId: string) {
    markBusy(suggestionId, true);
    setError(null);
    setNotice(null);
    try {
      const result = await requestJson<PublishResponse>(
        `/api/phrenos-updates/suggestions/${suggestionId}/publish`,
        { method: "POST" },
      );
      if (result.published === 0 && result.posts[0]) {
        setNotice(
          `Live post refreshed at /ai-updates/${result.posts[0].slug}. Open that page (hard refresh if needed).`,
        );
      } else if (result.posts[0]) {
        setNotice(`Published to /ai-updates/${result.posts[0].slug}.`);
      } else {
        setNotice("Published to /ai-updates.");
      }
      if (selectedRunId) await loadRun(selectedRunId, true);
    } catch (cause) {
      reportError(cause);
    } finally {
      markBusy(suggestionId, false);
    }
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

  async function handleSaveSuggestion(
    suggestionId: string,
    fields: {
      title: string;
      hook: string;
      body_html: string;
      cta: string;
      hashtags: string;
      image_ideas: string;
    },
  ) {
    markBusy(suggestionId, true);
    setError(null);
    setNotice(null);
    try {
      await requestJson(`/api/phrenos-updates/suggestions/${suggestionId}`, {
        method: "PATCH",
        body: JSON.stringify(fields),
      });
      setNotice("Content saved.");
      if (selectedRunId) await loadRun(selectedRunId, true);
    } catch (cause) {
      reportError(cause);
      throw cause;
    } finally {
      markBusy(suggestionId, false);
    }
  }

  async function handleSaveStory(
    storyId: string,
    fields: { title: string; summary_html: string },
  ) {
    markBusy(storyId, true);
    setError(null);
    setNotice(null);
    try {
      await requestJson(`/api/phrenos-updates/stories/${storyId}`, {
        method: "PATCH",
        body: JSON.stringify(fields),
      });
      setNotice("Story saved.");
      if (selectedRunId) await loadRun(selectedRunId, true);
    } catch (cause) {
      reportError(cause);
      throw cause;
    } finally {
      markBusy(storyId, false);
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
          Enter the admin password to continue.
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

  const anyBusy = startingRun || rerunning || busyIds.size > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[#a9b0a3]">Signed in to the portal</p>
        <button
          type="button"
          onClick={handleSignOut}
          className={ghostButtonClass}
        >
          Log out
        </button>
      </div>

      <DeskBriefsPanel
        briefs={briefs}
        busy={anyBusy}
        onRefresh={() => void loadBriefs()}
        onVerify={(id) => void handleVerifyBrief(id)}
      />

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
          detail="This runs in the background and can take a few minutes. The page refreshes itself. Afterwards the strongest story gets an automatic featured blog and LinkedIn pack."
        />
      ) : null}

      {heroWriting ? (
        <ProgressBanner
          label="Featured drafts"
          steps={CONTENT_STEPS}
          intervalMs={CONTENT_STEP_MS}
          cycle
          detail={
            heroStory
              ? `Drafting blog and LinkedIn for "${heroStory.title}".`
              : "Choosing this week's strongest story and drafting blog + LinkedIn."
          }
        />
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
              publish individually.
            </p>
          ) : null}

          {!runActive &&
          run.status === "completed" &&
          (run.stories?.length ?? 0) > 0 &&
          !heroStory ? (
            <div className="mt-4">
              <button
                type="button"
                className={primaryButtonClass}
                disabled={anyBusy}
                onClick={handleDraftWeekHero}
              >
                {busyIds.has(`week-hero:${run.id}`)
                  ? "Drafting feature..."
                  : "Draft this week's feature"}
              </button>
              <p className="mt-2 text-xs text-[#a9b0a3]">
                Picks the most converting story and writes its featured blog and
                LinkedIn pack automatically.
              </p>
            </div>
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

      {run && storiesBySection.length === 0 && !heroStory && !runActive ? (
        <div className={panelClass}>
          <p className="text-sm text-[#a9b0a3]">
            No stories saved for this batch yet. Run a new week, or re-run this
            one.
          </p>
        </div>
      ) : null}

      {heroStory ? (
        <section className="space-y-3">
          <h2 className="font-serif text-2xl text-[#f1e8d6]">
            This week&apos;s feature
          </h2>
          <p className="text-sm text-[#a9b0a3]">
            Auto-selected as the most converting story. Featured blog and
            LinkedIn drafts after research; approve and publish the blog when
            ready. Copy LinkedIn from the same card.
          </p>
          <StoryCard
            story={heroStory}
            index={0}
            busyIds={busyIds}
            runActive={runActive}
            onGenerate={handleGenerateStory}
            onExpandIdea={handleExpandIdea}
            onSetStatus={handleSetStatus}
            onPublish={handlePublishSuggestion}
            onSaveSuggestion={handleSaveSuggestion}
            onSaveStory={handleSaveStory}
          />
        </section>
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
                runActive={runActive}
                onGenerate={handleGenerateStory}
                onExpandIdea={handleExpandIdea}
                onSetStatus={handleSetStatus}
                onPublish={handlePublishSuggestion}
                onSaveSuggestion={handleSaveSuggestion}
                onSaveStory={handleSaveStory}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
