/**
 * Public surface for the Phrenos weekly Gen AI news pipeline.
 * API routes and admin UI should import from here.
 */

export type {
  ContentSuggestion,
  GeneratedSource,
  GeneratedStory,
  GeneratedSuggestion,
  PublishedPost,
  ResearchRun,
  ResearchRunStatus,
  ResearchSection,
  ResearchSource,
  ResearchStory,
  SuggestionStatus,
  SuggestionType,
} from "@/lib/phrenos-updates/types";

export {
  MAX_STORIES_PER_SECTION,
  SECTION_LABELS,
  TOPIC_TAG_OPTIONS,
} from "@/lib/phrenos-updates/types";

export {
  cleanupAbandonedRuns,
  createPendingResearchRun,
  deleteResearchRun,
  executeResearchRun,
  listResearchRuns,
  loadRunWithDetails,
  loadStoryForContent,
  repairRunDrafts,
  type TriggerType,
} from "@/lib/phrenos-updates/run-research";

export {
  generateFullDraftFromIdea,
  generateStoryContentPack,
  generateStoryFeaturedDrafts,
  generateStoryIdeasPack,
  IDEA_COUNT,
  storyContentCounts,
  storyContentIsComplete,
  storyContentSummary,
  storyHasIdeasPack,
} from "@/lib/phrenos-updates/story-content-pack";

export {
  getPublishedPostBySlug,
  listPublishedPosts,
  publishApprovedToSite,
  unpublishPost,
  type PublishResult,
} from "@/lib/phrenos-updates/publish";

export {
  ADMIN_SESSION_COOKIE,
  AdminAuthError,
  clearAdminSession,
  createAdminSession,
  isAdminAuthConfigured,
  requireAdminSession,
  verifyAdminPassword,
  verifyAdminSession,
  verifyCronOrAdmin,
  verifyCronSecret,
} from "@/lib/phrenos-updates/admin-auth";

export { errorResponse, formatApiError } from "@/lib/phrenos-updates/api-errors";

export {
  createServiceRoleClient,
  isServiceRoleConfigured,
} from "@/lib/phrenos-updates/supabase";

export {
  countWords,
  normalizePresentationHtml,
  plainTextToSummaryHtml,
  sanitizeDashes,
  sanitizeSummaryText,
  slugify,
  summaryToPlainText,
} from "@/lib/phrenos-updates/sanitize";

export {
  formatSourcePublishedDate,
  getDisplayPublishedDate,
} from "@/lib/phrenos-updates/source-dates";

export {
  hasSummaryBullets,
  summaryBulletsForDisplay,
} from "@/lib/phrenos-updates/story-summary";

export {
  BLOG_MAX_WORDS,
  BLOG_MIN_WORDS,
  BLOG_TARGET_WORDS,
  hasConversionBeats,
  hasOffVoiceMarkers,
  isPublishableFullDraft,
  LINKEDIN_MAX_WORDS,
  LINKEDIN_MIN_WORDS,
  LINKEDIN_TARGET_WORDS,
  offVoiceMarkers,
} from "@/lib/phrenos-updates/suggestion-quality";

export {
  PHRENOS_BLOG_TOV,
  PHRENOS_LINKEDIN_TOV,
  PHRENOS_VOICE_ONE_LINER,
  SOURCE_INTEGRITY_BLOCK,
} from "@/lib/phrenos-updates/prompts";
