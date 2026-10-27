export const site = {
  name: "Phrenos.ai",
  tagline: "AI Strategy, Automation & Innovation",
  definition: "phren·os (n.): mind, intellect, reason",
  description:
    "An independent AI consultancy helping businesses turn Generative AI, data and automation into measurable operational and commercial impact.",
  email: "hello@phrenosai.com",
  linkedin: "https://www.linkedin.com/in/sophia-livanos-45144b22",
} as const;

export const navigation = [
  { label: "Home", href: "/" },
  { label: "Consultancy", href: "/consultancy" },
  { label: "Approach", href: "/approach" },
  { label: "Work", href: "/work" },
  { label: "AI Updates", href: "/ai-updates" },
  { label: "Resources", href: "/resources" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

/** Optional booking page (Cal.com, Calendly...). Set NEXT_PUBLIC_BOOKING_URL in Vercel to switch it on. */
export const booking = {
  url: process.env.NEXT_PUBLIC_BOOKING_URL?.trim() || "",
  label: "Book a free 15-minute intro call",
} as const;

/** Where a "book a call" button goes: the booking page when set, otherwise the contact form. */
export const bookCallHref = booking.url || "/contact#contact-form";
export const bookCallIsExternal = Boolean(booking.url);

export const headerCta = {
  label: "Book a free intro call",
  href: "/contact",
} as const;

export const hero = {
  eyebrow: "THE MIND IN THE MACHINE",
  headline: "From AI curiosity\nto business advantage.",
  supporting:
    "Technology changes quickly, but curiosity, critical thinking and good judgement never go out of style.",
  offerLead: "AI that actually works for your business.",
  offer:
    "Phrenos.ai is an independent AI consultancy. We help business leaders introduce Generative AI, data and automation, stay ahead and expand, from the first strategy to the systems and training that keep it working.",
  secondary: {
    emphasis:
      "The best use of AI doesn't replace expertise, creativity or human judgement; it amplifies them.",
  },
  primaryCta: {
    prefix: "Book a free ",
    ai: "15-minute",
    suffix: " intro call",
    href: "/contact#contact-form",
  },
} as const;

export const credibility = [
  "Generative AI Strategy",
  "Business Process Automation",
  "Data & Business Intelligence",
  "AI Innovation",
  "Organisational Enablement",
] as const;

export const services = [
  {
    title: "AI Strategy & Adoption",
    short: "Strategy",
    description:
      "Clarify where Generative AI creates commercial value, set priorities your leadership team can act on, and build a practical path from ambition to adoption.",
    points: [
      "Board-ready opportunity maps with clear commercial bets.",
      "Prioritised adoption roadmaps your leadership team can fund and follow.",
      "Governance that protects judgement while unlocking speed.",
      "Measurable milestones from ambition to operating rhythm.",
    ],
  },
  {
    title: "Intelligent Workflow Automation",
    short: "Automation",
    description:
      "Redesign repetitive operational processes into reliable AI-assisted workflows that free expert time and reduce costly manual friction.",
    points: [
      "Process redesign around the work that actually moves outcomes.",
      "AI-assisted workflows with human checkpoints where risk is high.",
      "Less manual friction for the experts who create value.",
      "Reliable systems that keep running after the engagement ends.",
    ],
  },
  {
    title: "AI-Powered Content & Digital Systems",
    short: "Content",
    description:
      "Design governed content engines and build the digital products that carry them, from AI-assisted websites to bespoke publishing platforms, so your brand scales across every channel without losing craft, voice or control.",
    points: [
      "Scalable content engines with built-in governance and human oversight.",
      "AI-assisted websites and digital products, designed and shipped end-to-end.",
      "Brand-aligned systems across content, product and every channel.",
      "Measurable impact through analytics, feedback loops and continuous iteration.",
    ],
  },
  {
    title: "Competitive Intelligence & Analytics",
    short: "Intelligence",
    description:
      "Turn fragmented market signals into structured insight so teams can anticipate competitors, customers and commercial opportunity sooner.",
    points: [
      "Signal capture across competitors, customers and markets.",
      "Structured insight instead of scattered screenshots and noise.",
      "Earlier anticipation of commercial moves and threats.",
      "Decision-ready briefings your team can act on quickly.",
    ],
  },
  {
    title: "AI Training & Team Enablement",
    short: "Enablement",
    description:
      "Equip leaders and practitioners with the fluency, judgement and working habits needed to use AI responsibly and productively every day.",
    points: [
      "Fluency programmes tailored to leaders and practitioners.",
      "Working habits that keep judgement ahead of the tool.",
      "Responsible use patterns that reduce risk and rework.",
      "Capability that stays with the team after we leave.",
    ],
  },
] as const;

export const approach = {
  intro:
    "Four stages. One standard: still running, and still paying off, long after the engagement ends.",
  stages: [
    {
      number: "I",
      title: "Understand",
      description:
        "Map the organisation, workflows and commercial goals to uncover where AI, data and automation can create meaningful leverage.",
      image: "/brand/approach/stage-1.jpg",
    },
    {
      number: "II",
      title: "Prioritise",
      description:
        "Select the opportunities with the strongest operational and commercial return, then define a clear, staged path to value.",
      image: "/brand/approach/stage-2.jpg",
    },
    {
      number: "III",
      title: "Build",
      description:
        "Design and implement practical systems with the right balance of automation, governance, human oversight and measurable outcomes.",
      image: "/brand/approach/stage-3.jpg",
    },
    {
      number: "IV",
      title: "Embed",
      description:
        "Train teams, refine ways of working and leave behind capabilities that continue to deliver after the engagement ends.",
      image: "/brand/approach/stage-4.jpg",
    },
  ],
} as const;

export const romanNumerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"] as const;

export const selectedWork = [
  {
    title: "Competitive Intelligence",
    tag: "Intelligence",
    headline: "Automatically tracking what competitors are doing",
    problem:
      "Multiple comparison sites held 10 to 15 brands per page, each with long-form reviews. Keeping hundreds of reviews competitive meant continuous manual research that was slow, inconsistent and hard to scale.",
    solution:
      "An AI platform that crawls competitor sites, extracts products, pricing, messaging, UX, trust signals and positioning, then compares them against our own and drafts structured executive reports.",
    transformation: {
      from: "Days of Manual Work",
      to: "Minutes, Automatically",
    },
    steps: [
      "Competitor Websites",
      "AI Reads & Compares",
      "Analysis",
      "Ready-to-Use Report",
    ],
    image: "/brand/work/case-intelligence.jpg",
  },
  {
    title: "Brand Review Governance",
    tag: "Governance",
    headline: "Keeping hundreds of reviews accurate, automatically",
    problem:
      "Hundreds of long brand-review articles had to stay accurate. Checking them by hand was slow and easy to fall behind on.",
    solution:
      "A tool that automatically checks articles against official brand websites every week and month, then flags anything wrong or out of date, ranked by urgency.",
    transformation: {
      from: "Occasional Manual Checks",
      to: "Continuous Automatic Monitoring",
    },
    steps: [
      "Brand Websites",
      "AI Compares & Flags Issues",
      "Priority To-Do List",
    ],
    image: "/brand/work/case-governance.jpg",
  },
  {
    title: "Content Buddy",
    tag: "Knowledge",
    headline: "One place to ask any company question",
    problem:
      "Company knowledge was scattered across 7 different systems, so answering a simple question, or training a new teammate, took far longer than it should.",
    solution:
      "An AI chatbot that instantly answers questions using company knowledge in one place, with a human always reviewing what matters.",
    transformation: {
      from: "Knowledge Scattered Everywhere",
      to: "One Simple Chat",
    },
    steps: ["Company Documents", "AI Chatbot", "Instant Answers"],
    image: "/brand/work/case-knowledge.jpg",
  },
  {
    title: "Content & Data Hub",
    tag: "Hub",
    headline: "Connecting data, content and testing into one system",
    problem:
      "Performance data, content planning and testing lived in separate tools, so no one could easily see why something changed, what to do next, or what had already been learned.",
    solution:
      "A platform that brings together performance data, AI-generated content ideas and automatic testing, so the business can spot problems, react quickly and remember what worked.",
    transformation: {
      from: "Separate, Disconnected Tools",
      to: "One Connected System",
    },
    steps: [
      "Performance Data",
      "AI Spots Patterns & Suggests Content",
      "Tested & Remembered",
    ],
    image: "/brand/work/case-hub.jpg",
  },
  {
    title: "Monthly Report Automation",
    tag: "Reporting",
    headline: "Turning days of report-building into minutes",
    problem:
      "Monthly reporting meant manually copying data from multiple Excel workbooks into PowerPoint: slow and easy to get wrong.",
    solution:
      "A platform that analyses PowerPoint templates, maps KPIs to Excel once and automatically generates future reports while preserving layouts, with a roadmap for AI commentary and data warehouse integration.",
    transformation: {
      from: "Days",
      to: "Minutes",
    },
    steps: [
      "Spreadsheet Data",
      "Automatic Report Builder",
      "Finished Report",
    ],
    image: "/brand/work/case-reporting.jpg",
  },
] as const;

export const aboutPage = {
  eyebrow: "About",
  heading: "Most people ask what AI can do.",
  supporting: "I’m more interested in what it enables people to become.",
  photo: {
    src: "/brand/sophia-livanos.jpg",
    alt: "Sophia Livanos, founder of Phrenos.ai",
  },
  narrative: [
    "One question has shaped my work for years: how do we help people move from being impressed by AI to becoming genuinely empowered by it? I don’t see AI as a collection of tools or models. I see it as a fundamental shift in how we think, create, learn and solve problems.",
    "My own route into it started in medicine, not software. Training in osteopathy taught me how the nervous system drives behaviour, which pulled me toward neuroscience and neurolinguistics: the mechanics of how people process language and make decisions. That’s still how I think about AI today, not as a technical problem, but a human one.",
    "Technology changes quickly, but curiosity, critical thinking and good judgement never go out of style. I’m fascinated by the intersection of people and AI: how the right tools, combined with the right mindset, unlock entirely new ways of working. My focus isn’t keeping up with the latest release; it’s discovering what creates real value, separating signal from noise, and making AI approachable, practical and meaningful.",
    "Over the past few years I’ve built more than 40 custom GPTs and AI assistants, designed agentic AI workflows, developed automation platforms and reporting solutions, and helped organisations adopt AI in ways that create measurable business value. I enjoy taking complex ideas and making them practical, engaging and immediately useful.",
    "One topic I care deeply about is the growing amount of AI slop. AI isn’t the problem; poor thinking is. The best use of AI doesn’t replace expertise, creativity or human judgement. It amplifies them. That’s the philosophy behind everything I build, teach and share at Phrenos.ai.",
  ],
  closing: {
    lead: "AI isn’t about replacing people.",
    emphasis: "It’s about helping people become more capable versions of themselves.",
  },
  focusAreas: [
    "Generative AI Strategy & Adoption",
    "Agentic AI & Workflow Automation",
    "AI Assistants & Custom GPT Development",
    "AI Search & Knowledge Management",
    "Prompt Engineering & LLM Integration",
    "Executive Reporting & AI Automation",
    "AI Training & Enablement",
    "AI Product Strategy & Innovation",
  ],
  cta: {
    label: "Book a free intro call",
    href: "/contact",
  },
} as const;

export const contactCta = {
  heading: "Bring intelligence to the work that matters.",
  supporting:
    "A short note is enough to begin. Tell us where the friction is, and we’ll help find the leverage.",
  button: {
    label: "Book a free intro call",
    href: "/contact#contact-form",
  },
  secondary: {
    label: "Or take the free AI readiness check",
    href: "/resources/ai-readiness",
  },
} as const;

export const contactPage = {
  eyebrow: "Contact",
  title: "Let’s build an AI strategy that fits your business",
  formIntro:
    "Tell us a little about your organisation, and let’s find where AI, data or automation can create real leverage.",
  fields: {
    name: "Full name",
    email: "Work email",
    organisation: "Organisation",
    role: "Role",
    message: "Where should we look first?",
    submit: "Send message",
  },
  success: "Thank you. Your message has been sent. We’ll reply within a couple of business days, and a confirmation is on its way to your inbox.",
  optional: "Optional",
  nextSteps: [
    "Every message is read personally.",
    "You will hear back within a couple of business days, with a few questions or a time to talk.",
    "If it looks like a fit, we book a free 15-minute intro call to find where AI can create real leverage.",
  ],
} as const;

export const footer = {
  links: [
    { label: "Consultancy", href: "/consultancy" },
    { label: "Work", href: "/work" },
    { label: "Approach", href: "/approach" },
    { label: "AI Updates", href: "/ai-updates" },
    { label: "Resources", href: "/resources" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
} as const;

export const homePage = {
  audience: {
    eyebrow: "Who it's for",
    heading: "For leaders who want to stay ahead.",
    intro:
      "Whether you want to stay ahead of your market, bring AI into your business for the first time, or take what you already do further, this is where to start.",
    goals: [
      {
        title: "Stay ahead",
        body: "Know where AI is heading and what it means for your market, before your competitors do.",
      },
      {
        title: "Introduce AI",
        body: "Bring Generative AI into your company in a way your people trust and your leaders can fund.",
      },
      {
        title: "Expand",
        body: "Use AI, data and automation to grow what the business can do.",
      },
    ],
  },
  ways: {
    eyebrow: "Ways to work together",
    heading: "However you want to start, it starts with a call.",
    intro:
      "Timing and cost depend on the scope of the work, so each engagement is shaped around your goals. The first call is free.",
    items: [
      {
        title: "One-off projects",
        body: "A defined piece of work with a clear outcome, such as an AI strategy, an automation or a system built end to end.",
      },
      {
        title: "Ongoing support",
        body: "A steady partner as you adopt, extend and govern AI over time.",
      },
      {
        title: "Workshops",
        body: "Hands-on sessions that turn ideas into priorities and a plan.",
      },
      {
        title: "Training",
        body: "AI fluency and good judgement for leaders and teams.",
      },
      {
        title: "Talks",
        body: "Keynotes and sessions for events and leadership teams.",
      },
    ],
  },
  problems: {
    eyebrow: "Where most teams start",
    heading: "AI is everywhere. Impact still isn’t.",
    items: [
      {
        title: "Pilots that never leave the pilot stage",
        body: "Plenty of experimenting, little that changes how the business runs or what it earns.",
      },
      {
        title: "Days lost to manual reporting and research",
        body: "Skilled people copy data between tools when they should be making decisions.",
      },
      {
        title: "Knowledge nobody can find",
        body: "Answers scattered across systems, so a simple question takes far longer than it should.",
      },
      {
        title: "Autonomy without accountability",
        body: "Teams unsure what AI may do, who approves it, and who answers for it when it acts.",
      },
    ],
    bridge: { from: "Noise", to: "Signal", line: "Our job is to find the signal." },
  },
  outcomes: {
    eyebrow: "What we offer",
    heading: "Five services. One aim.",
    intro:
      "Five services, one aim: AI that makes a real difference to how your business runs. Each is a defined piece of work with a clear outcome, so you always know what you're getting.",
    whoFor:
      "For business leaders who want AI to change how the work gets done and what it earns.",
    items: [
      {
        icon: 0,
        title: "A plan your leadership team will back",
        service: "AI Strategy & Adoption",
        body: "Board-ready opportunity maps and a staged roadmap, with the governance to move quickly and safely.",
      },
      {
        icon: 1,
        title: "Manual work that runs itself",
        service: "Intelligent Workflow Automation",
        body: "Repetitive processes redesigned into reliable AI-assisted workflows, with humans checking what matters.",
      },
      {
        icon: 4,
        title: "A team that uses AI with confidence and good judgement",
        service: "AI Training & Team Enablement",
        body: "Practical fluency and habits that stay with your people after we leave.",
      },
      {
        icon: 3,
        title: "Market signals turned into briefings",
        service: "Competitive Intelligence & Analytics",
        body: "Structured, decision-ready insight instead of scattered screenshots and noise.",
      },
      {
        icon: 2,
        title: "Content and websites that scale, with your voice intact",
        service: "AI-Powered Content & Digital Systems",
        body: "Governed content engines and digital products, designed and built end to end.",
      },
    ],
    link: { label: "See all services", href: "/consultancy" },
  },
  howItStarts: {
    eyebrow: "How it starts",
    heading: "Three steps from first call to working system.",
    steps: [
      {
        title: "A free 15-minute intro call",
        body: "You tell us where the friction is. No preparation needed.",
      },
      {
        title: "We map where AI creates leverage",
        body: "We understand your workflows and goals, then prioritise the opportunities with the strongest return.",
      },
      {
        title: "We build it, and make it stick",
        body: "Practical systems with human oversight, and the training that keeps them working after we leave.",
      },
    ],
  },
  proof: {
    eyebrow: "Proof",
    heading: "Systems already at work.",
    stats: [
      { value: "40+", label: "custom GPTs and AI assistants built" },
      { value: "5", label: "AI systems in the solutions portfolio" },
      { value: "Days to minutes", label: "on report building and competitor research" },
    ],
    link: { label: "See all five systems", href: "/work" },
  },
  latest: {
    eyebrow: "AI Updates",
    heading: "The signal, not the noise.",
    link: { label: "All AI Updates", href: "/ai-updates" },
  },
  approach: {
    eyebrow: "How we work",
    heading: "Built to keep working after we leave.",
    link: { label: "See the approach", href: "/approach" },
  },
} as const;

export const leadMagnets = {
  briefSheet: {
    heading: "Get the cheat sheet",
    description: "Enter your email and the PDF is yours straight away.",
    button: "Send me the PDF",
    newsletterOptIn: "Also send me the Phrenos.ai AI briefing for business leaders.",
  },
  readiness: {
    eyebrow: "Free tool",
    title: "How ready is your organisation for AI?",
    description:
      "Eight quick questions. See where you stand across strategy, data, workflows, people and governance, and where to start.",
    href: "/resources/ai-readiness",
  },
} as const;

export const authorBox = {
  name: "Sophia Livanos",
  role: "Founder, Phrenos.ai",
  photo: "/brand/sophia-livanos.jpg",
  bio: "Osteopathy taught me how people work. Neurolinguistics taught me how they think. I bring both to AI, so it strengthens your people’s judgement instead of replacing it.",
  cta: "Book a free intro call",
} as const;
