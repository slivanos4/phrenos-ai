import type { AssetRow } from "@/lib/market-desk/types";

export type NewsItem = { title: string; publisher: string; link: string; published: string | null };

export async function fetchNews(asset: AssetRow): Promise<NewsItem[]> {
  const query = asset.provider === "cg" ? asset.name : asset.symbol;
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=0&newsCount=8`,
      { headers: { "User-Agent": "Mozilla/5.0 (compatible; PhrenosMarketDesk/1.0)" }, signal: AbortSignal.timeout(15000), cache: "no-store" },
    );
    if (!response.ok) return [];
    const body = (await response.json()) as { news?: { title: string; publisher?: string; link: string; providerPublishTime?: number }[] };
    return (body.news ?? []).map((item) => ({
      title: item.title,
      publisher: item.publisher ?? "",
      link: item.link,
      published: item.providerPublishTime ? new Date(item.providerPublishTime * 1000).toISOString() : null,
    }));
  } catch {
    return [];
  }
}
