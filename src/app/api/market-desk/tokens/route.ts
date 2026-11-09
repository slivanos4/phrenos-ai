import { adminJson } from "@/lib/market-desk/route";
import { createToken, listTokens, revokeToken } from "@/lib/market-desk/api-tokens";

export function GET(request: Request) {
  return adminJson(request, async () => ({ tokens: await listTokens() }));
}

/** Makes a token. The full token is in this one response and is never shown again. */
export function POST(request: Request) {
  return adminJson(request, async () => {
    const { label } = (await request.json()) as { label?: string };
    return await createToken(label ?? "");
  });
}

export function DELETE(request: Request) {
  return adminJson(request, async () => {
    const { id } = (await request.json()) as { id?: string };
    if (!id) throw new Error("Choose a token.");
    await revokeToken(id);
    return { ok: true };
  });
}
