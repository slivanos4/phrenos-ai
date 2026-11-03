import { STOCKS } from "@/lib/market-desk/universe";
import type { SignalRow } from "@/lib/market-desk/signals";

/**
 * Big-fund holdings from SEC 13F filings (free, but published about 45 days after each quarter ends).
 * We compare each fund's latest filing with the one before and report the largest moves. The names below
 * were checked against EDGAR's own record for each number.
 */
const SEC_UA = "PhrenosMarketDesk/1.0 (contact@phrenosai.com)";

export const FUNDS: { name: string; cik: string }[] = [
  { name: "Berkshire Hathaway", cik: "0001067983" },
  { name: "Bridgewater Associates", cik: "0001350694" },
  { name: "Renaissance Technologies", cik: "0001037389" },
  { name: "Citadel Advisors", cik: "0001423053" },
  { name: "Pershing Square", cik: "0001336528" },
  { name: "Third Point", cik: "0001040273" },
  { name: "Soros Fund Management", cik: "0001029160" },
  { name: "Tiger Global", cik: "0001167483" },
  { name: "Appaloosa", cik: "0001656456" },
  { name: "Duquesne Family Office", cik: "0001536411" },
  { name: "Point72", cik: "0001603466" },
  { name: "Two Sigma", cik: "0001179392" },
];

type Submissions = {
  filings: { recent: { form: string[]; filingDate: string[]; accessionNumber: string[]; reportDate?: string[] } };
};

type Position = { issuer: string; value: number; shares: number };

async function secFetch(url: string): Promise<Response | null> {
  const response = await fetch(url, { headers: { "User-Agent": SEC_UA }, signal: AbortSignal.timeout(25000) }).catch(() => null);
  return response && response.ok ? response : null;
}

export function parseInfoTable(xml: string): Map<string, Position> {
  const positions = new Map<string, Position>();
  for (const block of xml.match(/<(?:\w+:)?infoTable>[\s\S]*?<\/(?:\w+:)?infoTable>/g) ?? []) {
    const pick = (tag: string) => block.match(new RegExp(`<(?:\\w+:)?${tag}>([^<]*)<`))?.[1]?.trim() ?? "";
    const cusip = pick("cusip");
    if (!cusip) continue;
    const call = /<(?:\w+:)?putCall>/.test(block);
    if (call) continue; // options positions are not holdings of the shares themselves
    const existing = positions.get(cusip);
    const value = Number(pick("value")) || 0;
    const shares = Number(pick("sshPrnamt")) || 0;
    positions.set(cusip, {
      issuer: pick("nameOfIssuer"),
      value: (existing?.value ?? 0) + value,
      shares: (existing?.shares ?? 0) + shares,
    });
  }
  return positions;
}

async function loadHoldings(cik: string, accession: string): Promise<Map<string, Position> | null> {
  const folder = `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accession.replace(/-/g, "")}`;
  const index = await secFetch(`${folder}/index.json`);
  if (!index) return null;
  const items = ((await index.json()) as { directory: { item: { name: string }[] } }).directory.item;
  const table = items.find((item) => /\.xml$/i.test(item.name) && !/primary_doc/i.test(item.name));
  if (!table) return null;
  const xml = await secFetch(`${folder}/${table.name}`);
  return xml ? parseInfoTable(await xml.text()) : null;
}

const TRIM = /\b(inc|corp|corporation|co|ltd|plc|holdings|group|class [a-z]|cl [a-z]|com|new|the)\b\.?/g;
const clean = (value: string) => value.toLowerCase().replace(TRIM, " ").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/** Ties a 13F issuer name to a company we scan, when the names clearly match. */
export function matchTicker(issuer: string): { symbol: string; key: string } | null {
  const target = clean(issuer);
  for (const [symbol, name] of STOCKS) {
    const short = clean(name);
    if (short.length >= 4 && (target === short || target.startsWith(`${short} `))) return { symbol, key: `yahoo:${symbol}` };
  }
  return null;
}

const money = (value: number) => (value >= 1e9 ? `$${(value / 1e9).toFixed(1)}bn` : `$${Math.round(value / 1e6)}m`);

export function diffPositions(fund: string, current: Map<string, Position>, previous: Map<string, Position>, filed: string): SignalRow[] {
  type Move = { issuer: string; kind: "new" | "added" | "trimmed" | "exited"; value: number; change: number };
  const moves: Move[] = [];
  for (const [cusip, now] of current) {
    const before = previous.get(cusip);
    if (!before) moves.push({ issuer: now.issuer, kind: "new", value: now.value, change: now.value });
    else if (now.shares > before.shares * 1.25) moves.push({ issuer: now.issuer, kind: "added", value: now.value, change: ((now.shares - before.shares) / before.shares) * 100 });
    else if (now.shares < before.shares * 0.75) moves.push({ issuer: now.issuer, kind: "trimmed", value: now.value, change: ((before.shares - now.shares) / before.shares) * 100 });
  }
  for (const [cusip, before] of previous) {
    if (!current.has(cusip)) moves.push({ issuer: before.issuer, kind: "exited", value: before.value, change: before.value });
  }
  const total = [...current.values()].reduce((sum, position) => sum + position.value, 0) || 1;
  return moves
    .filter((move) => move.value >= Math.max(50e6, total * 0.005))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map<SignalRow>((move) => {
      const match = matchTicker(move.issuer);
      const buying = move.kind === "new" || move.kind === "added";
      const verb =
        move.kind === "new" ? `opened a new position in ${move.issuer}, now worth ${money(move.value)}`
        : move.kind === "added" ? `raised its ${move.issuer} holding by ${move.change.toFixed(0)}% to ${money(move.value)}`
        : move.kind === "trimmed" ? `cut its ${move.issuer} holding by ${move.change.toFixed(0)}% to ${money(move.value)}`
        : `sold out of ${move.issuer}, a position worth about ${money(move.value)} the quarter before`;
      return {
        asset_key: match?.key ?? null,
        symbol: match?.symbol ?? move.issuer.slice(0, 18),
        signal_type: "fund_holding",
        direction: buying ? "bullish" : "bearish",
        strength: move.value >= 1e9 ? 4 : move.value >= 300e6 ? 3 : 2,
        summary: `${fund} ${verb} (filing dated ${filed}). These filings arrive about 45 days after the quarter ends, so the move is already old news and the fund may have changed course since.`,
        data: { fund, kind: move.kind, value: move.value },
        source_url: null,
        observed_at: new Date(`${filed}T12:00:00Z`).toISOString(),
      };
    });
}

export async function fundSignals(): Promise<SignalRow[]> {
  const rows: SignalRow[] = [];
  for (const fund of FUNDS) {
    try {
      const response = await secFetch(`https://data.sec.gov/submissions/CIK${fund.cik}.json`);
      if (!response) continue;
      const recent = ((await response.json()) as Submissions).filings.recent;
      const filings = recent.form
        .map((form, index) => ({ form, index }))
        .filter((entry) => entry.form === "13F-HR")
        .slice(0, 2);
      if (filings.length < 2) continue;
      const [latest, before] = filings;
      const current = await loadHoldings(fund.cik, recent.accessionNumber[latest.index]);
      const prior = await loadHoldings(fund.cik, recent.accessionNumber[before.index]);
      if (!current || !prior) continue;
      const signals = diffPositions(fund.name, current, prior, recent.filingDate[latest.index]);
      for (const signal of signals) {
        signal.source_url = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${fund.cik}&type=13F-HR`;
      }
      rows.push(...signals);
    } catch {
      // One fund failing should not stop the others.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return rows;
}
