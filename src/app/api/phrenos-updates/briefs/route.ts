import { NextResponse } from "next/server";
import {
  AdminAuthError,
  errorResponse,
  ingestWeeklyBrief,
  listWeeklyBriefs,
  requireAdminSession,
  verifyCronOrAdmin,
} from "@/lib/phrenos-updates";

export const maxDuration = 120;

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const briefs = await listWeeklyBriefs();
    return NextResponse.json({ briefs });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to list weekly briefs";
    const { body, status } = errorResponse(message);
    return NextResponse.json(body, { status });
  }
}

/** Ingest a Cursor weekly GenAI desk brief (admin session or cron bearer). */
export async function POST(request: Request) {
  try {
    const allowed = await verifyCronOrAdmin(request);
    if (!allowed) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = (await request.json()) as {
      title?: string;
      lookback_start?: string;
      lookback_end?: string;
      research_markdown?: string;
      content_markdown?: string;
      researchMarkdown?: string;
      contentMarkdown?: string;
      ideas?: unknown;
      source_urls?: unknown;
      sourceUrls?: unknown;
    };

    const research =
      payload.research_markdown ?? payload.researchMarkdown ?? "";
    const content = payload.content_markdown ?? payload.contentMarkdown ?? "";

    if (!research.trim() && !content.trim() && !payload.ideas) {
      return NextResponse.json(
        {
          error:
            "Provide research_markdown, content_markdown, and/or ideas for the desk brief.",
        },
        { status: 400 }
      );
    }

    const brief = await ingestWeeklyBrief({
      title: payload.title,
      lookback_start: payload.lookback_start,
      lookback_end: payload.lookback_end,
      research_markdown: research,
      content_markdown: content,
      ideas: payload.ideas,
      source_urls: payload.source_urls ?? payload.sourceUrls,
    });

    return NextResponse.json({ brief });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to ingest weekly brief";
    const { body, status } = errorResponse(message);
    return NextResponse.json(body, { status });
  }
}
