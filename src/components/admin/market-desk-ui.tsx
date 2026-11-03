import type { ReactNode } from "react";

export const panelClass = "rounded-2xl border border-[#d4af5a]/25 bg-[#101c14]/88 p-5 backdrop-blur-md sm:p-6";
export const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full border border-[#d4af5a] bg-[#d4af5a] px-4 py-2 text-xs font-semibold tracking-wide text-[#0a100c] transition-colors hover:bg-[#e0c078] disabled:cursor-not-allowed disabled:opacity-50";
export const ghostButtonClass =
  "inline-flex items-center justify-center rounded-full border border-[#d4af5a]/55 px-4 py-2 text-xs font-semibold tracking-wide text-[#f1e8d6] transition-colors hover:border-[#e0c078] hover:bg-[#d4af5a]/10 disabled:cursor-not-allowed disabled:opacity-50";
export const microButtonClass =
  "inline-flex items-center justify-center rounded-full border border-[#d4af5a]/45 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[#e0c078] transition-colors hover:border-[#e0c078] hover:bg-[#d4af5a]/10 disabled:cursor-not-allowed disabled:opacity-50";
export const fieldClass =
  "w-full rounded-xl border border-[#d4af5a]/55 bg-[#0a100c]/70 px-4 py-2.5 text-sm text-[#f1e8d6] outline-none transition-colors placeholder:text-[#a9b0a3]/60 focus:border-[#e0c078]";
export const labelClass = "block text-[10px] font-semibold tracking-[0.18em] text-[#a9b0a3] uppercase";
export const eyebrowClass = "text-[10px] font-semibold tracking-[0.22em] text-[#a9b0a3] uppercase";

export async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.json !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const payload = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(payload?.error ?? `Request failed (${response.status})`);
  return payload as T;
}

export const gbp = (value: number | null | undefined) =>
  value === null || value === undefined ? "n/a" : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: value >= 100 ? 0 : 2 }).format(value);
export const eur = (value: number | null | undefined) =>
  value === null || value === undefined ? "n/a" : new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: value >= 100 ? 0 : 2 }).format(value);
export const price = (value: number | null | undefined, currency = "") =>
  value === null || value === undefined ? "n/a" : `${value >= 1000 ? value.toLocaleString("en-GB", { maximumFractionDigits: 0 }) : value >= 1 ? value.toFixed(2) : value.toPrecision(3)} ${currency}`.trim();
export const pct = (value: number | null | undefined, signed = true) =>
  value === null || value === undefined ? "n/a" : `${signed && value > 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
export const when = (value: string | null | undefined) =>
  value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value)) : "";

export function tone(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return "text-[#a9b0a3]";
  return value > 0 ? "text-[#8fbf9f]" : "text-[#e8b4a0]";
}

const RISK_COLOURS: Record<string, string> = {
  "Very low": "border-[#8fbf9f]/60 text-[#8fbf9f]",
  Low: "border-[#8fbf9f]/60 text-[#a9d1b4]",
  Moderate: "border-[#e0c078]/60 text-[#e0c078]",
  High: "border-[#e8a070]/60 text-[#e8a070]",
  "Very high": "border-[#e8b4a0]/70 text-[#e8b4a0]",
  extreme: "border-[#e8b4a0]/70 text-[#e8b4a0]",
  "very high": "border-[#e8b4a0]/70 text-[#e8b4a0]",
  high: "border-[#e8a070]/60 text-[#e8a070]",
  unrated: "border-[#a9b0a3]/40 text-[#a9b0a3]",
};

export function RiskBadge({ label, score }: { label: string | null | undefined; score?: number | null }) {
  if (!label) return <span className="text-[11px] text-[#a9b0a3]">n/a</span>;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wide ${RISK_COLOURS[label] ?? RISK_COLOURS.unrated}`}>
      {label}
      {score !== null && score !== undefined ? <span className="opacity-70">{score}</span> : null}
    </span>
  );
}

/** The safest-to-riskiest scale as a bar with a marker. */
export function RiskMeter({ score }: { score: number | null | undefined }) {
  if (score === null || score === undefined) return null;
  return (
    <div className="relative h-2 w-full rounded-full bg-[linear-gradient(90deg,#8fbf9f,#e0c078_50%,#e8b4a0)]" aria-label={`Risk ${score} out of 100`}>
      <span className="absolute top-1/2 h-4 w-1.5 -translate-y-1/2 rounded-full bg-[#f1e8d6] shadow" style={{ left: `calc(${Math.min(98, Math.max(0, score))}% - 3px)` }} />
    </div>
  );
}

export function Sparkline({ values, width = 96, height = 28 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => `${((index / (values.length - 1)) * width).toFixed(1)},${(height - ((value - min) / span) * height).toFixed(1)}`).join(" ");
  const up = values[values.length - 1] >= values[0];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <polyline points={points} fill="none" stroke={up ? "#8fbf9f" : "#e8b4a0"} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function Stat({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <p className={eyebrowClass}>{label}</p>
      <p className="mt-1 font-serif text-2xl text-[#f1e8d6]">{children}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-[#a9b0a3]">{hint}</p> : null}
    </div>
  );
}

export function Disclaimer() {
  return (
    <p className="rounded-xl border border-[#d4af5a]/20 bg-[#0a100c]/55 px-4 py-3 text-[11px] leading-relaxed text-[#a9b0a3]">
      Research and risk flags only, not financial advice. Nothing here can predict the market, and past moves do not guarantee future ones. You can lose money. Check the sources and decide for yourself.
    </p>
  );
}
