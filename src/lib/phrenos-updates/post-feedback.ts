import { createServiceRoleClient } from "@/lib/phrenos-updates/supabase";
import { FEEDBACK_TABLE, PUBLISHED_POSTS_TABLE } from "@/lib/phrenos-updates/tables";

export type PostReaction = "up" | "down";

const VISITOR_KEY_RE = /^[a-zA-Z0-9_-]{8,64}$/;

export function isValidVisitorKey(value: string): boolean {
  return VISITOR_KEY_RE.test(value);
}

export async function submitPostFeedback(input: {
  postId: string;
  reaction: PostReaction;
  visitorKey: string;
}): Promise<{ ok: true; reaction: PostReaction }> {
  if (input.reaction !== "up" && input.reaction !== "down") {
    throw new Error("Reaction must be up or down.");
  }
  if (!isValidVisitorKey(input.visitorKey)) {
    throw new Error("Invalid visitor key.");
  }

  const supabase = createServiceRoleClient();

  const { data: post, error: postError } = await supabase
    .from(PUBLISHED_POSTS_TABLE)
    .select("id")
    .eq("id", input.postId)
    .maybeSingle();

  if (postError) throw new Error(postError.message);
  if (!post) throw new Error("Post not found.");

  const { error } = await supabase.from(FEEDBACK_TABLE).upsert(
    {
      post_id: input.postId,
      reaction: input.reaction,
      visitor_key: input.visitorKey,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "post_id,visitor_key" }
  );

  if (error) throw new Error(error.message);
  return { ok: true, reaction: input.reaction };
}
