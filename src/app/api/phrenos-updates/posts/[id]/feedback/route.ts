import { NextResponse } from "next/server";
import {
  errorResponse,
  isServiceRoleConfigured,
  submitPostFeedback,
  type PostReaction,
} from "@/lib/phrenos-updates";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!isServiceRoleConfigured()) {
      return NextResponse.json(
        { error: "Feedback is not configured." },
        { status: 503 }
      );
    }

    const { id } = await context.params;
    const body = (await request.json()) as {
      reaction?: string;
      visitorKey?: string;
    };

    const reaction = body.reaction as PostReaction | undefined;
    if (reaction !== "up" && reaction !== "down") {
      return NextResponse.json(
        { error: "Reaction must be up or down." },
        { status: 400 }
      );
    }
    if (typeof body.visitorKey !== "string") {
      return NextResponse.json(
        { error: "Visitor key is required." },
        { status: 400 }
      );
    }

    const result = await submitPostFeedback({
      postId: id,
      reaction,
      visitorKey: body.visitorKey,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save feedback";
    const status =
      message === "Post not found."
        ? 404
        : message.startsWith("Invalid") || message.startsWith("Reaction")
          ? 400
          : 500;
    const { body, status: mapped } = errorResponse(message);
    return NextResponse.json(body, { status: status === 500 ? mapped : status });
  }
}
