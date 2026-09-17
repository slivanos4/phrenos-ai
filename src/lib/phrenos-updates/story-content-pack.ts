import { countWords, sanitizeEditorialText } from "@/lib/phrenos-updates/sanitize";
import {
  callAnthropic,
  callAnthropicSafe,
  extractJsonArray,
  extractJsonObject,
} from "@/lib/phrenos-updates/anthropic";
import {
  BLOG_IDEA_ANGLES,
  LINKEDIN_IDEA_ANGLES,
  LINKEDIN_VOICE_PATTERNS_BLOCK,
  PHRENOS_BLOG_TOV,
  PHRENOS_CONVERSION_FORMULA,
  PHRENOS_LINKEDIN_TOV,
  PUNCHY_OPENING_BLOCK,
  SOURCE_INTEGRITY_BLOCK,
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
{"suggestion_type":"${suggestionType}","title":"...","hook":"one-line hook","body_html":"<p>punchy 2-3 sentence note, one fact plus one implication, not a chained-facts paragraph</p>","cta":"...","hashtags":"...","image_ideas":"..."}

Rules:
- Each idea must use a different angle: ${angles}
- Rotate the editorial lens across the four ideas: Creation (what your organisation can now build or generate), Optimisation (what changes for search, planning, or workflow speed), Validity (what leaders must change for trust, verification, and governance)
- body_html is a punchy note, not a mini-essay: 2-3 short sentences, 30-70 words. Pick the single sharpest fact plus the one implication. Do not chain three or four facts together into an informational paragraph, that reads as a briefing, not a hook.
  Bad (essay-like, chains facts): "OpenAI coordinated roughly 10,000 AI agents on the Navier-Stokes Millennium Prize Problem. The agents exchanged 2.7 million messages and generated approximately 130 billion output tokens. GPT-6 Astra then spent a further 17 hours formalising and verifying the proof in Lean. Fields Medal winner Terence Tao warned that this pace of AI-driven discovery risks losing the valuable ramifications of the work along the way."
  Good (one fact, one tension): "10,000 AI agents just solved a 90-year maths problem in 88 hours. Terence Tao says the real cost is not the proof. It is everything the agents did not stop to notice along the way."
- Use only facts from story sources
- Address the reader as you or your organisation, never as an internal team
- Always use British English spelling
- Never use em-dash or en-dash characters
- image_ideas: short creative brief for a social visual only (no auto-generated image)

${PHRENOS_CONVERSION_FORMULA}

${PUNCHY_OPENING_BLOCK}
${suggestionType === "linkedin" ? `\n${LINKEDIN_VOICE_PATTERNS_BLOCK}` : ""}`;

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

type DraftAttempt =
  | { draft: GeneratedSuggestion; reason?: undefined }
  | { draft: null; reason: string };

/** Doc section 10: featured draft prompt. Returns why it failed, not just null, so callers can retry or report the real cause. */
async function attemptFeaturedDraft(
  story: GeneratedStory,
  suggestionType: SuggestionType,
  seedIdea: GeneratedSuggestion,
  retryNote?: string
): Promise<DraftAttempt> {
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
- cta must be two paragraphs: (1) punchy problem-specific provocation, (2) supporting nurture line with the logical next step. Never soft contact CTAs, and never use the words "contact us", "get in touch", "book a call", "schedule a call", "reach out", or "learn more"
- image_ideas is a creative brief for social artwork only; do not invent that an image file will be attached
- Target ${target} words (minimum ${minimum})
- ${
    suggestionType === "blog"
      ? "The blog should feel ready for phrenosai.com/ai-updates with minimal edits"
      : "The post should feel ready to publish on Sophia Livanos's LinkedIn profile with minimal edits"
  }
- Use only facts from sources. No em-dash or en-dash characters
- Always use British English spelling
- Opening must be unique to this story${
    retryNote
      ? `\n\nA previous attempt at this exact draft was rejected for this reason: ${retryNote}\nFix that specific problem and rewrite the full draft; do not repeat the same mistake.`
      : ""
  }`;

  const text = await callAnthropic(prompt, suggestionType === "blog" ? 16000 : 8000);
  const json = extractJsonObject(text);
  if (!json) return { draft: null, reason: "The model did not return a parseable draft." };

  let parsed: GeneratedSuggestion;
  try {
    parsed = JSON.parse(json) as GeneratedSuggestion;
  } catch {
    return { draft: null, reason: "The model's response was not valid JSON." };
  }

  const cleaned = cleanSuggestionFields({
    ...parsed,
    suggestion_type: suggestionType,
    is_full_draft: true,
  });
  if (!cleaned) {
    return { draft: null, reason: "The draft body was too short or too low quality after cleanup." };
  }
  if (hasOffVoiceMarkers(cleaned)) {
    return { draft: null, reason: "The draft contained off-voice language that doesn't match the Phrenos persona." };
  }
  if (hasWeakCta(cleaned)) {
    return {
      draft: null,
      reason: `The call to action was too generic ("${cleaned.cta.slice(0, 120)}"). It must sell a specific next outcome from this story, not a soft "contact us" line.`,
    };
  }
  if (hasNewsWireTitle(cleaned)) {
    return { draft: null, reason: "The title read like a plain news headline instead of a tension-driven title." };
  }
  if (isLowQualitySuggestionBody(cleaned.body_html)) {
    return { draft: null, reason: "The body content was flagged as low quality or boilerplate." };
  }
  if (!meetsLengthTarget(cleaned)) {
    return {
      draft: null,
      reason: `The draft was only ${countWords(cleaned.body_html)} words; it needs at least ${minimum}.`,
    };
  }

  // Blog drafts get a hard source fact-check pass; LinkedIn too when it is a full draft.
  const { enforceSourceVerifiedDraft } = await import("@/lib/phrenos-updates/draft-verify");
  const verified = await enforceSourceVerifiedDraft(story, cleaned);
  if (!verified) {
    return {
      draft: null,
      reason: "The fact-check pass rejected the draft: it made claims that aren't supported by the stored sources.",
    };
  }
  return { draft: verified };
}

/** Doc section 10: featured draft prompt. */
async function generateFeaturedDraft(
  story: GeneratedStory,
  suggestionType: SuggestionType,
  seedIdea: GeneratedSuggestion
): Promise<GeneratedSuggestion | null> {
  return (await attemptFeaturedDraft(story, suggestionType, seedIdea)).draft;
}

/**
 * Expand a saved idea snippet into a full blog or LinkedIn draft.
 * Retries once, telling the model exactly why the first attempt was rejected, before giving up.
 */
export async function generateFullDraftFromIdea(
  story: GeneratedStory,
  idea: GeneratedSuggestion
): Promise<DraftAttempt> {
  const first = await attemptFeaturedDraft(story, idea.suggestion_type, idea);
  if (first.draft) return first;

  console.warn(`Full draft attempt 1 failed for "${story.title}" (${idea.suggestion_type}): ${first.reason}`);
  const second = await attemptFeaturedDraft(story, idea.suggestion_type, idea, first.reason);
  if (!second.draft) {
    console.warn(`Full draft attempt 2 failed for "${story.title}" (${idea.suggestion_type}): ${second.reason}`);
  }
  return second;
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
  for (const seed of linkedinIdeas.slice(0, 3)) {
    featuredLinkedin = await generateFeaturedDraft(story, "linkedin", seed);
    if (featuredLinkedin) break;
  }

  if (!featuredLinkedin && linkedinIdeas[0]) {
    const forcedSeed: GeneratedSuggestion = {
      ...linkedinIdeas[0],
      title: linkedinIdeas[0].title || story.title,
      hook:
        linkedinIdeas[0].hook ||
        "What this week's Gen AI move means for leaders deciding what to trust, ship, and govern next.",
      body_html:
        linkedinIdeas[0].body_html ||
        "Expand into a full LinkedIn post with Why this matters now, What to do next, and a punchy story-specific CTA.",
    };
    featuredLinkedin = await generateFeaturedDraft(story, "linkedin", forcedSeed);
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

/**
 * Rewrite an existing full draft from scratch, optionally steered by a free-text instruction.
 * Reuses the same generation and quality/fact-check pipeline as a fresh idea expansion.
 */
export async function rewriteWholeDraft(
  story: GeneratedStory,
  current: GeneratedSuggestion,
  instruction?: string
): Promise<DraftAttempt> {
  const note = instruction?.trim()
    ? `The user has specifically asked for this change: "${instruction.trim()}". Apply it while keeping the piece consistent with the source facts and required structure.`
    : "Produce a genuinely different take (structure, opening, or emphasis) rather than a light paraphrase of the current draft.";

  const first = await attemptFeaturedDraft(story, current.suggestion_type, current, note);
  if (first.draft) return first;

  console.warn(`Rewrite attempt 1 failed for "${story.title}" (${current.suggestion_type}): ${first.reason}`);
  const second = await attemptFeaturedDraft(
    story,
    current.suggestion_type,
    current,
    `${note} A previous attempt was rejected for this reason: ${first.reason}. Fix that specific problem.`
  );
  if (!second.draft) {
    console.warn(`Rewrite attempt 2 failed for "${story.title}" (${current.suggestion_type}): ${second.reason}`);
  }
  return second;
}

type ResizeResult =
  | { body_html: string; cta: string; reason?: undefined }
  | { body_html: null; cta: null; reason: string };

async function attemptResize(
  story: GeneratedStory,
  current: GeneratedSuggestion,
  direction: "shorter" | "longer",
  retryNote?: string
): Promise<ResizeResult> {
  const label = labelFor(current.suggestion_type);
  const currentWords = countWords(current.body_html);
  const targetWords =
    direction === "shorter"
      ? Math.max(150, Math.round(currentWords * 0.7))
      : Math.round(currentWords * 1.3);

  const lengthInstruction =
    direction === "shorter"
      ? `Cut it to roughly ${targetWords} words (about 25-30% shorter than the current ${currentWords} words). Tighten and remove redundancy or the weakest supporting material first. Keep the "Why this matters now" and "What to do next" sections, just tighter. Do not drop any load-bearing fact, and keep the closing line.`
      : `Expand it to roughly ${targetWords} words (about 25-30% longer than the current ${currentWords} words) by developing the existing points with more depth or an additional practical implication drawn from the sources. Do not pad with repetition, generic filler, or invented facts.`;

  const prompt = `Rewrite the body of this Phrenos.ai ${label} to be ${direction === "shorter" ? "meaningfully shorter" : "meaningfully longer"}. Keep the same title, hook, argument, voice, and factual claims.

${tovFor(current.suggestion_type)}

Story:
${JSON.stringify(storyContext(story), null, 2)}

Current draft:
${JSON.stringify(
  { title: current.title, hook: current.hook, body_html: current.body_html, cta: current.cta },
  null,
  2
)}

${lengthInstruction}

Return ONLY JSON: {"body_html":"...","cta":"..."}
- Only change the cta if the new length genuinely requires a small adjustment for flow; otherwise return it unchanged.
- Preserve the existing HTML structure (<p>, <h2>, <ul><li>) already used in the draft.
- No em-dash or en-dash characters. Always use British English spelling.${
    retryNote
      ? `\n\nA previous attempt was rejected for this reason: ${retryNote}\nFix that specific problem (for example, tighten or remove the flagged claim rather than just shortening around it) while still meeting the length goal above.`
      : ""
  }`;

  const text = await callAnthropic(prompt, current.suggestion_type === "blog" ? 16000 : 8000);
  const json = extractJsonObject(text);
  if (!json) return { body_html: null, cta: null, reason: "The model did not return a parseable draft." };

  let parsed: { body_html?: string; cta?: string };
  try {
    parsed = JSON.parse(json);
  } catch {
    return { body_html: null, cta: null, reason: "The model's response was not valid JSON." };
  }
  if (!parsed.body_html) {
    return { body_html: null, cta: null, reason: "The model did not return a body." };
  }

  const merged: GeneratedSuggestion = {
    ...current,
    body_html: parsed.body_html,
    cta: parsed.cta?.trim() || current.cta,
    is_full_draft: true,
  };
  const cleaned = cleanSuggestionFields(merged);
  if (!cleaned) {
    return { body_html: null, cta: null, reason: "The resized body was too short or too low quality after cleanup." };
  }
  if (hasOffVoiceMarkers(cleaned)) {
    return { body_html: null, cta: null, reason: "The resized body contained off-voice language." };
  }
  if (hasWeakCta(cleaned)) {
    return { body_html: null, cta: null, reason: "The resized call to action was too generic." };
  }
  if (isLowQualitySuggestionBody(cleaned.body_html)) {
    return { body_html: null, cta: null, reason: "The resized body was flagged as low quality." };
  }

  const { enforceSourceVerifiedDraftWithReason } = await import("@/lib/phrenos-updates/draft-verify");
  const verified = await enforceSourceVerifiedDraftWithReason(story, cleaned);
  if (!verified.draft) {
    return { body_html: null, cta: null, reason: verified.reason };
  }
  return { body_html: verified.draft.body_html, cta: verified.draft.cta };
}

/** Rewrite a draft's body (and cta only if the length change genuinely requires it) to be meaningfully shorter or longer. Retries once on rejection. */
export async function resizeSuggestionDraft(
  story: GeneratedStory,
  current: GeneratedSuggestion,
  direction: "shorter" | "longer"
): Promise<ResizeResult> {
  const first = await attemptResize(story, current, direction);
  if (first.body_html) return first;

  console.warn(`Resize attempt 1 (${direction}) failed for "${story.title}": ${first.reason}`);
  const second = await attemptResize(story, current, direction, first.reason);
  if (!second.body_html) {
    console.warn(`Resize attempt 2 (${direction}) failed for "${story.title}": ${second.reason}`);
  }
  return second;
}

type FieldRewriteResult =
  | { value: string; reason?: undefined }
  | { value: null; reason: string };

/** Rewrite a single field of an existing draft (title, hook, cta, or body only), optionally steered by an instruction. */
export async function rewriteDraftField(
  story: GeneratedStory,
  current: GeneratedSuggestion,
  field: "title" | "hook" | "cta" | "body",
  instruction?: string
): Promise<FieldRewriteResult> {
  const label = labelFor(current.suggestion_type);
  const guidance = instruction?.trim()
    ? `Specific instruction to apply: "${instruction.trim()}"`
    : "Produce a genuinely different, stronger alternative to the current version, not a light paraphrase of it.";

  const jsonKey = field === "body" ? "body_html" : field;
  const contextFields: Record<string, unknown> = {
    title: current.title,
    hook: current.hook,
    cta: current.cta,
  };
  if (field !== "body") contextFields.body_html = current.body_html;
  else contextFields.current_word_count = countWords(current.body_html);

  const prompt = `Rewrite ONLY the ${field === "body" ? "body" : field} of this Phrenos.ai ${label}. The rest of the piece (shown below for context) stays as is; you are only producing a replacement for the "${jsonKey}" field.

${tovFor(current.suggestion_type)}

Story:
${JSON.stringify(storyContext(story), null, 2)}

Rest of the current draft, for context:
${JSON.stringify(contextFields, null, 2)}

${guidance}
${field === "body" ? "Aim for a similar overall length to the current word count shown above unless the instruction says otherwise." : ""}

Return ONLY JSON: {"${jsonKey}":"..."}`;

  const maxTokens =
    field === "body" ? (current.suggestion_type === "blog" ? 16000 : 8000) : 1200;
  const text = await callAnthropic(prompt, maxTokens);
  const json = extractJsonObject(text);
  if (!json) return { value: null, reason: "The model did not return a parseable response." };

  let parsed: Record<string, string>;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { value: null, reason: "The model's response was not valid JSON." };
  }

  const rawValue = parsed[jsonKey];
  if (!rawValue || !rawValue.trim()) {
    return { value: null, reason: "The model returned an empty value." };
  }
  const value = sanitizeEditorialText(rawValue).trim();

  if (field === "title") {
    const check = { ...current, title: value };
    if (hasOffVoiceMarkers(check)) return { value: null, reason: "The new title contained off-voice language." };
    if (hasNewsWireTitle(check)) return { value: null, reason: "The new title read like a plain news headline." };
    return { value };
  }

  if (field === "hook") {
    const check = { ...current, hook: value };
    if (hasOffVoiceMarkers(check)) return { value: null, reason: "The new hook contained off-voice language." };
    return { value };
  }

  if (field === "cta") {
    const check = { ...current, cta: value };
    if (hasOffVoiceMarkers(check)) return { value: null, reason: "The new call to action contained off-voice language." };
    if (hasWeakCta(check)) return { value: null, reason: "The new call to action was too generic." };
    return { value };
  }

  const merged: GeneratedSuggestion = { ...current, body_html: value, is_full_draft: true };
  const cleaned = cleanSuggestionFields(merged);
  if (!cleaned) return { value: null, reason: "The new body was too short or too low quality after cleanup." };
  if (hasOffVoiceMarkers(cleaned)) return { value: null, reason: "The new body contained off-voice language." };
  if (isLowQualitySuggestionBody(cleaned.body_html)) {
    return { value: null, reason: "The new body was flagged as low quality." };
  }

  const { enforceSourceVerifiedDraftWithReason } = await import("@/lib/phrenos-updates/draft-verify");
  const verified = await enforceSourceVerifiedDraftWithReason(story, cleaned);
  if (!verified.draft) return { value: null, reason: verified.reason };
  return { value: verified.draft.body_html };
}

/** Rewrite one paragraph/section of a draft's body in place, keeping the rest of the piece as context. */
export async function rewriteDraftParagraph(
  story: GeneratedStory,
  current: GeneratedSuggestion,
  paragraphHtml: string,
  instruction?: string
): Promise<FieldRewriteResult> {
  const label = labelFor(current.suggestion_type);
  const guidance = instruction?.trim()
    ? `Specific instruction to apply: "${instruction.trim()}"`
    : "Produce a genuinely different, stronger version of this section, not a light paraphrase.";

  const prompt = `Rewrite ONLY this one section of a Phrenos.ai ${label}. Keep it consistent in voice and facts with the rest of the piece (shown below for context), roughly the same length, and the same HTML tag it already uses (keep a <p> as <p>, an <h2> as <h2>, a <ul> as <ul>, etc.).

${tovFor(current.suggestion_type)}

Story:
${JSON.stringify(storyContext(story), null, 2)}

Full piece for context, only the highlighted section below changes:
${JSON.stringify(
  { title: current.title, hook: current.hook, body_html: current.body_html, cta: current.cta },
  null,
  2
)}

The section to rewrite:
${paragraphHtml}

${guidance}

Return ONLY JSON: {"html":"..."}`;

  const text = await callAnthropic(prompt, 3000);
  const json = extractJsonObject(text);
  if (!json) return { value: null, reason: "The model did not return a parseable response." };

  let parsed: { html?: string };
  try {
    parsed = JSON.parse(json);
  } catch {
    return { value: null, reason: "The model's response was not valid JSON." };
  }

  const rawValue = parsed.html;
  if (!rawValue || !rawValue.trim()) {
    return { value: null, reason: "The model returned an empty value." };
  }
  const value = sanitizeEditorialText(rawValue).trim();

  if (hasOffVoiceMarkers({ ...current, body_html: value })) {
    return { value: null, reason: "The new section contained off-voice language." };
  }
  if (isLowQualitySuggestionBody(value)) {
    return { value: null, reason: "The new section was flagged as low quality." };
  }

  // Lightweight fact-check scoped to just this paragraph's own claims, not the whole draft
  // (the full-draft checker re-flags pre-existing hook/cta issues this edit never touched).
  // Best-effort: fix what it can, never hard-reject a small edit over an unrelated part of the piece.
  const factCheckPrompt = `You are a strict fact-checker for a Phrenos.ai article paragraph.

${SOURCE_INTEGRITY_BLOCK}

Sources:
${JSON.stringify(storyContext(story).sources, null, 2)}

Paragraph:
${value}

Flag any claim (numbers, dates, names, causality, quotes) not explicitly supported by the sources.
Return ONLY JSON: {"supported": true|false, "revised": "the paragraph including its original HTML tag, e.g. <p>...</p>, with any unsupported claim removed or softened if supported is false, otherwise the same paragraph unchanged"}`;

  const openingTag = value.match(/^<(\w+)[^>]*>/)?.[1] ?? "p";

  const factCheckText = await callAnthropicSafe(factCheckPrompt, 1500);
  const factCheckJson = factCheckText ? extractJsonObject(factCheckText) : null;
  if (factCheckJson) {
    try {
      const parsed = JSON.parse(factCheckJson) as { supported?: boolean; revised?: string };
      const revisedRaw = parsed.revised?.trim();
      if (revisedRaw) {
        const revised = /^<\w+[^>]*>/.test(revisedRaw)
          ? revisedRaw
          : `<${openingTag}>${revisedRaw}</${openingTag}>`;
        return { value: sanitizeEditorialText(revised).trim() };
      }
    } catch {
      // Fall through and use the un-fact-checked value below.
    }
  }
  return { value };
}
