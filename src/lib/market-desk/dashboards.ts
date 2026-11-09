import { createServiceRoleClient } from "@/lib/phrenos-updates/supabase";
import { T } from "@/lib/market-desk/store";

/** Saved dashboard layouts: a name and an ordered list of widgets, each half or full width. */
export const WIDGET_TYPES = ["market", "holdings", "watchlist", "gainers", "losers", "top", "alerts", "events", "pulse", "trending", "brief"] as const;
export type WidgetType = (typeof WIDGET_TYPES)[number];
export type Widget = { id: string; type: WidgetType; size: "half" | "full" };
export type Dashboard = { id: string; name: string; widgets: Widget[]; position: number; updated_at: string };

const DEFAULT_WIDGETS: Widget[] = [
  { id: "w1", type: "market", size: "full" },
  { id: "w2", type: "holdings", size: "half" },
  { id: "w3", type: "alerts", size: "half" },
  { id: "w4", type: "pulse", size: "full" },
  { id: "w5", type: "gainers", size: "half" },
  { id: "w6", type: "losers", size: "half" },
  { id: "w7", type: "watchlist", size: "half" },
  { id: "w8", type: "events", size: "half" },
];

function db() {
  return createServiceRoleClient();
}

function explain(message: string): Error {
  return new Error(/phrenos_market_dashboards/.test(message) ? "The dashboards table is missing. Run supabase/migrations/012_market_pulse_dashboards_api.sql in Supabase." : message);
}

/** Keeps only widgets of a known type, with a safe size and a unique id, so a bad save can never break the page. */
export function cleanWidgets(input: unknown): Widget[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: Widget[] = [];
  for (const item of input.slice(0, 24)) {
    const type = (item as Widget)?.type;
    if (!WIDGET_TYPES.includes(type)) continue;
    let id = String((item as Widget).id ?? "").slice(0, 40) || `w${out.length + 1}`;
    while (seen.has(id)) id = `${id}x`;
    seen.add(id);
    out.push({ id, type, size: (item as Widget).size === "full" ? "full" : "half" });
  }
  return out;
}

const asDashboard = (row: Record<string, unknown>): Dashboard => ({
  id: String(row.id),
  name: String(row.name),
  widgets: cleanWidgets(row.widgets),
  position: Number(row.position ?? 0),
  updated_at: String(row.updated_at),
});

export async function listDashboards(): Promise<Dashboard[]> {
  const { data, error } = await db().from(T.dashboards).select("*").order("position", { ascending: true }).order("created_at", { ascending: true });
  if (error) throw explain(error.message);
  if ((data ?? []).length === 0) {
    // The first visit gets a sensible starting layout.
    const created = await createDashboard("My dashboard", DEFAULT_WIDGETS);
    return [created];
  }
  return (data ?? []).map(asDashboard);
}

export async function createDashboard(name: string, widgets: unknown): Promise<Dashboard> {
  const clean = name.trim().slice(0, 60) || "New dashboard";
  const { data: last } = await db().from(T.dashboards).select("position").order("position", { ascending: false }).limit(1);
  const position = Number(last?.[0]?.position ?? -1) + 1;
  const { data, error } = await db().from(T.dashboards).insert({ name: clean, widgets: cleanWidgets(widgets), position }).select("*").single();
  if (error) throw explain(error.message);
  return asDashboard(data);
}

export async function updateDashboard(id: string, patch: { name?: string; widgets?: unknown }): Promise<Dashboard> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof patch.name === "string" && patch.name.trim()) update.name = patch.name.trim().slice(0, 60);
  if (patch.widgets !== undefined) update.widgets = cleanWidgets(patch.widgets);
  const { data, error } = await db().from(T.dashboards).update(update).eq("id", id).select("*").single();
  if (error) throw explain(error.message);
  return asDashboard(data);
}

export async function deleteDashboard(id: string): Promise<void> {
  const { count } = await db().from(T.dashboards).select("id", { count: "exact", head: true });
  if ((count ?? 0) <= 1) throw new Error("Keep at least one dashboard.");
  const { error } = await db().from(T.dashboards).delete().eq("id", id);
  if (error) throw explain(error.message);
}
