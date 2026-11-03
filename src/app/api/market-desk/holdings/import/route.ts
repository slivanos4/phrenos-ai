import { adminJson } from "@/lib/market-desk/route";
import { searchAssets } from "@/lib/market-desk/providers";
import { addHolding } from "@/lib/market-desk/store";

export const maxDuration = 300;

type Row = { symbol: string; quantity: number; buy_price: number; buy_date?: string; currency?: string; type?: string };

/** Adds CSV rows one by one. Each symbol is matched to a stock or coin; rows that cannot be matched are reported back. */
export function POST(request: Request) {
  return adminJson(request, async () => {
    const { rows } = (await request.json()) as { rows?: Row[] };
    if (!rows?.length) throw new Error("No rows to import.");
    if (rows.length > 100) throw new Error("Import up to 100 rows at a time.");

    const added: string[] = [];
    const failed: { symbol: string; reason: string }[] = [];
    for (const row of rows) {
      try {
        const wantCrypto = (row.type ?? "").toLowerCase() === "crypto";
        const hits = await searchAssets(row.symbol);
        const exact = hits.find((hit) => hit.symbol.toUpperCase() === row.symbol.toUpperCase() && (!wantCrypto || hit.type === "crypto"));
        const hit = exact ?? hits.find((candidate) => !wantCrypto || candidate.type === "crypto");
        if (!hit) throw new Error("No match found");
        await addHolding({
          asset_key: hit.key,
          quantity: row.quantity,
          buy_price: row.buy_price,
          buy_currency: row.currency,
          buy_date: row.buy_date,
        });
        added.push(`${row.symbol} → ${hit.name}`);
      } catch (error) {
        failed.push({ symbol: row.symbol, reason: error instanceof Error ? error.message : "failed" });
      }
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    return { added, failed };
  });
}
