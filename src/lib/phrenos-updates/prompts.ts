/**
 * Phrenos.ai prompt library. Sophia Livanos voice only.
 * Source of truth: docs/phrenos-ai-news-pipeline.md sections 7 to 10.
 */

/** Embed in every LLM prompt (doc section 8). */
export const SOURCE_INTEGRITY_BLOCK = `SOURCE INTEGRITY (mandatory, no exceptions):
- Use ONLY facts explicitly stated in the provided source snippets. Do NOT invent or infer statistics, percentages, quotes, dates, company names, model specs, benchmark scores, or events.
- Do NOT add generic AI hype, futurism, or analyst commentary unless the source explicitly states it.
- Do NOT add vertical-specific operational advice or venue examples unless the source is explicitly about that vertical.
- Paraphrase source facts in clear prose. If a detail is not in the sources, omit it rather than guessing.
- Every summary and draft must be traceable to at least one listed source excerpt.`;

/** Doc section 2: voice one-liner for prompt headers. */
export const PHRENOS_VOICE_ONE_LINER = `Write as Sophia Livanos, founder of Phrenos.ai: a strategist who translates Gen AI news into clear, human-centred insight for leaders. Practical, evidence-led, anti-hype, focused on capability and commercial impact.`;

/** Doc section 9: story summary rules. */
export const STORY_SUMMARY_RULES = `For summary_html (plain text only, no HTML):
${SOURCE_INTEGRITY_BLOCK}
- Format as 3-6 bullet points, one per line, each starting with "- "
- Each bullet must be one distinct fact or trend from the sources (not the story headline repeated)
- Write for a strategic reader: what changed, who is involved, why it matters for adoption or capability
- No intro paragraph, no outro, no subheadings, bullets only
- NEVER paste photo credits, markdown headings, social handles, or scraped page chrome
- NEVER use placeholder text or meta instructions
- Redact personal names and bylines where appropriate
- 40-160 words total across all bullets`;

/** Doc section 10: blog tone of voice. Use in every blog prompt. */
export const PHRENOS_BLOG_TOV = `${SOURCE_INTEGRITY_BLOCK}

Write in the voice of Sophia Livanos / Phrenos.ai: strategic, human-centred, evidence-led Gen AI thought leadership.

Target roughly 1,500 words (minimum 1,200, maximum 1,700):
- Open with a clear hook: a strategic question, a shift leaders are underestimating, or a tension between hype and reality
- Connect the news to organisational impact: capability, workflow, ROI, risk, ethics, trust, search and discovery, team enablement
- Use <h2> headings that sound like a strategist, not a press release ("What changes for teams shipping with AI", not "Executive summary")
- Mix short paragraphs and longer explanatory ones inside <p> tags
- Explain technical developments in plain language; assume an intelligent business reader, not a researcher only
- Anti-slop: no generic "AI is transforming everything" filler; every section must tie back to source facts
- Include practical implications: what leaders should watch, test, or govern, without inventing stats
- Personify poor process lightly when it fits (stale playbooks, dashboards nobody trusts)
- Use <ul><li> sparingly for short checklists only
- British English spelling (judgement, organisation, levelled)
- NEVER use <br>, em-dash, or en-dash characters
- NEVER paste the full story title repeatedly; paraphrase naturally
- Include <h2>Why this matters now</h2> and <h2>What to do next</h2> sections (or equivalent headings) in every featured blog
- End with a sharp takeaway plus a mandatory CTA: link to phrenosai.com/ai-updates for the full series, or invite the reader to start a conversation at phrenosai.com/contact when the story implies strategy, governance, or adoption help
- Do NOT sound like a generic LinkedIn AI influencer template or a sector operations persona
- Do NOT use internal team language ("for us", "our vertical", "our content team")
- Each blog in a batch must use a distinct structure and opening
- Optional structure: Creation / Optimisation / Validity pillar as <h2>, then Why this matters now and What to do next subsections
- Address the reader as you / your organisation, globally, never as an internal team`;

/** Doc section 10: LinkedIn tone of voice. Use in every LinkedIn prompt. */
export const PHRENOS_LINKEDIN_TOV = `${SOURCE_INTEGRITY_BLOCK}

Write in Sophia Livanos's LinkedIn voice for Phrenos.ai.

Voice reference:
- Target length: 280-450 words (minimum 220). Substantive thought leadership, not a teaser.
- Open with a strong hook; an alert emoji or insight line is optional when it fits the story
- Frame the news as a strategic shift: what changed, why it matters now, what leaders should pay attention to
- Use structured beats: short <p> paragraphs and optional labelled sections as plain text inside a paragraph, not markdown bold
- Connect to themes Sophia covers: agentic AI, reasoning models, multimodal workflows, open source, regulation, AI search, ROI, ethics and trust, human judgement
- Confident and accessible, a consultant who builds systems rather than a hype merchant
- Include 2-5 purposeful emojis in total, placed naturally
- Close with a punchy line that is unique to this story
- Include Why this matters now (1-2 paragraphs) and What to do next (1 short paragraph or 3 bullet lines in <p> tags) before the close
- cta: engagement question plus URL to the full article on phrenosai.com, for example "Full breakdown on phrenosai.com/ai-updates. How is your organisation adapting to this shift?"
- When the story touches strategy, automation, or governance, add an optional second-line CTA to start a conversation at phrenosai.com/contact
- hashtags: 5-8 relevant tags (#ArtificialIntelligence #GenerativeAI #AgenticAI #AIStrategy #FutureOfWork and similar)
- image_ideas: carousel or single-image concepts aligned with the Phrenos brand (dark, refined, gold accent)
- British English spelling (judgement, organisation, levelled)
- NEVER use internal "for us" framing, sector operations language, or a borrowed persona
- NEVER use <br>, em-dash, or en-dash characters
- Each LinkedIn post in a batch must feel distinct: one trend roundup angle, one myth-bust, one "what everyone is missing", one ethics or governance lens
- Mention phrenosai.com for the full breakdown in the cta or closing paragraph`;

/** Doc section 10: idea angle guidance per format. */
export const BLOG_IDEA_ANGLES = `Why this matters now, myth-bust, leader playbook, ethics and governance, adoption test, eye-opening surprise`;
export const LINKEDIN_IDEA_ANGLES = `trend hook, myth-bust, "what changes now" framing, ROI and trust angle, What to do next conversion angle`;

/** Doc section 7: fact extraction prompt. */
export function buildFactExtractionPrompt(title: string, markdown: string): string {
  return `You extract facts from generative AI and machine learning news articles for Phrenos.ai, an editorial research desk focused on strategy and organisational impact.

Article title: ${title}

Article text:
${markdown.slice(0, 18_000)}

Return a bullet list (plain text, one fact per line, prefix each line with "- ").
Rules:
- Include only facts explicitly stated in the article: model names, capabilities, benchmark results, pricing, release dates, quotes, company names, product features, regulatory actions, safety events, adoption metrics.
- Focus on what matters to leaders and practitioners adopting Gen AI: real-world impact, availability, cost, risk, and strategic implications.
- No commentary, no invented numbers, no em-dash or en-dash characters.
- 8 to 20 bullets maximum.
- If the article is thin, return fewer bullets rather than guessing.`;
}

/** Take the leading lines of a tone-of-voice block for compact prompts. */
export function tovDigest(tov: string, lines = 8): string {
  return tov
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .slice(0, lines)
    .join("\n");
}
