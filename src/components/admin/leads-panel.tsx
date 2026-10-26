"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Lead = {
  id: string;
  created_at: string;
  source: string;
  email: string;
  name: string | null;
  organisation: string | null;
  role: string | null;
  message: string | null;
  readiness_percent: number | null;
  readiness_tier: string | null;
  details: Record<string, unknown> | null;
  newsletter_opt_in: boolean;
  status: string;
  notes: string | null;
};

const STATUSES: { value: string; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "in_progress", label: "In progress" },
  { value: "won", label: "Won" },
  { value: "not_a_fit", label: "Not a fit" },
];

const SOURCES: Record<string, string> = {
  contact: "Contact form",
  "readiness-check": "Readiness check",
  "cheat-sheet": "Cheat sheet",
};

const panel = "rounded-2xl border border-[#d4af5a]/25 bg-[#101c14]/70 p-5 backdrop-blur-sm";
const chip = "rounded-full border px-3 py-1 text-xs font-medium transition-colors";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

type Outcome = { signedOut: boolean; leads: Lead[]; error: string | null };

async function fetchLeads(): Promise<Outcome> {
  const auth = await fetch("/api/phrenos-updates/auth").then((r) => r.json()).catch(() => null);
  if (!auth?.authenticated) return { signedOut: true, leads: [], error: null };
  const response = await fetch("/api/phrenos-updates/leads");
  const payload = (await response.json().catch(() => ({}))) as { leads?: Lead[]; error?: string };
  if (!response.ok) {
    const missing = /relation|does not exist|schema cache/i.test(payload.error ?? "");
    return {
      signedOut: false,
      leads: [],
      error: missing
        ? "The leads table does not exist yet. Apply migration 005_leads.sql in Supabase, then refresh."
        : (payload.error ?? "Could not load leads."),
    };
  }
  return { signedOut: false, leads: payload.leads ?? [], error: null };
}

export function LeadsPanel() {
  const [state, setState] = useState<"loading" | "signed-out" | "ready">("loading");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const refresh = useCallback(() => {
    void fetchLeads().then((outcome) => {
      setError(outcome.error);
      setLeads(outcome.leads);
      setState(outcome.signedOut ? "signed-out" : "ready");
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchLeads().then((outcome) => {
      if (cancelled) return;
      setError(outcome.error);
      setLeads(outcome.leads);
      setState(outcome.signedOut ? "signed-out" : "ready");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function update(id: string, patch: { status?: string; notes?: string }) {
    const response = await fetch("/api/phrenos-updates/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    const payload = (await response.json().catch(() => ({}))) as { lead?: Lead; error?: string };
    if (!response.ok || !payload.lead) {
      setError(payload.error ?? "Could not save the change.");
      return;
    }
    setLeads((current) => current.map((lead) => (lead.id === id ? payload.lead! : lead)));
  }

  async function remove(lead: Lead) {
    if (!window.confirm(`Delete the lead from ${lead.email}? This cannot be undone.`)) return;
    const response = await fetch(`/api/phrenos-updates/leads?id=${encodeURIComponent(lead.id)}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Could not delete the lead.");
      return;
    }
    setLeads((current) => current.filter((item) => item.id !== lead.id));
  }

  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const lead of leads) result[lead.status] = (result[lead.status] ?? 0) + 1;
    return result;
  }, [leads]);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return leads.filter(
      (lead) =>
        (source === "all" || lead.source === source) &&
        (status === "all" || lead.status === status) &&
        (!needle ||
          [lead.email, lead.name, lead.organisation, lead.message].some((value) => value?.toLowerCase().includes(needle))),
    );
  }, [leads, source, status, query]);

  if (state === "loading") return <p className="text-sm text-sage">Loading…</p>;

  if (state === "signed-out") {
    return (
      <div className={panel}>
        <p className="text-sm text-[#f1e8d6]">You need to sign in first.</p>
        <p className="mt-2 text-sm text-sage">
          Sign in on the{" "}
          <Link href="/admin/ai-updates" className="text-[#e0c078] underline-offset-4 hover:underline">
            AI Updates portal
          </Link>
          , then come back to this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className={panel}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 text-sm text-[#f1e8d6]">{leads.length} leads</span>
          {STATUSES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setStatus(status === item.value ? "all" : item.value)}
              className={`${chip} ${status === item.value ? "border-[#d4af5a] bg-[#d4af5a]/15 text-[#e0c078]" : "border-[#d4af5a]/25 text-sage hover:border-[#d4af5a]/60"}`}
            >
              {item.label} {counts[item.value] ?? 0}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className="rounded-full border border-[#d4af5a]/40 bg-[#101c14] px-4 py-2 text-sm text-ivory"
            aria-label="Filter by source"
          >
            <option value="all">All sources</option>
            {Object.entries(SOURCES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, email, organisation or message"
            className="min-w-0 flex-1 rounded-full border border-[#d4af5a]/40 bg-[#101c14] px-4 py-2 text-sm text-ivory placeholder:text-sage/60"
          />
          <button
            type="button"
            onClick={refresh}
            className="rounded-full border border-[#d4af5a]/40 px-4 py-2 text-sm text-[#e0c078] hover:bg-[#d4af5a]/10"
          >
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-[#e8b4a0]/40 bg-[#e8b4a0]/5 px-4 py-3 text-sm text-[#e8b4a0]" role="alert">
          {error}
        </p>
      ) : null}

      {shown.length === 0 && !error ? <p className="text-sm text-sage">No leads match.</p> : null}

      {shown.map((lead) => {
        const expanded = open === lead.id;
        return (
          <article key={lead.id} className={panel}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-[0.2em] text-[#d4af5a] uppercase">
                  {SOURCES[lead.source] ?? lead.source} · {formatDate(lead.created_at)}
                </p>
                <p className="mt-1 text-lg text-[#f1e8d6]">{lead.name || lead.email}</p>
                <p className="text-sm text-sage">
                  {[lead.name ? lead.email : null, lead.organisation, lead.role].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {lead.readiness_percent !== null ? (
                  <span className="rounded-full border border-[#d4af5a]/50 bg-[#d4af5a]/10 px-3 py-1 text-xs text-[#e0c078]">
                    {lead.readiness_percent}% · {lead.readiness_tier}
                  </span>
                ) : null}
                {lead.newsletter_opt_in ? (
                  <span className="rounded-full border border-[#8fbf9f]/40 px-3 py-1 text-xs text-[#8fbf9f]">Briefing opt-in</span>
                ) : null}
                <select
                  value={lead.status}
                  onChange={(event) => void update(lead.id, { status: event.target.value })}
                  className="rounded-full border border-[#d4af5a]/40 bg-[#101c14] px-3 py-1.5 text-sm text-ivory"
                  aria-label="Status"
                >
                  {STATUSES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {lead.message ? (
              <p className="mt-4 text-sm leading-relaxed whitespace-pre-wrap text-ivory/90">{lead.message}</p>
            ) : null}

            <textarea
              defaultValue={lead.notes ?? ""}
              onBlur={(event) => {
                if (event.target.value !== (lead.notes ?? "")) void update(lead.id, { notes: event.target.value });
              }}
              placeholder="Private notes (saved when you click away)"
              rows={2}
              className="mt-4 w-full rounded-xl border border-[#d4af5a]/30 bg-[#101c14] px-3 py-2 text-sm text-ivory placeholder:text-sage/60"
            />

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold tracking-[0.14em] uppercase">
              <a href={`mailto:${lead.email}`} className="text-[#e0c078] underline-offset-4 hover:underline">
                Email
              </a>
              {lead.details && Object.keys(lead.details).length > 0 ? (
                <button type="button" onClick={() => setOpen(expanded ? null : lead.id)} className="text-sage hover:text-[#e0c078]">
                  {expanded ? "Hide answers" : "Show answers"}
                </button>
              ) : null}
              <button type="button" onClick={() => void remove(lead)} className="ml-auto text-[#e8b4a0] hover:underline">
                Delete
              </button>
            </div>

            {expanded && lead.details ? (
              <pre className="mt-3 max-h-80 overflow-auto rounded-xl bg-black/30 p-3 text-xs leading-relaxed whitespace-pre-wrap text-sage">
                {JSON.stringify(lead.details, null, 2)}
              </pre>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
