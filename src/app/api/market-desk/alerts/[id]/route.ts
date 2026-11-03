import { adminJson } from "@/lib/market-desk/route";
import { dismissAlert } from "@/lib/market-desk/store";

export function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return adminJson(request, async () => {
    await dismissAlert((await context.params).id);
    return { ok: true };
  });
}
