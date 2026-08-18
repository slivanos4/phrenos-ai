/** Marker stored on `topic_tags` for the week's primary converting story. */
export const WEEK_HERO_TAG = "week-hero";

export function isWeekHeroStory(story: {
  topic_tags?: string[] | null;
}): boolean {
  return (story.topic_tags ?? []).includes(WEEK_HERO_TAG);
}

export function hasFeaturedBlogDraft(story: {
  suggestions?: { suggestion_type: string; is_full_draft: boolean }[];
}): boolean {
  return (story.suggestions ?? []).some(
    (item) => item.suggestion_type === "blog" && item.is_full_draft
  );
}
