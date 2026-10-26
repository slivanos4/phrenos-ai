import { NextResponse } from "next/server";
import {
  AdminAuthError,
  errorResponse,
  requireAdminSession,
} from "@/lib/phrenos-updates";
import { createServiceRoleClient } from "@/lib/phrenos-updates/supabase";
import { LEAD_STATUSES, LEADS_TABLE, type LeadStatus } from "@/lib/site/leads";

function fail(error: unknown) {
  if (error instanceof AdminAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Something went wrong.";
  const { body, status } = errorResponse(message);
  return NextResponse.json(body, { status });
}

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const { data, error } = await createServiceRoleClient()
      .from(LEADS_TABLE)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return NextResponse.json({ leads: data ?? [] });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdminSession(request);
    const body = (await request.json()) as { id?: string; status?: LeadStatus; notes?: string };
    if (!body.id) return NextResponse.json({ error: "id is required." }, { status: 400 });

    const patch: Record<string, unknown> = {};
    if (body.status) {
      if (!LEAD_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: "Unknown status." }, { status: 400 });
      }
      patch.status = body.status;
    }
    if (typeof body.notes === "string") patch.notes = body.notes.slice(0, 5000);

    const { data, error } = await createServiceRoleClient()
      .from(LEADS_TABLE)
      .update(patch)
      .eq("id", body.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ lead: data });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdminSession(request);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
    const { error } = await createServiceRoleClient().from(LEADS_TABLE).delete().eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
