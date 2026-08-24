import { countWords } from "@/lib/phrenos-updates/sanitize";
import {
  callAnthropic,
  extractJsonArray,
  extractJsonObject,
} from "@/lib/phrenos-updates/anthropic";
import {
  BLOG_IDEA_ANGLES,
  LINKEDIN_IDEA_ANGLES,
  PHRENOS_BLOG_TOV,
  PHRENOS_LINKEDIN_TOV,
  SOURCE_INTEGRITY_BLOCK,
  tovDigest,
} from "@/lib/phrenos-updates/prompts";
import { sourceFactsForPrompt } from "@/lib/phrenos-updates/source-enrichment";
import {
  BLOG_MIN_WORDS,
  BLOG_TARGET_WORDS,
  cleanSuggestionFields,
  hasNewsWireTitle,
  hasOffVoiceMarkers,
  hasWeakCta,
  IDEA_MIN_WORDS,
  isLowQualitySuggestionBody,
  LINKEDIN_MIN_WORDS,
  LINKEDIN_TARGET_WORDS,
  meetsLengthTarget,
} from "@/lib/phrenos-updates/suggestion-quality";
import type {
  GeneratedStory,
  GeneratedSuggestion,
  SuggestionType,
} from "@/lib/phrenos-updates/types";

export const IDEA_COUNT = 4;

function tovFor(suggestionType: SuggestionType): string {
  return suggestionType === "blog" ? PHRENOS_BLOG_TOV : PHRENOS_LINKEDIN_TOV;
}

function labelFor(suggestionType: SuggestionType): string {
  return suggestionType === "blog" ? "blog post" : "LinkedIn post";
}

function storyContext(story: GeneratedStory) {
  return {
    title: story.title,
    summary_html: story.summary_html,
    topic_tags: story.topic_tags ?? [],
    sources: story.sources
      .filter((source) => !source.is_synthesis && source.url)
      .map((source) => ({
        url: source.url,
        title: source.title,
        published_at: source.published_at ?? null,
        facts: sourceFactsForPrompt(source),
      })),
  };
}

function parseIdea(
  raw: GeneratedSuggestion,
  suggestionType: SuggestionType
): GeneratedSuggestion | null {
  const cleaned = cleanSuggestionFields({
    ...raw,
    suggestion_type: suggestionType,
    is_full_draft: false,
  });
  if (!cleaned) return null;
  if (hasOffVoiceMarkers(cleaned)) return null;
  if (isLowQualitySuggestionBody(cleaned.body_html) && countWords(cleaned.body_html) < IDEA_MIN_WORDS) {
    return null;
  }
  return cleaned;
}

/** Doc section 10: idea generation prompt (4 snippets per format). */
async function generateIdeas(
  story: GeneratedStory,
  suggestionType: SuggestionType
): Promise<GeneratedSuggestion[]> {
  const angles = suggestionType === "blog" ? BLOG_IDEA_ANGLES : LINKEDIN_IDEA_ANGLES;

  const prompt = `You are planning ${IDEA_COUNT} distinct ${labelFor(suggestionType)} angles for Phrenos.ai (Sophia Livanos voice).

${SOURCE_INTEGRITY_BLOCK}

Story:
${JSON.stringify(storyContext(story), null, 2)}

Return ONLY a JSON array of exactly ${IDEA_COUNT} objects. These are IDEA SNIPPETS, not full posts.
Each object:
{"suggestion_type":"${suggestionType}","title":"...","hook":"one-line hook","body_html":"<p>2-3 sentence snippet describing the angle and key facts from sources</p>","cta":"...","hashtags":"...","image_ideas":"..."}

Rules:
- Each idea must use a different angle: ${angles}
- Rotate the editorial lens across the four ideas: Creation (what your organisation can now build or generate), Optimisation (what changes for search, planning, or workflow speed), Validity (what leaders must change for trust, verification, and governance)
- body_html is SHORT only (40-120 words), not a full draft
- Use only facts from story sources
- Address the reader as you or your organisation, never as an internal team
- Always use British English spelling
- Never use em-dash or en-dash characters
- Follow the Phrenos conversion formula for title, hook, and cta (tension title, concrete executive hook, primary provocation + supporting nurture line)
- image_ideas: short creative brief for a social visual only (no auto-generated image)
${tovDigest(tovFor(suggestionType), 12)}`;

  const text = await callAnthropic(prompt, suggestionType === "blog" ? 4000 : 2500);
  const json = extractJsonArray(text);
  if (!json) return [];

  try {
    const parsed = JSON.parse(json) as GeneratedSuggestion[];
    return parsed
      .map((item) => parseIdea(item, suggestionType))
      .filter((item): item is GeneratedSuggestion => item !== null)
      .slice(0, IDEA_COUNT);
  } catch {
    return [];
  }
}

/** Doc section 10: featured draft prompt. */
async function generateFeaturedDraft(
  story: GeneratedStory,
  suggestionType: SuggestionType,
  seedIdea: GeneratedSuggestion
): Promise<GeneratedSuggestion | null> {
  const target = suggestionType === "blog" ? BLOG_TARGET_WORDS : LINKEDIN_TARGET_WORDS;
  const minimum = suggestionType === "blog" ? BLOG_MIN_WORDS : LINKEDIN_MIN_WORDS;
  const label = labelFor(suggestionType);

  const prompt = `Write the strongest featured ${label} for Phrenos.ai based on this story and seed idea.

${tovFor(suggestionType)}

${SOURCE_INTEGRITY_BLOCK}

Story:
${JSON.stringify(storyContext(story), null, 2)}

Seed idea to expand:
${JSON.stringify(seedIdea, null, 2)}

Return ONLY one JSON object:
{"suggestion_type":"${suggestionType}","title":"...","hook":"...","body_html":"...","cta":"...","hashtags":"...","image_ideas":"..."}

Rules:
- Primary draft for the week: most relevant, engaging, and strategically useful for a global Phrenos audience. It must convert through title → hook → article → cta
- title must create strategic tension (not a news wire headline). Prefer "[Development]. [Consequence/question]." Aim for roughly 8-14 words
- hook must be concrete and executive-focused (what happened → what changed → why leaders should care). Do not restate the title
- cta must be two paragraphs: (1) punchy problem-specific provocation, (2) supporting nurture line with the logical next step. Never soft contact CTAs
- image_ideas is a creative brief for social artwork only; do not invent that an image file will be attached
- Target ${target} words (minimum ${minimum})
- ${
    suggestionType === "blog"
      ? "The blog should feel ready for phrenosai.com/ai-updates with minimal edits"
      : "The post should feel ready to publish on Sophia Livanos's LinkedIn profile with minimal edits"
  }
- Use only facts from sources. No em-dash or en-dash characters
- Always use British English spelling
- Opening must be unique to this story`;

  const text = await callAnthropic(prompt, suggestionType === "blog" ? 16000 : 8000);
  const json = extractJsonObject(text);
  if (!json) return null;

  try {
    const parsed = JSON.parse(json) as GeneratedSuggestion;
    const cleaned = cleanSuggestionFields({
      ...parsed,
      suggestion_type: suggestionType,
      is_full_draft: true,
    });
    if (!cleaned) return null;
    if (hasOffVoiceMarkers(cleaned)) return null;
    if (hasWeakCta(cleaned)) return null;
    if (hasNewsWireTitle(cleaned)) return null;
    if (isLowQualitySuggestionBody(cleaned.body_html)) return null;
    if (!meetsLengthTarget(cleaned)) return null;

    // Blog drafts get a hard source fact-check pass; LinkedIn too when it is a full draft.
    const { enforceSourceVerifiedDraft } = await import("@/lib/phrenos-updates/draft-verify");
    return await enforceSourceVerifiedDraft(story, cleaned);
  } catch {
    return null;
  }
}

/** Expand a saved idea snippet into a full blog or LinkedIn draft. */
export async function generateFullDraftFromIdea(
  story: GeneratedStory,
  idea: GeneratedSuggestion
): Promise<GeneratedSuggestion | null> {
  return generateFeaturedDraft(story, idea.suggestion_type, idea);
}

/** Fast pass: four blog ideas and four LinkedIn ideas (snippets only). */
export async function generateStoryIdeasPack(story: GeneratedStory): Promise<GeneratedSuggestion[]> {
  const [blogIdeas, linkedinIdeas] = await Promise.all([
    generateIdeas(story, "blog"),
    generateIdeas(story, "linkedin"),
  ]);
  return [...blogIdeas, ...linkedinIdeas];
}

/** Slow pass: one featured full blog and one featured full LinkedIn from existing ideas. */
export async function generateStoryFeaturedDrafts(
  story: GeneratedStory,
  ideas: GeneratedSuggestion[]
): Promise<GeneratedSuggestion[]> {
  const blogSeed = ideas.find((item) => item.suggestion_type === "blog");
  const linkedinSeed = ideas.find((item) => item.suggestion_type === "linkedin");
  const [featuredBlog, featuredLinkedin] = await Promise.all([
    blogSeed ? generateFeaturedDraft(story, "blog", blogSeed) : Promise.resolve(null),
    linkedinSeed ? generateFeaturedDraft(story, "linkedin", linkedinSeed) : Promise.resolve(null),
  ]);
  return [featuredBlog, featuredLinkedin].filter(
    (item): item is GeneratedSuggestion => item !== null
  );
}

/** Ideas first; featured drafts are best-effort and must not block saving ideas. */
export async function generateStoryContentPack(
  story: GeneratedStory
): Promise<GeneratedSuggestion[]> {
  const ideas = await generateStoryIdeasPack(story);
  const featured = ideas.length > 0 ? await generateStoryFeaturedDrafts(story, ideas) : [];

  const output: GeneratedSuggestion[] = [];
  const featuredBlog = featured.find((item) => item.suggestion_type === "blog");
  const featuredLinkedin = featured.find((item) => item.suggestion_type === "linkedin");

  if (featuredBlog) output.push(featuredBlog);
  output.push(...ideas.filter((item) => item.suggestion_type === "blog"));
  if (featuredLinkedin) output.push(featuredLinkedin);
  output.push(...ideas.filter((item) => item.suggestion_type === "linkedin"));

  return output;
}

/**
 * Week-hero pack: full blog + LinkedIn ideas and featured drafts for the converting story.
 */
export async function generateHeroBlogPack(
  story: GeneratedStory
): Promise<GeneratedSuggestion[]> {
  const ideas = await generateStoryIdeasPack(story);
  const blogIdeas = ideas.filter((item) => item.suggestion_type === "blog");
  const linkedinIdeas = ideas.filter((item) => item.suggestion_type === "linkedin");

  let featuredBlog: GeneratedSuggestion | null = null;
  for (const seed of blogIdeas.slice(0, 3)) {
    featuredBlog = await generateFeaturedDraft(story, "blog", seed);
    if (featuredBlog) break;
  }

  if (!featuredBlog && blogIdeas[0]) {
    const forcedSeed: GeneratedSuggestion = {
      ...blogIdeas[0],
      title: blogIdeas[0].title || story.title,
      hook:
        blogIdeas[0].hook ||
        "What this week's most consequential Gen AI move means for organisations deciding what to trust, ship, and govern next.",
      body_html:
        blogIdeas[0].body_html ||
        "Expand into a full featured blog with Why this matters now, What to do next, and a clear CTA to phrenosai.com/contact.",
    };
    featuredBlog = await generateFeaturedDraft(story, "blog", forcedSeed);
  }

  let featuredLinkedin: GeneratedSuggestion | null = null;
  for (const seed of linkedinIdeas.slice(0, 2)) {
    featuredLinkedin = await generateFeaturedDraft(story, "linkedin", seed);
    if (featuredLinkedin) break;
  }

  const output: GeneratedSuggestion[] = [];
  if (featuredBlog) output.push(featuredBlog);
  output.push(...blogIdeas);
  if (featuredLinkedin) output.push(featuredLinkedin);
  output.push(...linkedinIdeas);
  return output;
}

export function storyContentCounts(story: GeneratedStory) {
  const suggestions = story.suggestions ?? [];
  const blogs = suggestions.filter((item) => item.suggestion_type === "blog");
  const linkedins = suggestions.filter((item) => item.suggestion_type === "linkedin");
  return {
    blogIdeas: blogs.filter((item) => !item.is_full_draft).length,
    linkedinIdeas: linkedins.filter((item) => !item.is_full_draft).length,
    fullBlogs: blogs.filter((item) => item.is_full_draft).length,
    fullLinkedins: linkedins.filter((item) => item.is_full_draft).length,
  };
}

export function storyHasIdeasPack(story: GeneratedStory): boolean {
  const counts = storyContentCounts(story);
  return counts.blogIdeas >= IDEA_COUNT && counts.linkedinIdeas >= IDEA_COUNT;
}

export function storyContentIsComplete(story: GeneratedStory): boolean {
  const counts = storyContentCounts(story);
  return storyHasIdeasPack(story) && counts.fullBlogs >= 1 && counts.fullLinkedins >= 1;
}

export function storyContentSummary(story: GeneratedStory): string {
  const counts = storyContentCounts(story);
  return `${counts.fullBlogs} featured blog, ${counts.blogIdeas} blog ideas, ${counts.fullLinkedins} featured LinkedIn, ${counts.linkedinIdeas} LinkedIn ideas`;
}
