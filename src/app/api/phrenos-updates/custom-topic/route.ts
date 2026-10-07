import { NextResponse } from "next/server";
import {
  AdminAuthError,
  errorResponse,
  isServiceRoleConfigured,
  requireAdminSession,
} from "@/lib/phrenos-updates";
import { createCustomTopic } from "@/lib/phrenos-updates/custom-topic";
import type { ResearchSection } from "@/lib/phrenos-updates/types";

export const maxDuration = 300;

const MIN_BRIEF = 40;
const MAX_BRIEF = 4000;

export async function POST(request: Request) {
  try {
    await requireAdminSession(request);

    if (!isServiceRoleConfigured()) {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY required for custom topics." },
        { status: 503 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      brief?: string;
      section?: string;
      sourceUrls?: string[];
    };

    const brief = (body.brief ?? "").trim();
    if (brief.length < MIN_BRIEF) {
      return NextResponse.json(
        { error: `Describe the topic in a few sentences (at least ${MIN_BRIEF} characters).` },
        { status: 400 },
      );
    }
    if (brief.length > MAX_BRIEF) {
      return NextResponse.json(
        { error: `Keep the brief under ${MAX_BRIEF} characters.` },
        { status: 400 },
      );
    }

    const section: ResearchSection =
      body.section === "models_research" ? "models_research" : "products_industry";
    const sourceUrls = (Array.isArray(body.sourceUrls) ? body.sourceUrls : [])
      .filter((url): url is string => typeof url === "string" && /^https?:\/\//i.test(url.trim()))
      .map((url) => url.trim())
      .slice(0, 8);

    const result = await createCustomTopic({ brief, section, sourceUrls });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to research this topic";
    const { body, status } = errorResponse(message);
    return NextResponse.json(body, { status });
  }
}
