export type ResearchRunStatus = "pending" | "running" | "completed" | "failed";
export type ResearchSection = "models_research" | "products_industry";
export type SuggestionType = "blog" | "linkedin";
export type SuggestionStatus = "draft" | "approved" | "rejected" | "published";

export type GeneratedSource = {
  url: string;
  title: string;
  excerpt: string;
  is_synthesis: boolean;
  published_at?: string | null;
  extracted_facts?: string | null;
};

export type GeneratedSuggestion = {
  suggestion_type: SuggestionType;
  title: string;
  hook: string;
  body_html: string;
  cta: string;
  hashtags: string;
  image_ideas: string;
  is_full_draft?: boolean;
};

export type GeneratedStory = {
  section: ResearchSection;
  title: string;
  summary_html: string;
  topic_tags: string[];
  sources: GeneratedSource[];
  suggestions: GeneratedSuggestion[];
};

export type ResearchSource = {
  id: string;
  story_id: string;
  url: string;
  title: string;
  accessed_at: string;
  published_at: string | null;
  snapshot_excerpt: string | null;
  extracted_facts: string | null;
  is_synthesis: boolean;
  sort_order: number;
};

export type ContentSuggestion = {
  id: string;
  story_id: string;
  suggestion_type: SuggestionType;
  status: SuggestionStatus;
  title: string;
  hook: string;
  body_html: string;
  cta: string;
  hashtags: string;
  image_ideas: string;
  sort_order: number;
  is_full_draft: boolean;
};

export type ResearchStory = {
  id: string;
  run_id: string;
  section: ResearchSection;
  title: string;
  summary_html: string;
  topic_tags: string[];
  sort_order: number;
  sources: ResearchSource[];
  suggestions: ContentSuggestion[];
};

export type ResearchRun = {
  id: string;
  status: ResearchRunStatus;
  trigger_type: string;
  lookback_start: string | null;
  lookback_end: string | null;
  error_message: string | null;
  retry_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  stories?: ResearchStory[];
};

export type PublishedPost = {
  id: string;
  suggestion_id: string | null;
  story_id: string | null;
  title: string;
  slug: string;
  hook: string;
  summary_html: string;
  body_html: string;
  cta: string;
  published_at: string;
  created_at: string;
};

/** Editorial lenses from the pipeline doc: rotate across a batch. */
export const CONTENT_LENSES = ["creation", "optimisation", "validity"] as const;
export type ContentLens = (typeof CONTENT_LENSES)[number];

export const MAX_STORIES_PER_SECTION = 3;

export const SECTION_LABELS: Record<ResearchSection, string> = {
  models_research: "Models, benchmarks & research",
  products_industry: "Products, features & industry",
};

export const TOPIC_TAG_OPTIONS = [
  "models",
  "open-source",
  "enterprise",
  "regulation",
  "safety",
  "research",
  "agentic",
  "multimodal",
  "developer-tools",
  "consumer",
  "infrastructure",
  "eye-opening",
] as const;
