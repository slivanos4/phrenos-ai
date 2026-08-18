# Phrenos.ai — Weekly Gen AI news pipeline

Complete instructions for building and operating the **Phrenos AI Updates** weekly research automation for [phrenosai.com](https://phrenosai.com).

**Public destination:** `/ai-updates` (currently “Coming soon”)  
**Reference architecture:** Hospitality Nerd weekly pipeline (`hospitality-nerd-app/docs/hospitality-ai-news-pipeline.md`) — **clone the mechanics, not the voice.**

---

## 1. Mission

Each week, automatically:

1. **Discover** recent, verifiable Gen AI news (models, capabilities, product launches, features, research, regulation, enterprise adoption, eye-opening shifts)
2. **Read** full articles and extract factual bullet points
3. **Curate** six editorial stories with source-backed summaries
4. **Generate** blog and LinkedIn content in **Sophia Livanos / Phrenos.ai voice**
5. **Publish** approved content to the Phrenos site and support LinkedIn promotion
6. **Convert** readers into conversations: full articles on phrenosai.com, LinkedIn engagement, and **Start a Conversation** (`/contact`)

This is **thought leadership for a global audience of leaders and practitioners**, not hospitality ops content and **not** the Spyros Melcher / Hospitality Nerd voice. Every public asset must earn attention **and** move a qualified reader one step closer to working with Phrenos.ai.

---

## 2. Brand & voice (mandatory)

### Phrenos.ai positioning

From the site and about page:

- **Tagline:** AI Strategy, Automation & Innovation
- **Headline:** *The Mind in the Machine.*
- **Core belief:** Technology changes quickly; curiosity, critical thinking and good judgement never go out of style.
- **Promise:** Help businesses turn Generative AI, data and automation into **measurable impact**.
- **Philosophy:** The best use of AI does not replace expertise, creativity or human judgement — it **amplifies** them.
- **Anti-slop stance:** AI is not the problem; poor thinking is. Separate **signal from noise**. Make AI approachable, practical and meaningful.
- **Audience:** Leaders, strategists, marketing and content leaders, and operators adopting AI — **global**, not team-internal. Write to *you/your organisation*, never *we/our team* unless quoting a source.
- **Primary conversion goal:** Reader clicks through to the full article, follows on LinkedIn, or **starts a conversation** at [phrenosai.com/contact](https://phrenosai.com/contact).

### Conversion framework (every story, every format)

Each draft must include **three reader-facing beats** after the hook:

| Beat | Label in copy (use one; rotate across the batch) | Purpose |
|------|--------------------------------------------------|---------|
| 1 | **Why this matters now** | Global strategic stakes: capability, risk, revenue, trust, or competitive edge — tied to source facts |
| 2 | **What changes in practice** | Concrete shift for teams shipping, governing, or investing in Gen AI (no vague “stay tuned”) |
| 3 | **What to do next** | 1–3 verifiable actions the reader can take this week (audit, pilot, policy check, tool evaluation) |

**CTA hierarchy (mandatory on featured drafts):**

1. **Primary:** Link or line pointing to full analysis on `phrenosai.com/ai-updates` *or* **Start a conversation** → `/contact`
2. **LinkedIn primary:** Engagement question + link to full post on phrenosai.com
3. **Never:** Internal-only framing (“for our vertical”, “our travel team”, “what this means for us”)

**Banned internal phrases** — replace globally:

| Never write | Write instead |
|-------------|---------------|
| What this means for us | **Why this matters now** / **What this means for your organisation** |
| For our team / our vertical | **For leaders** / **For teams adopting Gen AI** |
| We should / we need to | **Your organisation can** / **Leaders should** |
| Try this internally | **A practical next step:** |

### Sophia Livanos voice (LinkedIn & long-form)

Observed patterns from published LinkedIn posts and site copy:

| Do | Don't |
|----|-------|
| Open with a sharp hook (urgency + insight): *“AI has levelled up in 2025. Are you keeping up?”* | Open with ops banter, quoted rota drama, or “Well... maybe.” sarcasm |
| Frame news as **strategic shifts** (agentic AI, reasoning models, multimodal, open source, regulation) | Frame news as covers, rotas, RevPAR, or venue dashboards |
| Use structured sections: emoji + bold label + 1–2 sentences per trend | Write eight identical myth-bust blog templates |
| Connect tech to **business outcomes**: ROI, search/SEO, ethics, trust, workflow, capability | Generic “AI is amazing” hype or VC buzzwords |
| Confident, authoritative, accessible — consultant who has built 40+ GPTs and agentic workflows | Corporate jargon or press-release tone |
| Punchy closers: *“AI isn’t the future. It’s the foundation.”* | Hospitality Nerd closers (“wet Tuesday in November”) |
| End LinkedIn with **engagement question** + link to full article on phrenosai.com; optional soft CTA to `/contact` when the story fits consultancy | End with inside-baseball hospitality hashtags or team-only closers |
| Every featured piece includes **Why this matters now** + **What to do next** + clear CTA | Informational posts that stop at news recap with no reader action |
| British English: judgement, organisation, levelled | American spellings unless quoting a source |
| Strategic emojis in LinkedIn (🚨 🔍 🔥 🚀) — purposeful, not cluttered | Emoji spam or meme tone |
| Name real products/models **when sources confirm them** (Operator, Claude, Gemini, o1, LLaMA, Mistral, EU AI Act) | Invent specs, dates, or benchmark numbers |

### Voice one-liner for prompts

> Write as **Sophia Livanos**, founder of Phrenos.ai: a strategist who translates Gen AI news into clear, human-centred insight for leaders — practical, evidence-led, anti-hype, focused on capability and commercial impact.

### Explicit exclusions (Hospitality Nerd patterns — never use)

- Spyros Melcher persona, hospitality ops analytics voice
- “THE ROTA IS WRONG!”, pre-service briefings, WhatsApp group scenes
- covers, rota, RevPAR, day-part, GP, upsell attach (unless a source is explicitly about hospitality AI)
- “Well... maybe.” / “But also, maybe not at all.” as default openers
- `#HospitalityNerd`, `#UKHospitality`, `#Ops`

### Voice registers (two outputs, same facts)

Sophia uses **two related registers**. The pipeline must support both; default featured drafts use **Public Phrenos** unless the user selects briefing mode.

| Register | Where | Tone |
|----------|-------|------|
| **Public Phrenos** | phrenosai.com `/ai-updates`, LinkedIn | Refined strategist: hooks, punchy closers, anti-hype, British English |
| **Weekly briefing** | Optional email / subscriber digest export | Warm, energetic, globally addressed (*you/your organisation*): playful yet professional, structured pillars, conversion close to phrenosai.com |

**Source document:** `~/Library/Mobile Documents/com~apple~CloudDocs/email update.docx` (internal AI landscape briefing + quick-start prompts). Use as the briefing-register reference, not verbatim product names/dates unless that week’s sources confirm them.

### Weekly briefing structure (from email update.docx)

When generating a **weekly digest** (optional export that rolls up all six stories), use this scaffold:

1. **Opener** — Landscape velocity + why this week matters for how **organisations** create, optimise, and validate work with AI. Address the reader directly (*you*). Public site: skip “Hey hey!!”; newsletter may use a warmer opener.
2. **Numbered pillars** — Group stories under three headings (map each story to the best fit):
   - **1. Creation** — Native drafting, integrations, multimodal generation, agentic write actions, content tooling in Docs/Chat/workspace apps
   - **2. Optimisation** — AI search, reasoning/planning modes, multimodal context, discoverability, structural planning before drafting
   - **3. Validity & fact-checking** — Hallucination reduction, multimodal verification, cross-source checks, governance, human review responsibility
3. **Bullets per item** — `• Product/feature name:` one sentence on what changed (**only if the source states it**; optional “As of [date]” when publish date is verified). Then two short lines:
   - **Why this matters now:** one sentence, global strategic implication for the reader’s organisation
   - **What to do next:** one concrete action the reader can take this week (pilot, audit, policy review, tool test)
4. **Reader actions** — 2–3 prioritised recommendations tied to source facts (not a generic wish list).
5. **Close + convert** — Encouraging sign-off + single CTA: *Read the full breakdown on phrenosai.com/ai-updates* or *Start a conversation* → `/contact`. Newsletter may add light emoji (🌟) sparingly; always end with a link.

**Briefing rules inherited from the doc:**

- **Be specific** — audience, role, and problem in every prompt and every implication line.
- **Iterate** — first draft is not final; admin edits in UI before approve.
- **Fact-check** — even “more accurate” models can err; always trace claims to `extracted_facts`; never copy benchmark percentages (e.g. “18% fewer errors”) unless the source states them.
- **Information gain** — prefer angles that add structure, gaps, or verification steps over repeating press releases.

### Three content angles (tag stories during curation)

When curating or drafting, classify each story with one primary lens (store in `topic_tags` or internal metadata):

| Lens | Question the draft answers |
|------|----------------------------|
| **Creation** | What can **your organisation** now build, draft, or generate in-flow? |
| **Optimisation** | What changes for search, discovery, planning, or workflow speed **for teams like yours**? |
| **Validity** | What must **leaders** change for trust, verification, accuracy, or governance? |

Featured blog ideas should rotate across these three lenses across the batch so the week’s content is not six identical “launch announcement” posts.

---

## 3. Weekly batch shape

### Six stories per run

| Section | Count | Coverage |
|---------|-------|----------|
| `models_research` | 3 | New models, benchmarks, reasoning/multimodal advances, open weights, research with real-world impact, capability surprises |
| `products_industry` | 3 | Product launches, features, pricing, integrations, agentic tools, enterprise adoption, regulation, safety incidents, eye-opening industry moves |

### Per story

- Title (specific, editorial — not the raw article headline)
- `summary_html`: 3–6 bullet points, plain text, source-backed
- `topic_tags`: e.g. `models`, `open-source`, `enterprise`, `regulation`, `safety`, `research`, `agentic`, `multimodal`, `developer-tools`, `consumer`, `infrastructure`, `eye-opening`
- **All relevant verified sources** attached (URL, title, `published_at`, excerpt, `extracted_facts`)

### Per story content pack

| Output | Count | `is_full_draft` |
|--------|-------|-----------------|
| Blog ideas | 4 | `false` |
| Featured blog | 1 | `true` |
| LinkedIn ideas | 4 | `false` |
| Featured LinkedIn | 1 | `true` |

**Word targets**

- Featured blog: **1,200–1,500** words (min 1,200, max 1,700)
- Featured LinkedIn: **280–450** words (min 220)
- Idea snippets: **40–120** words in `body_html`

**House rules**

- Facts **only** from stored sources
- **No em-dash (—) or en-dash (–)** in any output (sanitize automatically)
- Human review before publish (approve / reject workflow)

---

## 4. Tech stack

| Role | Service |
|------|---------|
| Search / discovery | **Tavily** |
| Full-page read | **Firecrawl** |
| Curation + writing | **Anthropic Claude** (default `claude-sonnet-4-6`) |
| Storage | **Supabase** |
| Hosting | **Vercel** (background jobs via `after()`) |

### Environment variables

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
TAVILY_API_KEY=
FIRECRAWL_API_KEY=          # recommended
CRON_SECRET=                # weekly cron
ANTHROPIC_MODEL=            # optional
```

Add to Vercel Production and `.env.local` for `phrenos-ai`. Redeploy after changes.

---

## 5. Pipeline diagram

```
Trigger: Run new week / Re-run / Sunday cron
    │
    ├─► Tavily — models & research queries
    ├─► Tavily — products & industry queries
    │
    ├─► Firecrawl scrape (≤16 URLs per section, concurrency 3)
    ├─► Claude fact extraction → extracted_facts
    │
    ├─► Claude curate 3 + 3 stories (summaries only)
    ├─► Verify URLs, resolve dates, attach all relevant sources
    ├─► Save run → stories → sources
    │
    └─► Content (manual “Generate content” — one story per API call)
         4+4 idea snippets → 1+1 featured drafts
         Review → Approve → Publish to /ai-updates
```

Research usually finishes in a few minutes. Content generation runs **one story per request** to avoid serverless timeouts.

---

## 6. Step 1 — Tavily discovery

### API

```json
POST https://api.tavily.com/search
{
  "api_key": "...",
  "query": "...",
  "search_depth": "advanced",
  "max_results": 10,
  "days": 14,
  "include_answer": false
}
```

### Primary queries

**Models & research (`models_research`):**
```
generative AI new model release benchmark LLM reasoning multimodal research {lookbackEnd}
```

**Products & industry (`products_industry`):**
```
generative AI product launch feature agentic AI OpenAI Anthropic Google enterprise {lookbackEnd}
```

### Fallback queries

```
LLM open source weights Mistral LLaMA benchmark {lookbackEnd}
```

```
AI regulation EU AI Act enterprise adoption generative AI news {lookbackEnd}
```

### URL rules

- Specific article URLs only (slug or date in path)
- Reject social post URLs (X, Instagram, Facebook, TikTok, LinkedIn posts)
- Prefer: official company blogs, The Verge, Ars Technica, TechCrunch, Wired, MIT Technology Review, Reuters tech, Hugging Face blog, reputable research coverage
- Reject: rumour aggregators, SEO spam, bare homepages
- Deduplicate by normalized URL
- Filter publish dates to lookback window (allow up to 14 days before `lookbackEnd`)

---

## 7. Step 2 — Firecrawl + fact extraction

### Scrape

```
POST https://api.firecrawl.dev/v1/scrape
Authorization: Bearer {FIRECRAWL_API_KEY}
{
  "url": "...",
  "formats": ["markdown", "html"],
  "onlyMainContent": true,
  "timeout": 30000
}
```

Limits: **16 URLs per section**, concurrency **3**. If Firecrawl is missing, fall back to Tavily snippets.

### Fact extraction prompt

```
You extract facts from generative AI and machine learning news articles for Phrenos.ai, an editorial research desk focused on strategy and organisational impact.

Article title: {title}

Article text:
{markdown up to 18,000 chars}

Return a bullet list (plain text, one fact per line, prefix each line with "- ").
Rules:
- Include only facts explicitly stated in the article: model names, capabilities, benchmark results, pricing, release dates, quotes, company names, product features, regulatory actions, safety events, adoption metrics.
- Focus on what matters to leaders and practitioners adopting Gen AI: real-world impact, availability, cost, risk, and strategic implications.
- No commentary, no invented numbers, no em-dash or en-dash characters.
- 8 to 20 bullets maximum.
- If the article is thin, return fewer bullets rather than guessing.
```

Store as `extracted_facts`. Use first 4 bullets for `snapshot_excerpt`.

---

## 8. Source integrity block (embed in every LLM prompt)

```
SOURCE INTEGRITY (mandatory, no exceptions):
- Use ONLY facts explicitly stated in the provided source snippets. Do NOT invent or infer statistics, percentages, quotes, dates, company names, model specs, benchmark scores, or events.
- Do NOT add generic AI hype, futurism, or analyst commentary unless the source explicitly states it.
- Do NOT add hospitality operations advice or venue-specific examples unless the source is explicitly about hospitality.
- Paraphrase source facts in clear prose. If a detail is not in the sources, omit it rather than guessing.
- Every summary and draft must be traceable to at least one listed source excerpt.
```

---

## 9. Step 3 — Story curation (Anthropic)

Run once per section. **`summariesOnly: true`** — no blog/LinkedIn in this step.

### Story generation prompt

```
You are a generative AI industry research analyst for Phrenos.ai (phrenosai.com), founded by Sophia Livanos. Your readers are leaders, strategists, and practitioners who need signal, not hype.

Period: {lookbackStart} to {lookbackEnd}.
Section: {SECTION_LABEL}

{SOURCE_INTEGRITY_BLOCK}

Generate exactly 3 distinct news stories as JSON array from the articles below. Each story must cover a different article or trend. Prioritise stories that are strategically significant, surprising, or eye-opening when the sources support that.

Each story needs:
- title (string): specific editorial headline reflecting the trend
- summary_html (plain text only)
{STORY_SUMMARY_RULES}
- topic_tags (array: include relevant tags from models, open-source, enterprise, regulation, safety, research, agentic, multimodal, developer-tools, consumer, infrastructure, eye-opening)
- sources (array: include ALL relevant verified articles from the list that support this story, each as {url, title, excerpt, published_at, is_synthesis})
  CRITICAL source rules:
  * Each source MUST be a specific article from the "Web articles found" list below
  * Copy the exact url, title, and published_at from that list. Do NOT invent URLs or dates
  * published_at must fall within the research period ({lookbackStart} to {lookbackEnd}) or at most 14 days before {lookbackEnd}
  * NEVER use homepage, section index, or domain-root links
  * NEVER use Instagram, Facebook, Twitter/X, TikTok, or other social post URLs
  * Use is_synthesis:true ONLY when no listed article supports a minor point; max one synthesis source per story
  * excerpt should quote or paraphrase the listed article snippet
  * Never use em-dash (—) or en-dash (–) in source titles or excerpts

Web articles found:
{JSON array of up to 12 sources}

Return ONLY valid JSON array, no markdown fences or commentary.
```

**Section labels**

- `models_research` → `"Models, benchmarks & research"`
- `products_industry` → `"Products, features & industry"`

### Story summary rules (`STORY_SUMMARY_RULES`)

```
For summary_html (plain text only, no HTML):
{SOURCE_INTEGRITY_BLOCK}
- Format as 3-6 bullet points, one per line, each starting with "- "
- Each bullet must be one distinct fact or trend from the sources (not the story headline repeated)
- Write for a strategic reader: what changed, who is involved, why it matters for adoption or capability
- No intro paragraph, no outro, no subheadings, bullets only
- NEVER paste photo credits, markdown headings, social handles, or scraped page chrome
- NEVER use placeholder text or meta instructions
- Redact personal names and bylines where appropriate
- 40-160 words total across all bullets
```

### Post-processing

- Verify URLs (drop 404s)
- Resolve publish dates from metadata/HTML
- Attach all relevant sources from pool
- Polish summaries from `extracted_facts` if excerpts contain cookie junk
- Optional per-story Tavily top-up: `"{story.title}" generative AI LLM {lookbackStart} {lookbackEnd}`

---

## 10. Step 4 — Content pack generation

### Blog TOV (`PHRENOS_BLOG_TOV`) — use in all blog prompts

```
{SOURCE_INTEGRITY_BLOCK}

Write in the voice of Sophia Livanos / Phrenos.ai: strategic, human-centred, evidence-led Gen AI thought leadership.

Target roughly 1,500 words (minimum 1,200, maximum 1,700):
- Open with a clear hook: a strategic question, a shift leaders are underestimating, or a tension between hype and reality
- Connect the news to organisational impact: capability, workflow, ROI, risk, ethics, trust, search/discovery, team enablement
- Use <h2> headings that sound like a strategist, not a press release ("What changes for teams shipping with AI", not "Executive summary")
- Mix short paragraphs and longer explanatory ones inside <p> tags
- Explain technical developments in plain language; assume an intelligent business reader, not a researcher only
- Anti-slop: no generic "AI is transforming everything" filler; every section must tie back to source facts
- Include practical implications: what leaders should watch, test, or govern — without inventing stats
- Personify poor process lightly when it fits (stale playbooks, dashboards nobody trusts) — not hospitality floor scenes
- Use <ul><li> sparingly for short checklists only
- British English spelling (judgement, organisation, levelled)
- NEVER use <br>, em-dash (—), or en-dash (–)
- NEVER paste the full story title repeatedly; paraphrase naturally
- Include `<h2>Why this matters now</h2>` and `<h2>What to do next</h2>` sections (or equivalent headings) in every featured blog
- End with a sharp takeaway + **mandatory CTA**: link to phrenosai.com/ai-updates for the full series, or invite the reader to **start a conversation** at phrenosai.com/contact when the story implies strategy, governance, or adoption help
- Do NOT sound like Spyros Melcher, Hospitality Nerd, or generic LinkedIn AI influencer templates
- Do NOT use internal team language (“for us”, “our vertical”, “our content team”)
- Each blog in a batch must use a distinct structure and opening
- Optional structure (briefing-derived): Creation / Optimisation / Validity pillar as `<h2>`, then **Why this matters now** and **What to do next** subsections
- Tone may be **playful yet professional** on newsletter/briefing exports; public site stays refined
- For strategic guides: outline first (information gain over top-ranking fluff), then draft — see Appendix A prompt 4
```

### LinkedIn TOV (`PHRENOS_LINKEDIN_TOV`) — use in all LinkedIn prompts

```
{SOURCE_INTEGRITY_BLOCK}

Write in Sophia Livanos's LinkedIn voice for Phrenos.ai.

Voice reference:
- Target length: 280-450 words (minimum 220). Substantive thought leadership, not a teaser.
- Open with a strong hook; emoji alert (🚨) or insight line optional when it fits the story
- Frame the news as a strategic shift: what changed, why it matters now, what leaders should pay attention to
- Use structured beats: short <p> paragraphs and/or labelled sections (e.g. "🔥 Agentic AI is moving from assist to act" as plain text in a paragraph, not markdown bold in HTML)
- Connect to themes Sophia covers: agentic AI, reasoning models, multimodal workflows, open source, regulation, AI search, ROI, ethics and trust, human judgement
- Confident and accessible — consultant who builds systems, not a hype merchant
- Include 2-5 purposeful emojis total (🚨 🔍 🔥 🚀 👉) placed naturally
- Close with a punchy line ("AI isn't the future. It's the foundation." style — but unique to this story)
- Include **Why this matters now** (1-2 paragraphs) and **What to do next** (1 short paragraph or 3 bullet lines in `<p>` tags) before the close
- cta: engagement question + URL to full article on phrenosai.com (e.g. "Full breakdown on phrenosai.com/ai-updates — how is your organisation adapting to this shift?")
- When the story touches strategy, automation, or governance: optional second-line CTA to start a conversation at phrenosai.com/contact
- hashtags: 5-8 relevant tags (#ArtificialIntelligence #GenerativeAI #AgenticAI #AIStrategy #FutureOfWork etc.)
- image_ideas: carousel or single-image concepts aligned with Phrenos brand (dark, refined, gold accent if visual)
- NEVER use hospitality ops language, Spyros voice, internal “for us” framing, or "Well... maybe." tropes
- NEVER use <br>, em-dash (—), or en-dash (–)
- Each LinkedIn post in a batch must feel distinct: e.g. one trend roundup angle, one myth-bust, one "what everyone is missing", one ethics/governance lens
- Mention phrenosai.com for the full breakdown when appropriate in cta or closing paragraph
```

### Idea generation prompt (4 blog or 4 LinkedIn snippets)

```
You are planning 4 distinct {blog post|LinkedIn post} angles for Phrenos.ai (Sophia Livanos voice).

{SOURCE_INTEGRITY_BLOCK}

Story:
{JSON story context with title, summary_html, sources with facts}

Return ONLY a JSON array of exactly 4 objects. These are IDEA SNIPPETS, not full posts.
Each object:
{"suggestion_type":"{blog|linkedin}","title":"...","hook":"one-line hook","body_html":"<p>2-3 sentence snippet describing the angle and key facts from sources</p>","cta":"...","hashtags":"...","image_ideas":"..."}

Rules:
- Each idea must use a different angle:
  Blog: Why this matters now, myth-bust, leader playbook, ethics/governance, adoption test, eye-opening surprise
  LinkedIn: trend hook, myth-bust, "what changes in 2025" framing, ROI/trust angle, What to do next (conversion angle)
- body_html is SHORT only (40-120 words), not a full draft
- Use only facts from story sources
- Never use em-dash or en-dash characters
- {PHRENOS_BLOG_TOV or PHRENOS_LINKEDIN_TOV — first 8 lines}
```

### Featured draft prompt

```
Write the strongest featured {blog post|LinkedIn post} for Phrenos.ai based on this story and seed idea.

{PHRENOS_BLOG_TOV or PHRENOS_LINKEDIN_TOV}

{SOURCE_INTEGRITY_BLOCK}

Story:
{JSON story context}

Seed idea to expand:
{JSON seed idea}

Return ONLY one JSON object:
{"suggestion_type":"{blog|linkedin}","title":"...","hook":"...","body_html":"...","cta":"...","hashtags":"...","image_ideas":"..."}

Rules:
- Primary draft for the week: most relevant, engaging, strategically useful for a global Phrenos audience; must convert (CTA + Why this matters now + What to do next)
- Target {1500|360} words (minimum {1200|220})
- Featured LinkedIn should feel ready to post on Sophia Livanos's profile with minimal edits
- Featured blog should feel ready for phrenosai.com/ai-updates with minimal edits
- Use only facts from sources. No em-dash or en-dash characters
- Opening must be unique to this story
```

### Expand idea → full draft

Same as featured draft prompt; input is the saved idea row.

### Generation order

1. Parallel: 4 blog ideas + 4 LinkedIn ideas → save immediately
2. Best-effort: 1 featured blog + 1 featured LinkedIn from best seeds
3. Repair loop: one story per `POST .../repair-drafts` until all stories have complete packs

---

## 11. Database schema

Create parallel tables (prefix `phrenos_` or `genai_` — pick one and stay consistent):

| Table | Key fields |
|-------|------------|
| `phrenos_research_runs` | status, lookback_start, lookback_end, error_message, started_at, completed_at |
| `phrenos_research_stories` | run_id, section, title, summary_html, topic_tags, sort_order |
| `phrenos_research_sources` | story_id, url, title, published_at, snapshot_excerpt, extracted_facts, is_synthesis |
| `phrenos_content_suggestions` | story_id, suggestion_type, title, hook, body_html, cta, hashtags, image_ideas, is_full_draft, status |

Migration must include `extracted_facts` (text) and `is_full_draft` (boolean) on suggestions.

---

## 12. API routes (implement in `phrenos-ai`)

Mirror hospitality-updates paths under a new namespace:

| Method | Route |
|--------|-------|
| GET | `/api/phrenos-updates/runs` |
| POST | `/api/phrenos-updates/runs` |
| GET | `/api/phrenos-updates/runs/[id]` |
| DELETE | `/api/phrenos-updates/runs/[id]` |
| POST | `/api/phrenos-updates/runs/[id]/rerun` |
| POST | `/api/phrenos-updates/runs/[id]/repair-drafts` |
| PATCH | `/api/phrenos-updates/stories/[id]` |
| PATCH | `/api/phrenos-updates/suggestions/[id]` |
| POST | `/api/phrenos-updates/suggestions/[id]/generate` |
| POST | `/api/phrenos-updates/publish` (optional: push approved posts to `/ai-updates`) |
| GET | `/api/phrenos-updates/cron` |

- `maxDuration`: 300 on run/repair routes
- Background research via Next.js `after()`
- Auth: admin session for Sophia (or shared platform admin pattern)

---

## 13. Admin UI

**Route:** `/admin/ai-updates` or protected section in `phrenos-ai` (not public until approved).

### Controls

- Run new week
- Re-run this week
- **Generate content** (manual — do not auto-run on page load)
- Week picker + status badge
- Per story: expandable sources, idea cards, Generate blog/LinkedIn, Approve/Reject
- Export Word (.docx) optional

### Progress UI copy (no vendor names)

**Research (while `status === running`):**

1. Find recent headlines — Scanning Gen AI trade press and official announcements from the last two weeks
2. Read full articles — Pulling complete article text from verified publisher links
3. Extract source facts — Building fact lists with publish dates for every relevant source
4. Curate six stories — Grouping sources into stories with factual bullet summaries

**Content (only after user clicks Generate content):**

1. Review story sources
2. Draft post ideas (4 blog + 4 LinkedIn angles per story)
3. Write featured posts
4. Save to your batch

**Rules:** one banner at a time; cancel content generation if research starts.

---

## 14. Publishing to phrenosai.com

Replace the “Coming soon” block on `/ai-updates` with:

- List of **approved** featured blogs (title, summary bullets, date, link to full post)
- Optional: “Read on LinkedIn” link for approved featured LinkedIn posts
- SEO metadata per post: title, description from summary bullets

Featured blogs use Phrenos site styling (forest/gold/ivory palette, refined typography — match existing `PageHero` and section patterns).

---

## 15. Automation

```
GET /api/phrenos-updates/cron
Authorization: Bearer {CRON_SECRET}
```

Schedule: **Sunday morning** (same cadence as Hospitality Nerd).

After cron completes research, **do not** auto-generate content. Notify admin (email or Slack optional) that the batch is ready for review and content generation.

---

## 16. Quality gates

### Reject summaries if

- Fewer than 2 bullets
- Cookie consent / page chrome text
- Headline-only duplicate of title
- Placeholder or meta-instruction text

### Reject drafts if

- Below word minimum
- Generic AI slop / hospitality template markers / Spyros voice markers
- Facts not traceable to sources

### Always sanitize

- Remove em-dash and en-dash characters

---

## 17. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| No URLs from Tavily | Invalid `TAVILY_API_KEY` | Set env, redeploy, re-run |
| No fact bullets | Missing Firecrawl key or migration | Add key, run migration, re-run |
| Stories but no ideas | Content not triggered or Anthropic billing | Click Generate content; check credits |
| Wrong voice in drafts | Hospitality prompts reused | Enforce `PHRENOS_*_TOV` prompts only |
| Stuck “In progress” | Background job died | Wait 12 min for stale fail; re-run |

---

## 18. Reference files (read-only)

Clone patterns from **hospitality-nerd-app**, not copy voice strings:

| Area | Path |
|------|------|
| Pipeline overview | `docs/hospitality-ai-news-pipeline.md` |
| Research orchestration | `src/lib/hospitality-updates/run-research.ts` |
| Tavily + curation | `src/lib/hospitality-updates/research-agent.ts` |
| Firecrawl | `src/lib/hospitality-updates/firecrawl-extract.ts` |
| Content pack | `src/lib/hospitality-updates/story-content-pack.ts` |
| Dashboard UI | `src/components/dashboard/hospitality-ai-news-panel.tsx` |

Phrenos brand copy reference: `phrenos-ai/src/data/site-content.ts`

---

## 19. Agent implementation prompt (copy-paste)

Use this block to start a coding agent session:

---

**Build the Phrenos.ai weekly Gen AI news pipeline in the `phrenos-ai` repository.**

Follow `docs/phrenos-ai-news-pipeline.md` exactly.

**Requirements:**

1. Clone the Hospitality Nerd research architecture (Tavily → Firecrawl → Supabase → Anthropic → content pack) into a new `phrenos-updates` module inside `phrenos-ai`.
2. Do **not** modify `hospitality-nerd-app` or reuse Spyros / Hospitality Nerd voice prompts.
3. Use **Sophia Livanos / Phrenos.ai voice** as defined in Section 2 and prompts in Sections 9–10 of the doc.
4. Six stories per week: 3 `models_research` + 3 `products_industry`.
5. Per story: 4 blog ideas, 4 LinkedIn ideas, 1 featured blog, 1 featured LinkedIn; on-demand expand idea → full draft.
6. New Supabase tables with `extracted_facts` and `is_full_draft`.
7. Admin UI with manual **Generate content** (no auto-repair on load), one progress banner at a time.
8. Wire approved featured blogs to public `/ai-updates` when publish flow exists.
9. Env vars: Supabase service role, Anthropic, Tavily, Firecrawl, CRON_SECRET.
10. British English in generated copy; no em-dashes; source-backed facts only.
11. Every featured draft includes **Why this matters now**, **What to do next**, and a conversion CTA (phrenosai.com/ai-updates or /contact). Never use internal “for us” framing.

**Acceptance:** Run new week → 6 stories with extracted facts → Generate content → each story shows 4+4 ideas and 1+1 featured drafts in Phrenos voice with conversion beats → approve → visible on `/ai-updates`.

---

## 20. Checklist for go-live

### One-time setup

1. Create a Supabase project (or use an existing one).
2. In the Supabase SQL Editor, run `supabase/migrations/001_phrenos_updates.sql`.
3. In Vercel → Project → Settings → Environment Variables, set:

```
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
TAVILY_API_KEY=
FIRECRAWL_API_KEY=
PHRENOS_ADMIN_PASSWORD=
CRON_SECRET=
```

Optional: `ANTHROPIC_MODEL`, `PHRENOS_ADMIN_SECRET`. Mirror the same values in `.env.local` for local development.

4. Redeploy so the env vars load.
5. Open `https://www.phrenosai.com/admin/ai-updates` and sign in with `PHRENOS_ADMIN_PASSWORD`.

### First weekly batch

- [ ] Click **Run new week** and wait until status is completed (six stories with sources)
- [ ] Click **Generate content** (processes one story at a time until the pack is full)
- [ ] Review featured blogs and LinkedIn drafts; Approve the blogs you want live
- [ ] Click **Publish approved blogs**
- [ ] Confirm they appear on `/ai-updates` and `/ai-updates/[slug]`
- [ ] Cron is live on Vercel (`vercel.json` → Sunday 06:00 UTC); research only, not auto content
- [ ] Anthropic credits monitored

### Routes (implemented)

| Surface | Path |
|---------|------|
| Admin desk | `/admin/ai-updates` |
| Public index | `/ai-updates` |
| Public article | `/ai-updates/[slug]` |
| Cron | `GET /api/phrenos-updates/cron` with `Authorization: Bearer {CRON_SECRET}` |

---

## Appendix A — Sophia’s prompt patterns (from email update.docx)

Adapt these for **on-demand generation** and **human-in-the-loop** steps in the admin UI. Replace bracketed placeholders with story fields from Supabase. All outputs must still obey `{SOURCE_INTEGRITY_BLOCK}`.

### A.1 Native drafting (blog first draft)

```
Help me write a first draft of a {wordCount}-word blog post about {story.title}.

I'm Sophia Livanos, founder of Phrenos.ai, writing for {audience: leaders, content strategists, and AI adopters}.

Use a playful yet professional voice on briefing exports; refined strategist voice on public phrenosai.com posts.

Structure:
1. Introduction — hook + {specificProblemFromSummary} for a global business reader
2. **Why this matters now** — 3-5 bulleted implications from source facts ONLY
3. **What changes in practice** — short prose section
4. **What to do next** — 2-3 actions the reader can take this week
5. CTA — full article lives on phrenosai.com/ai-updates; invite Start a conversation at phrenosai.com/contact when appropriate

Source facts:
{extracted_facts from all story sources}

Address the reader as *you/your organisation*. Never write "what this means for us". British English. No em-dash or en-dash characters.
```

### A.2 Competitor / gap analysis (research assist — optional admin tool)

```
Summarise the key arguments in these source articles about {story.title}.

Then compare against the draft story summary and list up to 3 content gaps or unique angles Phrenos.ai can own for a global audience (information gain), using only verified facts.

Sources:
{JSON sources with urls and facts}

Our draft summary:
{story.summary_html}
```

### A.3 Content planning table (Sheets-style — optional export)

```
From these verified campaign or product facts, produce a markdown table with columns:
Name | Date (if known) | Primary capability | One-sentence strategic implication for leaders.

Use only facts from:
{extracted_facts}
Do not invent launch dates or KPIs.
```

### A.4 Strategic outline before full blog (featured blog pre-pass)

```
I want to write a comprehensive guide on {story.title} for Phrenos.ai.

Before you write anything, act as a content strategist and provide a detailed structural outline that prioritises information gain over generic AI hype.

Identify:
1. The main problem or challenge this news creates for {audience}
2. Key takeaways supported by the source facts
3. A unique, provocative hook for LinkedIn

Source facts only:
{extracted_facts}

After I approve the outline in admin, expand to a full {1500}-word blog in Sophia Livanos / Phrenos voice.
```

### A.5 Visual brief (image_ideas field)

```
Generate a creative brief for a hero image for an article about {story.title}.

Phrenos brand: dark forest green, gold accent, refined minimal aesthetic (phrenosai.com).

Describe composition, mood, and any legible headline text placement. Do not generate the image here; output 2-3 sentences for a designer or image model.

Article hook: {suggestion.hook}
```

### A.6 Effective prompting habits (operator checklist)

- **Be specific** — role, audience, and problem in every generation request.
- **Iterate** — regenerate with “more concise”, “more personality”, or “more validity focus” rather than accepting the first pass.
- **Fact-check** — cross-read draft bullets against `extracted_facts`; reject unsourced percentages and dates.
- **Rethink** — if tone drifts toward generic AI slop or Hospitality Nerd ops voice, restart with Public Phrenos TOV block.

---

## Appendix B — Optional weekly briefing export

Generate one **rollup document** per completed run (Word or HTML email), in **briefing register**:

```
Write a weekly AI landscape briefing for Phrenos.ai subscribers.

Period: {lookbackStart} to {lookbackEnd}.

Use the Weekly briefing structure from Section 2b of phrenos-ai-news-pipeline.md.

Stories to include (group under Creation / Optimisation / Validity pillars):
{JSON all six stories with summaries and sources}

Rules:
- {SOURCE_INTEGRITY_BLOCK}
- Name products and dates only when present in sources
- Each bullet uses **Why this matters now** + **What to do next** (never "for us")
- End with 2-3 prioritised reader actions, then convert: link to phrenosai.com/ai-updates and/or phrenosai.com/contact
- British English; no em-dash or en-dash; address reader globally as *you*
- Length: 800-1200 words
```

Expose as **Export weekly briefing** beside Word export in admin UI.

---

*Document version: 2026-08-18 (rev. conversion + global framing) · Phrenos.ai · Sophia Livanos*
