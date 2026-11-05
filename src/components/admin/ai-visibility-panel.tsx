"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { VisibilityState } from "@/app/api/ai-visibility/route";
import type { Advice, Gap } from "@/lib/ai-visibility/advice";
import { ENGINE_LABELS, MAX_QUESTIONS, headline, type Check, type Engine } from "@/lib/ai-visibility/score";
import { api, eyebrowClass, fieldClass, labelClass, microButtonClass, panelClass, primaryButtonClass } from "@/components/admin/market-desk-ui";

const when = (iso: string | null) => (iso ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : null);

function label(check: Check | undefined): { text: string; tone: string } {
  if (!check) return { text: "Not checked", tone: "text-[#a9b0a3]/70" };
  const rivals = check.competitors.length > 0 ? ` · ${check.competitors.length} competitor${check.competitors.length === 1 ? "" : "s"}` : "";
  if (check.cited) return { text: `Cited${rivals}`, tone: "text-[#8fbf9f]" };
  if (check.mentioned && check.identity === "confused") return { text: `Mistaken for another business${rivals}`, tone: "text-[#e0c078]" };
  if (check.mentioned && check.identity === "unclear") return { text: `Named, unclear which business${rivals}`, tone: "text-[#e0c078]" };
  if (check.mentioned) return { text: `Mentioned${rivals}`, tone: "text-[#8fbf9f]" };
  return { text: `Not mentioned${rivals}`, tone: "text-[#a9b0a3]" };
}

type Found = { name: string; why: string; url: string };
type PostResult = { questions?: string[]; advice?: Advice; at?: string; found?: Found[]; added?: number; note?: { why: string; url: string } | null; name?: string };

export function AiVisibilityPanel() {
  const [state, setState] = useState<VisibilityState | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [suggested, setSuggested] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [names, setNames] = useState("");
  const [rivals, setRivals] = useState("");
  const [website, setWebsite] = useState("");
  const [newRival, setNewRival] = useState("");
  const [rivalNote, setRivalNote] = useState<string | null>(null);
  const [found, setFound] = useState<Found[] | null>(null);

  const fetchState = useCallback(async (): Promise<{ data: VisibilityState | null; message: string | null }> => {
    try {
      return { data: await api<VisibilityState>("/api/ai-visibility"), message: null };
    } catch (cause) {
      return { data: null, message: cause instanceof Error ? cause.message : "Could not load this." };
    }
  }, []);

  const apply = useCallback((outcome: { data: VisibilityState | null; message: string | null }) => {
    if (outcome.data) {
      setState(outcome.data);
      setNames(outcome.data.extraNames.join("\n"));
      setRivals(outcome.data.competitors.join("\n"));
      setWebsite(outcome.data.website);
      setError(null);
    } else if (outcome.message && /sign in/i.test(outcome.message)) {
      setSignedOut(true);
    } else {
      setError(outcome.message);
    }
    return outcome.data;
  }, []);

  const load = useCallback(async () => apply(await fetchState()), [apply, fetchState]);

  useEffect(() => {
    void fetchState().then(apply);
  }, [fetchState, apply]);

  // Competitors with no website saved yet get one looked up, once each, so every name links to the right place.
  const tried = useRef(new Set<string>());
  const missingKey = state && state.engines.length > 0 ? state.competitors.filter((n) => !state.competitorNotes[n]).join("|") : "";
  useEffect(() => {
    const fresh = missingKey.split("|").filter((n) => n && !tried.current.has(n));
    if (fresh.length === 0) return;
    for (const n of fresh) tried.current.add(n);
    api("/api/ai-visibility", { method: "POST", json: { action: "explain" } })
      .then(() => load())
      .catch(() => undefined);
  }, [missingKey, load]);

  const post = (body: Record<string, unknown>) => api<PostResult>("/api/ai-visibility", { method: "POST", json: body });

  const run = async (name: string, work: () => Promise<void>) => {
    setBusy(name);
    setError(null);
    try {
      await work();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    }
    setBusy(null);
    setProgress(null);
  };

  const add = (questions: string[]) =>
    run("add", async () => {
      await post({ action: "add", questions });
      setQuestion("");
      setSuggested((current) => current.filter((q) => !questions.includes(q)));
      await load();
    });

  const checkAll = (ids: string[]) =>
    run("check", async () => {
      let all = ids;
      if (state && state.competitors.length === 0) {
        setProgress("Finding competitors");
        await post({ action: "competitors" }).then((d) => setFound(d.found ?? [])).catch(() => undefined);
      }
      setProgress("Writing new questions");
      await post({ action: "topup" });
      all = (await load())?.questions.map((q) => q.id) ?? ids;

      // Three at a time: each question waits on two assistants, so twenty in a row would take most of a quarter of an hour.
      let next = 0;
      let done = 0;
      let failure: Error | null = null;
      setProgress(`Checking 0 of ${all.length}`);
      await Promise.all(
        Array.from({ length: Math.min(3, all.length) }, async () => {
          while (next < all.length && !failure) {
            const id = all[next++];
            try {
              await post({ action: "run", id });
            } catch (cause) {
              failure = cause instanceof Error ? cause : new Error("The check failed.");
              return;
            }
            setProgress(`Checking ${++done} of ${all.length}`);
          }
        }),
      );
      await load();
      if (failure) throw failure;
      setProgress("Working out suggestions");
      await post({ action: "advise" }).catch((cause: Error) => setError(`The answers are in, but the suggestions could not be worked out: ${cause.message}`));
      await load();
    });

  if (signedOut) {
    return (
      <div className={`${panelClass} max-w-md`}>
        <h2 className="font-serif text-2xl text-[#f1e8d6]">Sign in first</h2>
        <p className="mt-2 text-sm text-[#a9b0a3]">AI visibility uses the same sign in as the rest of the admin, with your authenticator code.</p>
        <Link href="/admin/ai-updates" className={`${primaryButtonClass} mt-4`}>Go to sign in</Link>
      </div>
    );
  }
  if (error && !state) return <div className={panelClass}><p className="text-sm text-[#e8b4a0]">{error}</p></div>;
  if (!state) return <div className={panelClass}><p className="text-sm text-[#a9b0a3]">Loading...</p></div>;

  const connected = state.engines.length > 0;
  const engines: Engine[] = connected ? state.engines : ["claude", "chatgpt"];

  return (
    <div className="space-y-5">
      <div className={`${panelClass} space-y-3`}>
        <p className="font-serif text-xl text-[#f1e8d6]">{state.label}: {headline(state.summary)}</p>
        <p className="text-sm leading-relaxed text-[#a9b0a3]">We ask the assistants the questions a customer would ask, with no hint about the company, then record whether it is named. These are samples: answers vary from person to person and day to day, so read the trend rather than any one result.</p>
        <p className="text-xs text-[#a9b0a3]">
          {connected ? `Asking through ${state.engines.map((e) => ENGINE_LABELS[e]).join(" and ")}. Gemini, Perplexity and Google AI Overviews are not tracked yet.` : "No assistant is connected yet. Add ANTHROPIC_API_KEY or OPENAI_API_KEY."}
          {state.summary.checkedAt ? ` Last checked ${when(state.summary.checkedAt)}.` : ""}
        </p>

        <div className="space-y-2 border-t border-[#d4af5a]/15 pt-3 text-sm">
          <p className="font-semibold text-[#f1e8d6]">Competitors we count ({state.competitors.length})</p>
          {state.competitors.length === 0 ? <p className="text-[#a9b0a3]">None yet. They are found on the web when you press Check now, or press Find competitors.</p> : (
            <ul className="space-y-1 text-xs text-[#a9b0a3]">
              {state.competitors.map((name) => {
                const note = state.competitorNotes[name];
                return (
                  <li key={name} className={found?.some((f) => f.name === name) ? "text-[#f1e8d6]" : undefined}>
                    <a href={note?.url ?? `https://www.google.com/search?q=${encodeURIComponent(name)}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#e0c078] underline-offset-4 hover:underline">{name} ↗</a>
                    {note?.why ? `: ${note.why}` : ""}
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <input className={`${fieldClass} max-w-xs`} value={newRival} onChange={(event) => setNewRival(event.target.value)} onKeyDown={(event) => event.key === "Enter" && newRival.trim().length >= 2 && busy === null && void run("rival", async () => { const res = await post({ action: "add_competitor", name: newRival.trim() }); setNewRival(""); setRivalNote(res.note ? `Added ${res.name}. ${res.note.why}` : `Added ${res.name}. No website could be confirmed on the web, so its name opens a search for now.`); if (res.note && res.name) tried.current.add(res.name); await load(); })} placeholder="Add a competitor by name" maxLength={80} aria-label="Add a competitor by name" />
            <button type="button" className={microButtonClass} disabled={busy !== null || newRival.trim().length < 2} onClick={() => void run("rival", async () => { const res = await post({ action: "add_competitor", name: newRival.trim() }); setNewRival(""); setRivalNote(res.note ? `Added ${res.name}. ${res.note.why}` : `Added ${res.name}. No website could be confirmed on the web, so its name opens a search for now.`); if (res.note && res.name) tried.current.add(res.name); await load(); })}>{busy === "rival" ? "Adding..." : "Search and add"}</button>
            <button type="button" className={microButtonClass} disabled={busy !== null || !connected} onClick={() => void run("competitors", async () => { setFound((await post({ action: "competitors" })).found ?? []); await load(); })}>{busy === "competitors" ? "Searching..." : state.competitors.length > 0 ? "Find more competitors" : "Find competitors"}</button>
          </div>
          {rivalNote ? <p className="text-xs text-[#a9b0a3]">{rivalNote}</p> : null}
          {found !== null ? <p className="text-xs text-[#a9b0a3]">{found.length === 0 ? "Nothing new found that could be confirmed on a real page. The list above is unchanged." : `Added ${found.length}: ${found.map((f) => f.name).join(", ")}. The ones you had are kept, and any without a page now have one.`}</p> : null}
        </div>

        {state.rivals.length > 0 ? <p className="text-sm text-[#c9c6ba]">Named most often instead: {state.rivals.map((r) => `${r.name} (${r.count})`).join(", ")}.</p> : null}
        <p className="text-xs text-[#a9b0a3]">
          Looking for: {state.names.join(", ") || "no names yet"}.{" "}
          <button type="button" className="text-[#e0c078] underline-offset-4 hover:underline" onClick={() => setEditing((current) => !current)}>{editing ? "Close" : "Change names and competitors"}</button>
        </p>
        {editing ? (
          <div className="grid gap-3 pt-2 sm:grid-cols-3">
            <label className="block space-y-1.5"><span className={labelClass}>Extra names, one per line</span><textarea className={fieldClass} rows={4} value={names} onChange={(event) => setNames(event.target.value)} placeholder="A name people use that is not the company name" /></label>
            <label className="block space-y-1.5"><span className={labelClass}>Competitors, one per line</span><textarea className={fieldClass} rows={4} value={rivals} onChange={(event) => setRivals(event.target.value)} placeholder="Counted when an answer names them" /></label>
            <label className="block space-y-1.5"><span className={labelClass}>Website</span><input className={fieldClass} value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="example.com" /></label>
            <div className="sm:col-span-3"><button type="button" className={primaryButtonClass} disabled={busy !== null} onClick={() => void run("save", async () => { await post({ action: "save", names: names.split("\n"), competitors: rivals.split("\n"), website }); setEditing(false); await load(); })}>Save</button></div>
          </div>
        ) : null}
      </div>

      <div className={`${panelClass} space-y-3`}>
        <div className="flex flex-wrap items-center gap-2">
          <input className={`${fieldClass} min-w-[16rem] flex-1`} value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => event.key === "Enter" && question.trim().length >= 5 && void add([question])} placeholder="A question a customer would ask" maxLength={300} />
          <button type="button" className={microButtonClass} disabled={busy !== null || question.trim().length < 5 || state.questions.length >= MAX_QUESTIONS} onClick={() => void add([question])}>Add</button>
          <button type="button" className={microButtonClass} disabled={busy !== null || state.questions.length >= MAX_QUESTIONS} onClick={() => void run("suggest", async () => setSuggested((await post({ action: "suggest" })).questions ?? []))}>{busy === "suggest" ? "Thinking..." : "Suggest questions"}</button>
          <button type="button" className={primaryButtonClass} disabled={busy !== null || !connected} onClick={() => void checkAll(state.questions.map((q) => q.id))}>{busy === "check" ? (progress ?? "Checking...") : "Check now"}</button>
        </div>
        {suggested.length > 0 ? (
          <div className="space-y-2 rounded-xl border border-[#d4af5a]/20 p-3">
            <p className="text-xs font-semibold text-[#a9b0a3]">Suggested. Add the ones you want tracked.</p>
            {suggested.map((q) => (
              <div key={q} className="flex items-center justify-between gap-3 text-sm text-[#f1e8d6]">
                <span>{q}</span>
                <button type="button" className={microButtonClass} disabled={busy !== null || state.questions.length >= MAX_QUESTIONS} onClick={() => void add([q])}>Add</button>
              </div>
            ))}
            <button type="button" className={microButtonClass} disabled={busy !== null} onClick={() => void add(suggested.slice(0, MAX_QUESTIONS - state.questions.length))}>Add all</button>
          </div>
        ) : null}
        {error ? <p className="text-sm text-[#e8b4a0]" role="alert">{error}</p> : null}
        {busy === "check" ? <p className="text-xs text-[#a9b0a3]">Each question takes about half a minute, and new questions and suggestions are written as part of the check. Keep this page open.</p> : null}
        {state.questions.length < MAX_QUESTIONS ? <p className="text-xs text-[#a9b0a3]">Check now also writes up to 5 new questions about what you offer, until {MAX_QUESTIONS} are tracked.</p> : null}

        {state.questions.length === 0 ? <p className="text-sm text-[#a9b0a3]">No questions yet. Add one, or press Suggest questions.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#d4af5a]/15 text-left text-[10px] tracking-[0.16em] text-[#a9b0a3] uppercase">
                  <th className="py-2 pr-3 font-semibold">Question</th>
                  {engines.map((e) => <th key={e} className="px-3 py-2 font-semibold">{ENGINE_LABELS[e]}</th>)}
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {state.questions.map((q) => (
                  <ResultRow key={q.id} q={q} engines={engines} open={open === q.id} onToggle={() => setOpen(open === q.id ? null : q.id)} busy={busy !== null} onRemove={() => void run("remove", async () => { await post({ action: "remove", id: q.id }); await load(); })} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AdviceSection advice={state.advice.current} at={state.advice.at} busy={busy} canAdvise={state.summary.answers > 0} onAdvise={() => void run("advise", async () => { await post({ action: "advise" }); await load(); })} />
    </div>
  );
}

const PRIORITY_TONE: Record<Gap["priority"], string> = { high: "bg-[#e8b4a0]/15 text-[#e8b4a0]", medium: "bg-[#e0c078]/15 text-[#e0c078]", low: "bg-[#a9b0a3]/15 text-[#a9b0a3]" };

/** What to write or fix so Phrenos is named: grouped by what is missing, with who is named instead and a working title and outline for each. */
function AdviceSection({ advice, at, busy, canAdvise, onAdvise }: { advice: Advice | null; at: string | null; busy: string | null; canAdvise: boolean; onAdvise: () => void }) {
  return (
    <div className={`${panelClass} space-y-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-serif text-xl text-[#f1e8d6]">How to appear in AI answers</p>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#a9b0a3]">Worked out from the answers above, who is named or cited instead, and what the site already covers. It is advice to act on; nothing changes on the site by itself.{at ? ` Updated ${when(at)}.` : ""}</p>
        </div>
        <button type="button" className={microButtonClass} disabled={busy !== null || !canAdvise} onClick={onAdvise}>{busy === "advise" ? "Working it out..." : advice ? "Refresh suggestions" : "Work out suggestions"}</button>
      </div>
      {!advice ? <p className="text-sm text-[#a9b0a3]">{canAdvise ? "Press Work out suggestions, or run Check now, which does it for you." : "Run Check now first, so there are answers to work from."}</p> : null}
      {advice ? (
        <>
          <p className="text-sm leading-relaxed text-[#f1e8d6]">{advice.summary}</p>
          <div className="space-y-3">
            {advice.gaps.map((g) => (
              <div key={g.theme} className="space-y-2 rounded-xl border border-[#d4af5a]/20 bg-[#0a100c]/45 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${PRIORITY_TONE[g.priority]}`}>{g.priority} priority</span>
                  <p className="text-sm font-semibold text-[#f1e8d6]">{g.theme}</p>
                </div>
                <p className="text-sm text-[#c9c6ba]"><span className="font-semibold text-[#f1e8d6]">Why you are missing: </span>{g.why}</p>
                <p className="text-sm text-[#c9c6ba]"><span className="font-semibold text-[#f1e8d6]">What to do: </span>{g.action}</p>
                <div className="rounded-lg bg-[#d4af5a]/8 p-3 text-sm">
                  <p className="text-[#f1e8d6]"><span className="text-[10px] font-semibold tracking-[0.16em] text-[#e0c078] uppercase">{g.format}</span> · {g.title}</p>
                  <ul className="mt-1 list-disc pl-5 text-[#c9c6ba]">{g.outline.map((o) => <li key={o}>{o}</li>)}</ul>
                </div>
                <details className="text-xs text-[#a9b0a3]">
                  <summary className="cursor-pointer">Covers {g.questions.length} tracked question{g.questions.length === 1 ? "" : "s"}</summary>
                  <ul className="mt-1 list-disc pl-5">{g.questions.map((q) => <li key={q}>{q}</li>)}</ul>
                </details>
              </div>
            ))}
          </div>
          {advice.offsite.length > 0 ? (
            <div>
              <p className={eyebrowClass}>Beyond your own site</p>
              <ul className="mt-2 space-y-1 text-sm text-[#c9c6ba]">{advice.offsite.map((o) => <li key={o.where}><span className="font-semibold text-[#f1e8d6]">{o.where}: </span>{o.how}</li>)}</ul>
            </div>
          ) : null}
          {advice.basics.length > 0 ? (
            <div>
              <p className={eyebrowClass}>The basics</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#c9c6ba]">{advice.basics.map((b) => <li key={b}>{b}</li>)}</ul>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function ResultRow({ q, engines, open, onToggle, busy, onRemove }: { q: VisibilityState["questions"][number]; engines: Engine[]; open: boolean; onToggle: () => void; busy: boolean; onRemove: () => void }) {
  return (
    <>
      <tr className="border-b border-[#d4af5a]/10 align-top">
        <td className="py-2 pr-3 text-[#f1e8d6]">{q.question}</td>
        {engines.map((e) => {
          const l = label(q.results[e]);
          return (
            <td key={e} className="px-3 py-2">
              <button type="button" onClick={onToggle} className={`inline-flex items-center gap-1 text-left ${l.tone}`} aria-expanded={open}>
                <span aria-hidden className={`inline-block text-[10px] transition ${open ? "rotate-90" : ""}`}>▸</span> {l.text}
              </button>
            </td>
          );
        })}
        <td className="py-2 text-right"><button type="button" aria-label="Remove question" disabled={busy} onClick={onRemove} className="text-[#a9b0a3]/70 hover:text-[#e8b4a0]">✕</button></td>
      </tr>
      {open ? (
        <tr className="border-b border-[#d4af5a]/10">
          <td colSpan={engines.length + 2} className="pt-1 pb-4">
            <div className="grid gap-3 md:grid-cols-2">
              {engines.map((e) => {
                const c = q.results[e];
                return (
                  <div key={e} className="space-y-1.5 rounded-xl border border-[#d4af5a]/20 bg-[#0a100c]/45 p-3 text-xs">
                    <p className="font-semibold text-[#f1e8d6]">{ENGINE_LABELS[e]}{c ? ` · ${when(c.checked_at)}` : ""}</p>
                    {c ? (
                      <>
                        {c.mentioned && c.identity && c.identity !== "correct" && c.identity_note ? <p className="text-[#e0c078]">{c.identity === "confused" ? "Describes a different business: " : "Unclear: "}{c.identity_note}</p> : null}
                        <p className="whitespace-pre-wrap text-[#c9c6ba]">{c.excerpt || "No answer text came back."}</p>
                        {c.competitors.length > 0 ? <p className="text-[#a9b0a3]">Competitors named: {c.competitors.join(", ")}</p> : null}
                        {c.cited_urls.length > 0 ? (
                          <ul className="space-y-0.5 text-[#a9b0a3]">
                            {c.cited_urls.map((u) => <li key={u} className="truncate"><a href={u} target="_blank" rel="noopener noreferrer" className="text-[#e0c078] underline-offset-4 hover:underline">{u.replace(/^https?:\/\/(www\.)?/, "")} ↗</a></li>)}
                          </ul>
                        ) : null}
                      </>
                    ) : <p className="text-[#a9b0a3]/70">Not checked on this assistant yet.</p>}
                  </div>
                );
              })}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
