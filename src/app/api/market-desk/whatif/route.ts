import { adminJson } from "@/lib/market-desk/route";
import { dcaWhatIf, whatIf } from "@/lib/market-desk/whatif";

export const maxDuration = 60;

export function GET(request: Request) {
  return adminJson(request, async () => {
    const params = new URL(request.url).searchParams;
    const key = params.get("key") ?? "";
    const amount = Number(params.get("amount"));
    const months = Number(params.get("months"));
    if (!key || !(amount > 0) || !(months >= 1 && months <= 60)) {
      throw new Error("Choose an asset, an amount above zero and a period of 1 to 60 months.");
    }
    const frequency = params.get("frequency");
    if (frequency === "weekly" || frequency === "monthly") return { dca: await dcaWhatIf(key, amount, months, frequency) };
    return { result: await whatIf(key, amount, months) };
  });
}
