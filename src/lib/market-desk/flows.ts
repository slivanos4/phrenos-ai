import type { SignalRow } from "@/lib/market-desk/signals";

/**
 * Money moving onto and off exchanges for Bitcoin and Ethereum, from CoinMetrics' free community data.
 * CoinMetrics labels the exchange wallets, so unlike a raw large-transfer alert this has a direction:
 * coins sent onto exchanges are often there to be sold, coins withdrawn are often being held.
 */
type Row = { asset: string; time: string; FlowInExUSD?: string; FlowOutExUSD?: string };

const NAMES: Record<string, { symbol: string; key: string; name: string }> = {
  btc: { symbol: "BTC", key: "cg:bitcoin", name: "Bitcoin" },
  eth: { symbol: "ETH", key: "cg:ethereum", name: "Ethereum" },
};

const millions = (value: number) => `${value < 0 ? "-" : ""}$${Math.abs(value / 1e6).toFixed(0)}m`;

export function flowSignal(asset: string, days: { net: number; inflow: number; outflow: number }[]): SignalRow | null {
  if (days.length < 20) return null;
  const recent = days.slice(-3);
  const history = days.slice(0, -3);
  const recentNet = recent.reduce((sum, day) => sum + day.net, 0) / recent.length;
  const mean = history.reduce((sum, day) => sum + day.net, 0) / history.length;
  const variance = history.reduce((sum, day) => sum + (day.net - mean) ** 2, 0) / history.length;
  const sd = Math.sqrt(variance) || 1;
  const z = (recentNet - mean) / sd;
  if (Math.abs(z) < 1.3) return null;

  const info = NAMES[asset];
  const inflow = z > 0;
  return {
    asset_key: info.key,
    symbol: info.symbol,
    signal_type: "exchange_flow",
    direction: inflow ? "bearish" : "bullish",
    strength: Math.abs(z) >= 2.5 ? 4 : Math.abs(z) >= 1.8 ? 3 : 2,
    summary: `${info.name} has been ${inflow ? "flowing onto" : "leaving"} exchanges faster than usual: a net ${inflow ? "inflow" : "outflow"} of about ${millions(Math.abs(recentNet))} a day over the last 3 days, against a normal ${millions(mean)} a day over the previous month. ${inflow ? "Coins moving onto exchanges are often there to be sold." : "Coins withdrawn from exchanges are often being kept for the long term."} It is a hint about intentions, not proof.`,
    data: { z, recentNet, mean },
    source_url: "https://charts.coinmetrics.io/crypto-data/",
    observed_at: new Date().toISOString(),
  };
}

export async function exchangeFlowSignals(): Promise<SignalRow[]> {
  try {
    const start = new Date(Date.now() - 40 * 86400000).toISOString().slice(0, 10);
    const response = await fetch(
      `https://community-api.coinmetrics.io/v4/timeseries/asset-metrics?assets=btc,eth&metrics=FlowInExUSD,FlowOutExUSD&frequency=1d&page_size=200&start_time=${start}`,
      { signal: AbortSignal.timeout(20000), cache: "no-store" },
    );
    if (!response.ok) return [];
    const { data } = (await response.json()) as { data?: Row[] };
    const rows: SignalRow[] = [];
    for (const asset of ["btc", "eth"]) {
      const days = (data ?? [])
        .filter((row) => row.asset === asset && row.FlowInExUSD && row.FlowOutExUSD)
        .map((row) => ({ inflow: Number(row.FlowInExUSD), outflow: Number(row.FlowOutExUSD), net: Number(row.FlowInExUSD) - Number(row.FlowOutExUSD) }));
      const signal = flowSignal(asset, days);
      if (signal) rows.push(signal);
    }
    return rows;
  } catch {
    return [];
  }
}
