import { adminJson } from "@/lib/market-desk/route";
import { addHolding } from "@/lib/market-desk/store";

export const maxDuration = 60;

export function POST(request: Request) {
  return adminJson(
    request,
    async () => {
      const body = (await request.json()) as {
        asset_key?: string;
        quantity?: number;
        buy_price?: number;
        buy_currency?: string;
        buy_date?: string;
        notes?: string;
      };
      if (!body.asset_key || !(Number(body.quantity) > 0) || !(Number(body.buy_price) > 0)) {
        throw new Error("Choose an asset and enter a quantity and buy price above zero.");
      }
      return {
        holding: await addHolding({
          asset_key: body.asset_key,
          quantity: Number(body.quantity),
          buy_price: Number(body.buy_price),
          buy_currency: body.buy_currency,
          buy_date: body.buy_date || null,
          notes: body.notes,
        }),
      };
    },
    201,
  );
}
