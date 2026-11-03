import { createServiceRoleClient } from "@/lib/phrenos-updates/supabase";
import { adminJson } from "@/lib/market-desk/route";
import { closeHolding, deleteHolding, T } from "@/lib/market-desk/store";

type Ctx = { params: Promise<{ id: string }> };

export function PATCH(request: Request, context: Ctx) {
  return adminJson(request, async () => {
    const { id } = await context.params;
    const body = (await request.json()) as {
      action?: "close" | "edit";
      sell_price?: number | null;
      quantity?: number;
      buy_price?: number;
      notes?: string;
    };
    if (body.action === "close") {
      await closeHolding(id, body.sell_price ?? null);
      return { ok: true };
    }
    const patch: Record<string, unknown> = {};
    if (body.quantity !== undefined && Number(body.quantity) > 0) patch.quantity = Number(body.quantity);
    if (body.buy_price !== undefined && Number(body.buy_price) > 0) patch.buy_price = Number(body.buy_price);
    if (body.notes !== undefined) patch.notes = String(body.notes);
    if (Object.keys(patch).length === 0) throw new Error("Nothing to change.");
    const { error } = await createServiceRoleClient().from(T.holdings).update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
}

export function DELETE(request: Request, context: Ctx) {
  return adminJson(request, async () => {
    await deleteHolding((await context.params).id);
    return { ok: true };
  });
}
