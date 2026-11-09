"use client";

import { useEffect, useState } from "react";
import type { Pulse } from "@/lib/market-desk/pulse";
import { api, eyebrowClass, microButtonClass, panelClass } from "@/components/admin/market-desk-ui";

const dayLabel = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const ageDays = (day: string) => Math.floor((Date.now() - new Date(`${day}T00:00:00Z`).getTime()) / 86_400_000);

function Bullets({ pulse }: { pulse: Pulse }) {
  return (
    <ul className="mt-2 space-y-2">
      {pulse.bullets.map((bullet) => (
        <li key={bullet.text} className="text-sm leading-relaxed text-[#d5d0c1]">
          <span className="mr-1.5 text-[#e0c078]">•</span>{bullet.text}
          {bullet.source_url ? <> <a href={bullet.source_url} target="_blank" rel="noreferrer" className="text-[11px] text-[#e0c078] underline-offset-4 hover:underline" title={bullet.source_title ?? undefined}>Source <span aria-hidden>↗</span></a></> : null}
        </li>
      ))}
    </ul>
  );
}

/** A short, dated, sourced summary for one asset. It says plainly when it is out of date rather than showing old news as fresh. */
export function PulseCard({ assetKey }: { assetKey: string }) {
  const [pulses, setPulses] = useState<Pulse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void api<{ pulses: Pulse[] }>(`/api/market-desk/pulse?key=${encodeURIComponent(assetKey)}`)
      .then((result) => setPulses(result.pulses))
      .catch((cause: Error) => { setError(cause.message); setPulses([]); });
  }, [assetKey]);

  async function write() {
    setBusy(true);
    setError(null);
    try {
      setPulses((await api<{ pulses: Pulse[] }>("/api/market-desk/pulse", { method: "POST", json: { key: assetKey } })).pulses);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not write the Pulse.");
    } finally {
      setBusy(false);
    }
  }

  const latest = pulses?.[0];
  const stale = latest ? ageDays(latest.day) > 1 : false;
  return (
    <section id="pulse" className={`${panelClass} scroll-mt-24`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={eyebrowClass}>Daily Pulse</p>
          <p className="mt-1 text-xs text-[#a9b0a3]">What moved and what the news says, with a link for every claim. Written by AI from headlines only. Research, not advice.</p>
        </div>
        <button type="button" className={microButtonClass} disabled={busy || pulses === null} onClick={() => void write()}>{busy ? "Writing..." : latest ? "Refresh Pulse" : "Write today's Pulse"}</button>
      </div>
      {error ? <p className="mt-3 text-sm text-[#e8b4a0]">{error}</p> : null}
      {pulses === null ? <p className="mt-3 text-sm text-[#a9b0a3]">Loading...</p> : null}
      {pulses !== null && !latest && !error ? <p className="mt-3 text-sm text-[#a9b0a3]">No Pulse yet. It is written each morning for everything you hold, watch or see in the top of the rankings, or press the button.</p> : null}
      {latest ? (
        <div className="mt-4">
          <p className="flex flex-wrap items-center gap-2 text-[11px] text-[#a9b0a3]">
            <span>{dayLabel(latest.day)}</span>
            {stale ? <span className="rounded-full border border-[#e8a070]/60 px-2 py-0.5 text-[#e8a070]">Out of date: {ageDays(latest.day)} days old</span> : <span className="rounded-full border border-[#8fbf9f]/50 px-2 py-0.5 text-[#8fbf9f]">Current</span>}
          </p>
          <p className="mt-2 font-serif text-xl text-[#f1e8d6]">{latest.headline}</p>
          <Bullets pulse={latest} />
        </div>
      ) : null}
      {pulses && pulses.length > 1 ? (
        <details className="mt-4 border-t border-[#d4af5a]/15 pt-3">
          <summary className="cursor-pointer text-[11px] font-semibold tracking-[0.16em] text-[#a9b0a3] uppercase">Earlier days</summary>
          <div className="mt-3 space-y-4">
            {pulses.slice(1).map((pulse) => (
              <div key={pulse.id}>
                <p className="text-[11px] text-[#a9b0a3]">{dayLabel(pulse.day)}</p>
                <p className="mt-1 text-sm font-semibold text-[#f1e8d6]">{pulse.headline}</p>
                <Bullets pulse={pulse} />
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
