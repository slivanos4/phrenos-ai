/**
 * The full case studies, written from the detailed AI Solutions Portfolio deck.
 * `title` matches the entry in selectedWork (src/data/site-content.ts), which also supplies the headline
 * result (`transformation`), so every page on the site shows the same figure.
 */

export type CaseStudy = {
  title: string;
  slug: string;
  name: string;
  summary: string;
  facts: { label: string; value: string }[];
  problem: string;
  hard: { title: string; body: string }[];
  solution: string;
  decisions: string[];
  architecture: string[];
  architectureNote: string;
  capabilities: { title: string; body: string }[];
  results: { title: string; body: string }[];
  future: string[];
};

export const caseStudies: readonly CaseStudy[] = [
  {
    title: "Competitive Intelligence",
    slug: "competitive-intelligence",
    name: "AI-Powered Competitive Intelligence Platform",
    summary: "Automated competitor monitoring and strategic analysis across multiple comparison websites.",
    facts: [
      { label: "Business area", value: "Competitive intelligence" },
      { label: "Users", value: "Content, SEO and Product" },
      { label: "Technology", value: "AI, Python, web crawling, NLP" },
      { label: "Outcome", value: "Executive intelligence reports" },
    ],
    problem:
      "Multiple comparison websites contained 10 to 15 brands per page, each supported by detailed long-form reviews. Keeping hundreds of reviews competitive required continuous manual research across competitor websites, making the process slow, inconsistent and difficult to scale.",
    hard: [
      { title: "Scale", body: "10 to 15 brands per page, across many comparison sites and hundreds of reviews." },
      { title: "Constant change", body: "Competitor pricing, positioning and messaging shift continuously." },
      { title: "No standard method", body: "Research was manual and ad hoc, with no repeatable process." },
      { title: "A cross-functional need", body: "Content, SEO and Product teams all depended on the same insight." },
    ],
    solution:
      "Built an AI platform that crawled competitor websites, extracted products, pricing, messaging, UX and UI, trust signals and positioning, then compared them against the company's own sites. The platform generated structured reports with strengths, weaknesses, content gaps, feature ideas, payment methods, UX improvements and strategic recommendations.",
    decisions: [
      "Crawl at scale across every comparison site, not a manual sample.",
      "Compare structured attributes such as pricing, UX and trust signals, not just text.",
      "Output executive-ready recommendations, not raw data.",
    ],
    architecture: ["Competitor websites", "Crawler", "AI processing", "Analysis", "Recommendations", "Executive report"],
    architectureNote: "A continuous pipeline, with no manual research required.",
    capabilities: [
      { title: "Automated web crawling", body: "Continuously scans comparison sites at scale." },
      { title: "Product and pricing extraction", body: "Captures products, pricing and payment methods." },
      { title: "Messaging and positioning analysis", body: "Reads how competitors position themselves." },
      { title: "UX and UI comparison", body: "Benchmarks design and user experience." },
      { title: "Trust signal detection", body: "Identifies credibility and trust indicators." },
      { title: "Structured executive reporting", body: "Turns findings into strategic recommendations." },
    ],
    results: [
      { title: "A standardised approach", body: "Standardised competitor analysis across multiple industries." },
      { title: "Faster opportunity identification", body: "Identified market opportunities and content gaps faster." },
      { title: "Executive-ready output", body: "Produced executive-ready strategic reports." },
    ],
    future: ["Real-time monitoring", "Agents", "Approval workflows", "AI summaries", "A data warehouse"],
  },
  {
    title: "Brand Review Governance",
    slug: "brand-review-governance",
    name: "AI Brand Review Governance Platform",
    summary: "Automated governance platform that validates long-form brand reviews against official brand websites.",
    facts: [
      { label: "Business area", value: "Content governance" },
      { label: "Users", value: "Editorial and Operations" },
      { label: "Technology", value: "AI, web scraping, NLP" },
      { label: "Outcome", value: "Continuous automated auditing" },
    ],
    problem:
      "Hundreds of long-form brand reviews required continual validation against official brand websites. Manual auditing was repetitive, difficult to scale and increased the risk of outdated information remaining live.",
    hard: [
      { title: "High volume", body: "Hundreds of long-form brand reviews required continual validation." },
      { title: "Constant re-checking", body: "Official brand sites change, so validation is never truly finished." },
      { title: "Reputational risk", body: "Outdated information could remain live and mislead customers." },
      { title: "Hard to scale", body: "Manual auditing was repetitive and could not keep pace." },
    ],
    solution:
      "Developed a scheduled AI governance platform with two workflows: a weekly audit of new reviews and a monthly validation of all published reviews. The system scrapes official brand sites, compares products, features and content, flags inconsistencies, identifies new products and highlights stale reviews of six months or more. Findings are prioritised as red (incorrect information), orange (requires attention) and blue (improvement opportunities).",
    decisions: [
      "Run two cadences: weekly checks on new reviews and a monthly full validation.",
      "Compare against the official source of truth, not internal assumptions.",
      "Prioritise findings by severity, rather than flagging everything equally.",
    ],
    architecture: ["Brand websites", "Scheduled scraper", "AI comparison engine", "Flagged findings", "Prioritised report"],
    architectureNote: "Weekly and monthly cycles run automatically, without manual triggering.",
    capabilities: [
      { title: "Weekly and monthly scheduling", body: "Two automated cadences cover new and existing reviews." },
      { title: "Automated site scraping", body: "Continuously reads official brand websites." },
      { title: "Product and feature comparison", body: "Compares published content against the source of truth." },
      { title: "Inconsistency flagging", body: "Surfaces mismatches and outdated claims." },
      { title: "Stale content detection", body: "Highlights reviews untouched for six months or more." },
      { title: "Severity-based prioritisation", body: "Classifies findings as red, orange or blue." },
    ],
    results: [
      { title: "Continuous monitoring", body: "Introduced continuous monitoring rather than periodic reviews." },
      { title: "Severity prioritisation", body: "Prioritised work using severity-based classifications." },
      { title: "Improved confidence", body: "Improved confidence in published content through repeatable validation." },
    ],
    future: ["Real-time change detection", "Approval workflows", "AI summaries"],
  },
  {
    title: "Content Buddy",
    slug: "content-buddy",
    name: "Content Buddy: AI Knowledge & Workflow Assistant",
    summary: "A domain-specific AI assistant that centralised organisational knowledge into one conversational interface.",
    facts: [
      { label: "Business area", value: "Knowledge management" },
      { label: "Users", value: "Content managers" },
      { label: "Technology", value: "LLMs, prompt engineering" },
      { label: "Outcome", value: "Faster onboarding and support" },
    ],
    problem:
      "Knowledge was spread across Confluence, CMS manuals, SEO documentation, testing history, compliance guides, Monday.com and Jira, making information difficult to find and onboarding slow.",
    hard: [
      {
        title: "Fragmented sources",
        body: "Confluence, CMS manuals, SEO docs, testing history, compliance guides, Monday.com and Jira.",
      },
      { title: "Hard to find", body: "There was no single place to search for an answer." },
      { title: "Slow onboarding", body: "New starters had to learn where everything lived." },
      { title: "Tribal knowledge", body: "Answers depended on who you could find, not on documentation." },
    ],
    solution:
      "Designed and built Content Buddy to provide contextual guidance on content optimisation, SEO, compliance, A/B testing, CMS support, workflows, onboarding and internal documentation. The assistant surfaced company knowledge instantly through natural language.",
    decisions: [
      "Centralise every knowledge source behind one conversational interface.",
      "Answer in natural language, not links to documents.",
      "Cover the full content lifecycle: optimisation, SEO, compliance, testing and workflow.",
    ],
    architecture: ["Knowledge sources", "Ingestion and indexing", "LLM assistant", "Natural language query", "Instant answer"],
    architectureNote: "Every source is indexed once, then queried instantly in plain language.",
    capabilities: [
      { title: "Content optimisation guidance", body: "Contextual advice on improving published content." },
      { title: "SEO guidance", body: "Best-practice SEO support on demand." },
      { title: "Compliance guidance", body: "Surfaces the relevant compliance requirements." },
      { title: "A/B testing and CMS support", body: "Practical help with testing and CMS workflows." },
      { title: "Workflow and onboarding support", body: "Guides new starters through processes." },
      { title: "Internal documentation search", body: "Finds the right document instantly." },
    ],
    results: [
      { title: "Faster search", body: "Reduced time searching documentation." },
      { title: "Better onboarding", body: "Improved onboarding and consistency." },
      { title: "Faster AI adoption", body: "Accelerated AI adoption across teams." },
    ],
    future: ["Agentic actions", "Continuous knowledge sync", "Integrated approvals", "Multi-team rollout", "A usage dashboard"],
  },
  {
    title: "Content & Data Hub",
    slug: "content-data-hub",
    name: "Content & Data Hub: AI-Powered Data, Content & Automation Platform",
    summary:
      "A single platform connecting performance data, content generation and automated experimentation into one growth decision system.",
    facts: [
      { label: "Business area", value: "Content and growth operations" },
      { label: "Users", value: "Content, SEO, Growth and Product" },
      { label: "Technology", value: "Next.js, TypeScript, a rules engine, live search" },
      { label: "Outcome", value: "Centralised decisions, content, optimisations and learning" },
    ],
    problem:
      "Content and SEO teams manage comparison content across dozens of business verticals in 12 countries and 9 languages, while performance data sat separately in analytics, BI and experimentation tools. Nothing connected what changed in performance to what content should happen next, or which tests were worth running. Teams were left jumping between dashboards, guessing at causes, and losing hard-won learnings over time.",
    hard: [
      { title: "Scale", body: "Dozens of verticals across 12 countries and 9 languages, each with a different retail calendar." },
      {
        title: "Disconnected systems",
        body: "Performance data, content planning and experiment results lived in separate tools.",
      },
      { title: "No causal insight", body: "Dashboards showed what changed, but never explained why, or what to do next." },
      {
        title: "Lost learnings",
        body: "Test results and lessons disappeared into dashboards and documents instead of compounding.",
      },
    ],
    solution:
      "Designed Content Hub as a three-layer platform: a data intelligence layer that diagnoses why performance moves and ranks likely causes, a content layer that matches seasonal and commercial events to the right verticals and generates localised copy in 9 languages, and an automation layer that turns diagnoses into structured experiments and feeds outcomes back into a compounding learning memory.",
    decisions: [
      "Treat content generation as one layer of a bigger data-to-decision system, not a standalone tool.",
      "Rank causes with transparent evidence and confidence scores, not black-box AI answers.",
      "Feed every experiment outcome back into the system so recommendations improve over time.",
    ],
    architecture: [
      "Performance and content data",
      "Diagnostic and relevance engine",
      "Content and recommendation generator",
      "Automated experimentation",
      "Compounding learning memory",
    ],
    architectureNote: "One system that diagnoses, generates, tests and remembers, not four disconnected tools.",
    capabilities: [
      { title: "Seasonal and commercial calendar", body: "Holidays plus curated retail moments across 12 countries." },
      { title: "Vertical relevance engine", body: "Matches every event to the specific verticals it affects." },
      { title: "Localised content generation", body: "Headlines, ribbon copy and long-form copy in 9 languages." },
      { title: "Live AI search insights", body: "Surfaces current market signals for any vertical and country." },
      { title: "AI-search content optimiser", body: "Rewrites existing copy against an AI-search-ready checklist." },
      { title: "Search, filter and CSV export", body: "Fast filtering with one-click export for planning cycles." },
    ],
    results: [
      {
        title: "Localised at scale",
        body: "Generates ready-to-use headlines and copy in 9 languages across 12 countries automatically.",
      },
      {
        title: "Built-in relevance",
        body: "Matches every calendar event to the specific verticals it actually affects, with no guesswork.",
      },
      {
        title: "AI-search ready",
        body: "Scores and rewrites existing copy against an AI-search-readiness checklist.",
      },
    ],
    future: [
      "Anomaly detection and diagnosis",
      "Ranked causal recommendations",
      "Automated experiment briefs",
      "A compounding learning memory",
      "A unified performance data layer",
      "Full article generation",
    ],
  },
  {
    title: "Monthly Report Automation",
    slug: "monthly-report-automation",
    name: "Monthly Report Automation Platform",
    summary: "Automated generation of executive PowerPoint reports from Excel data sources.",
    facts: [
      { label: "Business area", value: "Executive reporting" },
      { label: "Users", value: "Analytics and Finance" },
      { label: "Technology", value: "Python, FastAPI, AI-ready" },
      { label: "Outcome", value: "Executive reports generated automatically" },
    ],
    problem:
      "Monthly reporting required manually copying data from multiple Excel workbooks into PowerPoint, creating a slow and error-prone process.",
    hard: [
      { title: "Manual copy and paste", body: "Data was copied by hand from multiple Excel workbooks into PowerPoint." },
      { title: "Error-prone", body: "Manual transfer introduced avoidable mistakes." },
      { title: "Repetitive", body: "The same manual process repeated every reporting cycle." },
      {
        title: "Time-consuming",
        body: "Significant analyst and finance time went on formatting, not analysis.",
      },
    ],
    solution:
      "Designed a platform that analyses PowerPoint templates, maps KPIs to Excel once and automatically generates future reports while preserving layouts. Built with a roadmap for AI commentary, financial projection workflows and data warehouse integration.",
    decisions: [
      "Map KPIs to Excel once, then reuse the mapping indefinitely.",
      "Preserve the original template layout exactly.",
      "Design for extension: AI commentary and projections from day one.",
    ],
    architecture: ["Excel data sources", "One-time KPI mapping", "Template engine", "Automated generation", "Executive PowerPoint"],
    architectureNote: "One-time setup, then every future report generates itself.",
    capabilities: [
      { title: "Template structure analysis", body: "Reads and understands the existing PowerPoint template." },
      { title: "One-time KPI-to-Excel mapping", body: "Maps KPIs once, reused for every future cycle." },
      { title: "Automated report generation", body: "Builds the full report without manual input." },
      { title: "Layout preservation", body: "Keeps the original template design intact." },
    ],
    results: [
      { title: "No manual updates", body: "Eliminated repetitive manual updates." },
      { title: "A reusable framework", body: "Created a reusable reporting framework." },
      { title: "A foundation for AI agents", body: "Established a foundation for future AI agents." },
    ],
    future: ["AI-generated commentary", "Financial projections", "Autonomous reporting agents", "Data warehouse integration", "Power BI delivery"],
  },
] as const;

export function caseStudyBySlug(slug: string): CaseStudy | undefined {
  return caseStudies.find((study) => study.slug === slug);
}

export function caseStudyHref(workTitle: string): string {
  const study = caseStudies.find((item) => item.title === workTitle);
  return study ? `/work/${study.slug}` : "/work";
}
