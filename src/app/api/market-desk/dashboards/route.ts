import { adminJson } from "@/lib/market-desk/route";
import { createDashboard, deleteDashboard, listDashboards, updateDashboard } from "@/lib/market-desk/dashboards";

export function GET(request: Request) {
  return adminJson(request, async () => ({ dashboards: await listDashboards() }));
}

export function POST(request: Request) {
  return adminJson(request, async () => {
    const body = (await request.json()) as { name?: string; widgets?: unknown };
    return { dashboard: await createDashboard(body.name ?? "", body.widgets ?? []) };
  });
}

export function PUT(request: Request) {
  return adminJson(request, async () => {
    const body = (await request.json()) as { id?: string; name?: string; widgets?: unknown };
    if (!body.id) throw new Error("Choose a dashboard.");
    return { dashboard: await updateDashboard(body.id, { name: body.name, widgets: body.widgets }) };
  });
}

export function DELETE(request: Request) {
  return adminJson(request, async () => {
    const { id } = (await request.json()) as { id?: string };
    if (!id) throw new Error("Choose a dashboard.");
    await deleteDashboard(id);
    return { ok: true };
  });
}
