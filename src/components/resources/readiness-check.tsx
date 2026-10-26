"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { bookCallHref, bookCallIsExternal } from "@/data/site-content";
import {
  readinessAreas,
  readinessQuestions,
  scoreReadiness,
} from "@/data/readiness-check";
import { trackEvent } from "@/lib/site/analytics";
import { isEmail, joinBriefing, submitLead } from "@/lib/site/lead";

const fieldClass =
  "min-w-0 flex-1 rounded-full border border-[#d4af5a]/55 bg-[#101c14]/55 px-5 py-3 text-sm text-ivory outline-none transition-colors placeholder:text-sage/55 focus:border-[#e0c078] focus:bg-[#101c14]/75";

export function ReadinessCheck() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [email, setEmail] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [sending, setSending] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = readinessQuestions.length;
  const finished = step >= total;
  const result = finished ? scoreReadiness(answers) : null;

  function choose(questionId: string, value: number) {
    if (step === 0 && Object.keys(answers).length === 0) trackEvent("readiness_start");
    const next = { ...answers, [questionId]: value };
    setAnswers(next);
    if (step + 1 >= total) {
      const scored = scoreReadiness(next);
      trackEvent("readiness_complete", { tier: scored.tier.key, percent: scored.percent });
    }
    setStep(step + 1);
  }

  async function handleUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    if (String(data.get("website") || "")) return;
    if (!result) return;
    if (!isEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setSending(true);
    const details: Record<string, string | number> = {
      overall_score_percent: result.percent,
      tier: result.tier.label,
      newsletter_opt_in: optIn ? "yes" : "no",
    };
    for (const area of result.areas) details[`score_${area.area}_percent`] = area.percent;
    for (const question of readinessQuestions) {
      const chosen = answers[question.id];
      details[question.id] = `${question.question} => ${question.options[chosen] ?? "no answer"}`;
    }
    await submitLead({ source: "AI readiness check", email, details });
    if (optIn) await joinBriefing(email, "readiness-check");
    setSending(false);
    setUnlocked(true);
  }

  if (!finished) {
    const question = readinessQuestions[step];
    const percent = Math.round((step / total) * 100);
    return (
      <div className="rounded-2xl border border-[#d4af5a]/30 bg-[#0b140e]/70 p-6 sm:p-10">
        <div className="flex items-center justify-between text-xs font-semibold tracking-[0.22em] text-sage uppercase">
          <span>
            Question {step + 1} of {total}
          </span>
          <span>{readinessAreas[question.area].label}</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ivory/10" aria-hidden>
          <div className="h-full rounded-full bg-[#d4af5a] transition-all" style={{ width: `${percent}%` }} />
        </div>

        <h2 className="mt-8 font-serif text-2xl leading-snug text-ivory sm:text-3xl">{question.question}</h2>

        <p className="mt-3 text-sm text-sage">Choose the closest fit. You can go back and change an answer.</p>

        <div className="mt-6 grid gap-3" role="radiogroup" aria-label={question.question}>
          {question.options.map((option, index) => {
            const selected = answers[question.id] === index;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => choose(question.id, index)}
                className={`rounded-xl border px-5 py-4 text-left text-sm leading-snug transition-colors sm:text-base ${
                  selected
                    ? "border-[#d4af5a] bg-[#d4af5a]/15 text-[#f1e8d6]"
                    : "border-[#d4af5a]/30 text-ivory/90 hover:border-[#d4af5a]/70 hover:bg-[#d4af5a]/[0.07]"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>

        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="mt-6 text-xs font-semibold tracking-[0.18em] text-sage uppercase transition-colors hover:text-[#e0c078]"
          >
            ← Back
          </button>
        ) : null}
      </div>
    );
  }

  const weakest = result!.weakest;
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#d4af5a]/40 bg-[linear-gradient(135deg,rgba(212,175,90,0.2),rgba(11,20,14,0.9)_60%)] p-6 sm:p-10">
        <p className="text-xs font-semibold tracking-[0.28em] text-[#e0c078] uppercase">Your result</p>
        <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-2">
          <p className="lining font-serif text-6xl leading-none text-[#e0c078] sm:text-7xl">{result!.percent}%</p>
          <div className="pb-1">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-sage uppercase">AI readiness</p>
            <p className="font-serif text-2xl text-ivory sm:text-3xl">{result!.tier.label}</p>
          </div>
        </div>
        <p className="mt-6 font-serif text-2xl leading-snug text-balance text-ivory sm:text-[1.7rem]">{result!.tier.headline}</p>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-ivory/85">{result!.tier.summary}</p>

        <p className="mt-8 text-xs font-semibold tracking-[0.22em] text-[#e0c078] uppercase">Your next three moves</p>
        <ol className="mt-4 space-y-3">
          {result!.tier.nextSteps.map((item, index) => (
            <li key={item} className="flex gap-3 text-sm leading-relaxed text-ivory/90 sm:text-base">
              <span className="lining w-5 shrink-0 font-serif text-2xl leading-none font-semibold text-[#d4af5a]">{index + 1}</span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      </div>

      {unlocked ? (
        <div className="rounded-2xl border border-[#d4af5a]/30 bg-[#0b140e]/70 p-6 sm:p-10" role="status">
          <p className="text-xs font-semibold tracking-[0.28em] text-[#e0c078] uppercase">Your full breakdown</p>
          <ul className="mt-6 space-y-5">
            {result!.areas.map((area) => (
              <li key={area.area}>
                <div className="flex items-baseline justify-between gap-4 text-sm text-ivory">
                  <span>{area.label}</span>
                  <span className="lining font-semibold text-[#e0c078]">{area.percent}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-ivory/10" aria-hidden>
                  <div className="h-full rounded-full bg-[#d4af5a]" style={{ width: `${area.percent}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-8 rounded-xl border border-[#d4af5a]/35 bg-[#d4af5a]/[0.08] p-5">
            <p className="text-xs font-semibold tracking-[0.22em] text-[#e0c078] uppercase">
              Start here: {readinessAreas[weakest].label}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ivory/90 sm:text-base">
              {readinessAreas[weakest].firstStep}
            </p>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(event) => void handleUnlock(event)}
          className="rounded-2xl border border-[#d4af5a]/30 bg-[#0b140e]/70 p-6 sm:p-10"
        >
          <p className="font-serif text-2xl text-[#e0c078]">Unlock your full breakdown</p>
          <p className="mt-2 text-sm leading-relaxed text-ivory/85 sm:text-base">
            See your score in each of the five areas, and the one place to start. Enter your email to
            unlock it.
          </p>
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            className="absolute -left-[9999px] h-0 w-0 opacity-0"
          />
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="sr-only" htmlFor="readiness-email">
              Email
            </label>
            <input
              id="readiness-email"
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
              {sending ? "One moment..." : "Unlock it"}
            </button>
          </div>
          <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm leading-snug text-sage">
            <input
              type="checkbox"
              checked={optIn}
              onChange={(event) => setOptIn(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#d4af5a]"
            />
            <span>Also send me the Phrenos.ai AI briefing for business leaders.</span>
          </label>
          {error ? (
            <p className="mt-3 text-sm text-[#e8b4a0]" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      )}

      <div className="rounded-2xl border border-[#d4af5a]/40 bg-[linear-gradient(135deg,rgba(212,175,90,0.22),rgba(11,20,14,0.9))] p-6 text-center sm:p-10">
        <p className="font-serif text-2xl text-[#e0c078] sm:text-3xl">Want to talk it through?</p>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-ivory/85 sm:text-base">
          A free 15-minute intro call is a good place to turn this result into a plan, with no preparation needed.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={bookCallHref}
            {...(bookCallIsExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            data-track="cta_book_call"
            data-track-location="readiness-result"
            className="inline-flex items-center justify-center rounded-full border border-gold bg-gold px-7 py-3.5 text-sm font-semibold tracking-wide text-forest transition-colors hover:bg-[#e0c078]"
          >
            Book a free intro call
          </Link>
          <button
            type="button"
            onClick={() => {
              setAnswers({});
              setStep(0);
              setUnlocked(false);
            }}
            className="text-xs font-semibold tracking-[0.18em] text-sage uppercase transition-colors hover:text-[#e0c078]"
          >
            Retake the check
          </button>
        </div>
      </div>
    </div>
  );
}
