/**
 * Plain-answer guides. Each one opens with the answer to the question a person would type, then backs it with what
 * Phrenos.ai has actually built (the case studies in src/data/case-studies.ts) and offers (src/data/site-content.ts).
 * Write only what the site already states: no invented numbers, clients, formats or prices.
 */

export type GuideSection = { heading: string; paragraphs?: string[]; bullets?: string[] };

export type Guide = {
  slug: string;
  /** The page heading. */
  title: string;
  /** Short label for cards and links. */
  label: string;
  /** The meta description: the specific outcome and who it is for. */
  description: string;
  eyebrow: string;
  /** The answer, in the first lines. */
  lead: string;
  sections: GuideSection[];
  /** Case study this guide leans on, if any. */
  caseStudy?: string;
  /** Plain question and answer pairs, also published as structured data. */
  faq?: { question: string; answer: string }[];
};

export const guides: readonly Guide[] = [
  {
    slug: "automate-monthly-reporting",
    title: "How to automate monthly reporting with AI",
    label: "Automate monthly reporting",
    eyebrow: "Guide · Reporting",
    description:
      "How to stop spending days copying Excel data into PowerPoint every month. A practical guide for business leaders, based on a system that cut report building from days to minutes.",
    lead:
      "Monthly reporting that means copying figures from several Excel workbooks into PowerPoint can take days, and every manual copy is a chance for a mistake. It can be automated. Map each figure to its source once, and every later report builds itself in the same layout.",
    caseStudy: "monthly-report-automation",
    sections: [
      {
        heading: "Why monthly reporting takes so long",
        bullets: [
          "The numbers live in several Excel workbooks, not one source.",
          "They are copied into PowerPoint by hand, so mistakes creep in.",
          "The same manual process repeats every reporting cycle.",
          "Skilled analysts spend their time on formatting instead of analysis.",
        ],
      },
      {
        heading: "What automated reporting looks like",
        paragraphs: [
          "The approach we use has three steps. The platform reads your existing PowerPoint template and understands its structure. You map each KPI to its place in Excel once. From then on, every report is generated automatically, with the original layout kept exactly as it was.",
          "The one-off mapping is the part that matters. It is done once and reused every month, so the effort goes into setting it up well and not into repeating it.",
        ],
      },
      {
        heading: "What changed for one team",
        paragraphs: [
          "We built the Monthly Report Automation Platform for a team of analytics and finance users. Executive PowerPoint reports now generate from their Excel data sources, and report building went from days to minutes. The repetitive manual updates are gone, and the team has a reusable reporting framework to build on.",
        ],
      },
      {
        heading: "What you need before you start",
        bullets: [
          "A report template your team already trusts and wants to keep.",
          "Data in files that are laid out consistently from one month to the next.",
          "Clear definitions of each KPI, and someone who owns them.",
        ],
      },
      {
        heading: "Where AI fits in",
        paragraphs: [
          "Automating the build removes the copying. AI comes next: the platform was designed from day one to take on AI-written commentary, financial projections and a link to a data warehouse. Those are on the roadmap rather than a promise for every project, so ask what is included before you start.",
        ],
      },
      {
        heading: "How to start",
        paragraphs: [
          "Take the free AI readiness check to see how ready your data and workflows are, or book a free 15-minute intro call and tell us how your monthly reports are made today.",
        ],
      },
    ],
    faq: [
      {
        question: "How do I stop my team spending days every month pulling together reports?",
        answer:
          "Map each figure in your report to its source in Excel once, and let a system build the report from your existing PowerPoint template each month. The manual copying disappears, and report building can drop from days to minutes.",
      },
      {
        question: "Does automated reporting keep my existing report layout?",
        answer:
          "Yes. The Monthly Report Automation Platform analyses your PowerPoint template and preserves its layout when it generates each report.",
      },
    ],
  },
  {
    slug: "in-house-ai-lead-or-ai-consultancy",
    title: "In-house AI lead or AI consultancy? A practical guide for growing businesses",
    label: "In-house AI lead or consultancy",
    eyebrow: "Guide · Decision",
    description:
      "Should a growing business hire an in-house AI lead or bring in an AI consultancy? A plain guide to what each gives you, when each makes sense, and how the two can work together.",
    lead:
      "Hire in-house when AI needs an owner every day. Bring in a consultancy when you need to start, build something specific, or find out what is worth building before you commit to a hire. Many businesses do the second first, and hire once they know what the role should be.",
    sections: [
      {
        heading: "Start with the next twelve months",
        paragraphs: [
          "The useful question is not which is better in general. It is what your business needs from AI over the next year, and whether that is steady, daily ownership or a defined piece of work with a clear outcome.",
        ],
      },
      {
        heading: "What an in-house AI lead gives you",
        bullets: [
          "Someone who knows your business from the inside and is there every day.",
          "Continuity: the same person looks after what is built and keeps it moving.",
          "A visible owner for AI inside the organisation, which helps adoption.",
        ],
      },
      {
        heading: "What an independent consultancy gives you",
        bullets: [
          "A quicker start, with no recruitment to run first.",
          "Work scoped to a clear outcome, such as a strategy, an automation or a system built end to end.",
          "Flexibility: a one-off project, ongoing support, a workshop, training or a talk, as you need it.",
        ],
      },
      {
        heading: "When a consultancy usually makes more sense",
        bullets: [
          "You are introducing AI for the first time and have no AI function yet.",
          "You have a specific system or process to build.",
          "You want to learn where AI pays off before deciding what to hire for.",
        ],
      },
      {
        heading: "When to hire in-house",
        paragraphs: [
          "When AI work is continuous and central to how you operate, a full-time owner earns their place. A first project often shows what the role needs to do, which makes the hire easier to define.",
        ],
      },
      {
        heading: "How the two work together",
        paragraphs: [
          "At Phrenos.ai we aim to leave behind systems that keep running and teams that can use them, because the standard we hold ourselves to is that the work is still paying off long after the engagement ends. That makes it a sensible first step before an in-house hire, and a useful partner alongside one. You can see what we have built on the work page.",
        ],
      },
      {
        heading: "Questions to ask yourself",
        bullets: [
          "Do we know what we want AI to do, or do we need to find out first?",
          "Is the work a defined project, or an ongoing responsibility?",
          "Who would own it day to day once it is built?",
          "Would we know what to ask an in-house hire to do in their first six months?",
        ],
      },
      {
        heading: "Next step",
        paragraphs: ["Book a free 15-minute intro call. You tell us where the friction is, and no preparation is needed."],
      },
    ],
    faq: [
      {
        question: "Is it better to hire an in-house AI lead or bring in an AI consultancy?",
        answer:
          "It depends on the work. Hire in-house when AI needs daily ownership. Use a consultancy to start quickly, build a defined system, or learn what is worth building before you hire.",
      },
    ],
  },
  {
    slug: "ai-training-for-business-teams",
    title: "AI training for business teams: what a Phrenos.ai session covers",
    label: "AI training for teams",
    eyebrow: "Guide · Training",
    description:
      "Practical AI training and workshops for business leaders and teams, built around safe, responsible use and habits that last. What the training covers and how to start.",
    lead:
      "Our AI training gives leaders and teams the fluency, judgement and working habits to use AI responsibly and productively every day. It is practical, built around your own work, and designed so the capability stays with the team after we leave.",
    sections: [
      {
        heading: "Who it is for",
        paragraphs: ["Leaders and practitioners. The programmes are tailored to each group, because a leadership team and the people doing the daily work need different things."],
      },
      {
        heading: "The problem it solves",
        paragraphs: [
          "Plenty of teams can open an AI tool. Fewer have a shared way of using it well, or a clear view of what AI may do and who approves it. The result is pilots that never leave the pilot stage, and rework when the output is not good enough.",
        ],
      },
      {
        heading: "What the training covers",
        bullets: [
          "Fluency programmes tailored to leaders and practitioners.",
          "Working habits that keep judgement ahead of the tool.",
          "Responsible use patterns that reduce risk and rework.",
          "How to brief AI clearly: purpose, audience, scope and tone. Our free cheat sheet, How to Brief AI Like a Strategist, is a good place to begin.",
        ],
      },
      {
        heading: "Workshops, training and talks",
        paragraphs: [
          "Workshops are hands-on sessions that turn ideas into priorities and a plan. Training builds AI fluency and good judgement for leaders and teams. Talks are keynotes and sessions for events and leadership teams. Timing and cost depend on the scope, so each one is shaped around your goals.",
        ],
      },
      {
        heading: "What stays with the team",
        paragraphs: [
          "The aim is capability that stays with your people after we leave. Training also sits alongside the rest of our work: if a team needs a system built, such as an assistant or an automated report, training and building can be planned together.",
        ],
      },
      {
        heading: "How to start",
        paragraphs: ["Book a free 15-minute intro call and tell us who the training is for and what you want them able to do. We will shape the right format with you."],
      },
    ],
    faq: [
      {
        question: "How do we run AI training so a team uses AI safely and the habits stick?",
        answer:
          "Tailor it to the people using it, teach clear briefing and responsible use patterns, keep human judgement ahead of the tool, and use their real work as the examples so the habits carry over after the training ends.",
      },
    ],
  },
  {
    slug: "ai-competitive-intelligence",
    title: "AI-powered competitive intelligence for business leaders",
    label: "AI competitive intelligence",
    eyebrow: "Guide · Intelligence",
    description:
      "How AI can monitor competitors for you and turn days of manual research into minutes. What competitive intelligence involves, and the platform Phrenos.ai built for content, SEO and product teams.",
    lead:
      "AI-powered competitive intelligence reads competitor websites for you and turns what it finds into a structured report. Tracking competitors by hand is slow and inconsistent. Automated, the same research takes minutes, and the report is ready to act on.",
    caseStudy: "competitive-intelligence",
    sections: [
      {
        heading: "The problem with tracking competitors by hand",
        bullets: [
          "Pricing, positioning and messaging change all the time.",
          "Manual research is slow, inconsistent and hard to repeat.",
          "It does not scale when there are many competitors, pages and markets.",
          "Several teams often depend on the same insight at once.",
        ],
      },
      {
        heading: "What AI-powered competitive intelligence does",
        paragraphs: [
          "It crawls competitor sites, pulls out the details that matter, compares them with your own, and writes a structured report. The aim is decision-ready briefings, not a pile of screenshots.",
        ],
      },
      {
        heading: "The platform we built",
        paragraphs: [
          "We built an AI platform for content, SEO and product teams that monitors competitors across multiple comparison websites. Each page held 10 to 15 brands, each with a long-form review, and keeping hundreds of reviews competitive had meant continuous manual research.",
          "The platform extracts products, pricing, payment methods, messaging, UX and UI, trust signals and positioning, and compares them against the company's own sites. It then produces an executive report covering strengths, weaknesses, content gaps, feature ideas, UX improvements and strategic recommendations.",
        ],
      },
      {
        heading: "What changed",
        paragraphs: [
          "Competitor research that took days now runs automatically. The team gets that time back for thinking, creating and deciding, and everyone works from the same standardised analysis.",
        ],
      },
      {
        heading: "Who it suits",
        paragraphs: [
          "Businesses with many competitors to follow, or several teams that rely on the same market insight. If your people spend days collecting and comparing competitor information, this is the kind of work we automate.",
        ],
      },
      {
        heading: "How to explore it",
        paragraphs: ["Take the free AI readiness check, or book a free 15-minute intro call and tell us what you track today and how."],
      },
    ],
    faq: [
      {
        question: "What is AI-powered competitive intelligence?",
        answer:
          "It is software that reads competitor websites automatically, extracts details such as pricing, messaging and trust signals, compares them with your own, and writes a structured report with recommendations.",
      },
    ],
  },
] as const;

export function guideBySlug(slug: string): Guide | undefined {
  return guides.find((guide) => guide.slug === slug);
}

export function guideForCaseStudy(caseStudySlug: string): Guide | undefined {
  return guides.find((guide) => guide.caseStudy === caseStudySlug);
}
