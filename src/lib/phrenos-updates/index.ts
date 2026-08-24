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
  generateContentForStory,
  loadStoryForContent,
  repairRunDrafts,
  type TriggerType,
} from "@/lib/phrenos-updates/run-research";

export {
  AI_NEWS_DOMAINS,
  discoveryQueriesForSection,
  tavilyQueriesForSection,
} from "@/lib/phrenos-updates/research-discovery";

export { proposeClaudeDiscoverySearches } from "@/lib/phrenos-updates/claude-discovery";

export {
  enforceSourceVerifiedDraft,
  verifyDraftAgainstSources,
} from "@/lib/phrenos-updates/draft-verify";

export {
  generateFullDraftFromIdea,
  generateHeroBlogPack,
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
  generateWeekHeroContent,
} from "@/lib/phrenos-updates/week-hero";

export {
  hasFeaturedBlogDraft,
  isWeekHeroStory,
  WEEK_HERO_TAG,
} from "@/lib/phrenos-updates/week-hero-shared";

export {
  getPublishedPostBySlug,
  listPublishedPosts,
  publishApprovedToSite,
  publishSuggestionToSite,
  unpublishPost,
  type PublishResult,
} from "@/lib/phrenos-updates/publish";

export {
  isValidVisitorKey,
  submitPostFeedback,
  type PostReaction,
} from "@/lib/phrenos-updates/post-feedback";

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
  LOOKBACK_DAYS,
  MAX_SOURCE_AGE_DAYS,
  textClaimsDateOutsideLookback,
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
  hasNewsWireTitle,
  hasOffVoiceMarkers,
  hasWeakCta,
  isPublishableFullDraft,
  LINKEDIN_MAX_WORDS,
  LINKEDIN_MIN_WORDS,
  LINKEDIN_TARGET_WORDS,
  offVoiceMarkers,
} from "@/lib/phrenos-updates/suggestion-quality";

export {
  PHRENOS_BLOG_TOV,
  PHRENOS_CONVERSION_FORMULA,
  PHRENOS_LINKEDIN_TOV,
  PHRENOS_VOICE_ONE_LINER,
  SOURCE_INTEGRITY_BLOCK,
} from "@/lib/phrenos-updates/prompts";
