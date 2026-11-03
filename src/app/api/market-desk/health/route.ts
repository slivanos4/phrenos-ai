import { adminJson } from "@/lib/market-desk/route";

export const maxDuration = 60;

type Probe = { name: string; used_for: string; run: () => Promise<string> };

async function ok(url: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(15000), cache: "no-store", headers: { "User-Agent": "PhrenosMarketDesk/1.0 (contact@phrenosai.com)", ...(init?.headers ?? {}) } });
  if (!response.ok) throw new Error(`answered ${response.status}`);
  return response;
}

const PROBES: Probe[] = [
  { name: "Yahoo Finance prices", used_for: "Stocks, ETFs, currencies, metals, option activity", run: async () => { const json = (await (await ok("https://query1.finance.yahoo.com/v8/finance/chart/AAPL?range=5d&interval=1d")).json()) as { chart: { result?: unknown[] } }; if (!json.chart.result?.length) throw new Error("no data"); return "prices flowing"; } },
  { name: "Twelve Data (backup prices)", used_for: "Backup for US stocks and ETFs, currencies and gold if Yahoo fails", run: async () => { const key = process.env.TWELVE_DATA_API_KEY?.trim(); if (!key) throw new Error("no key set"); const json = (await (await ok(`https://api.twelvedata.com/time_series?symbol=AAPL&interval=1day&outputsize=2&apikey=${key}`)).json()) as { status?: string; message?: string }; if (json.status === "error") throw new Error(json.message ?? "rejected the key"); return "answering (free plan: US stocks, currencies, gold)"; } },
  { name: "CoinGecko", used_for: "Crypto prices and the crypto scan", run: async () => { const key = process.env.COINGECKO_API_KEY?.trim(); await ok("https://api.coingecko.com/api/v3/ping", key ? { headers: { "x-cg-demo-api-key": key } } : undefined); return key ? "answering (demo key in use)" : "answering (no key, so limits are tight)"; } },
  { name: "CoinMetrics", used_for: "Bitcoin and Ethereum exchange flows", run: async () => { await ok("https://community-api.coinmetrics.io/v4/catalog/metrics?metrics=FlowInExUSD"); return "answering"; } },
  { name: "SEC EDGAR", used_for: "Insider trades and fund holdings (13F)", run: async () => { await ok("https://data.sec.gov/submissions/CIK0001067983.json"); return "answering"; } },
  { name: "DexScreener", used_for: "New tokens", run: async () => { await ok("https://api.dexscreener.com/token-profiles/latest/v1"); return "answering"; } },
  { name: "Economic calendar", used_for: "This week's inflation, jobs and rate events", run: async () => { await ok("https://nfs.faireconomy.media/ff_calendar_thisweek.json"); return "answering"; } },
  { name: "Central bank feeds", used_for: "Announcements from the Fed, ECB, Bank of England and others", run: async () => { await ok("https://www.federalreserve.gov/feeds/press_all.xml"); await ok("https://www.ecb.europa.eu/rss/press.xml"); return "answering"; } },
];

/** Tests every outside data source, so a silent failure shows up here instead of as missing warnings. */
export function GET(request: Request) {
  return adminJson(request, async () => {
    const results = await Promise.all(
      PROBES.map(async (probe) => {
        const started = Date.now();
        try {
          return { name: probe.name, used_for: probe.used_for, ok: true, detail: await probe.run(), ms: Date.now() - started };
        } catch (error) {
          return { name: probe.name, used_for: probe.used_for, ok: false, detail: error instanceof Error ? error.message : "failed", ms: Date.now() - started };
        }
      }),
    );
    return { results };
  });
}
