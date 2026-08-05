export const site = {
  name: "Phrenos.ai",
  tagline: "AI Strategy & Automation",
  definition: "phren·os (n.): mind, intellect, reason",
  description:
    "An independent AI consultancy helping businesses turn Generative AI, data and automation into measurable operational and commercial impact.",
  email: "hello@phrenos.ai",
  linkedin: "https://www.linkedin.com/in/sophia-livanos-45144b22",
} as const;

export const navigation = [
  { label: "Home", href: "/" },
  { label: "Consultancy", href: "/consultancy" },
  { label: "Approach", href: "/approach" },
  { label: "Work", href: "/work" },
  { label: "AI Updates", href: "/ai-updates" },
  { label: "About", href: "/about" },
  { label: "Contact Us", href: "/contact" },
] as const;

export const headerCta = {
  label: "Start a Conversation",
  href: "/contact",
} as const;

export const hero = {
  eyebrow: "AI STRATEGY, AUTOMATION & INNOVATION",
  headline: "The Mind in the Machine.",
  supporting:
    "Technology changes quickly, but curiosity, critical thinking and good judgement never go out of style.",
  secondary: {
    lead: "We're helping businesses turn Generative AI, data and automation into measurable impact because ",
    emphasis:
      "the best use of AI doesn't replace expertise, creativity or human judgement; it amplifies them.",
  },
  primaryCta: {
    prefix: "",
    ai: "AI",
    suffix: "m for Impact",
    href: "/contact",
  },
  secondaryCta: {
    prefix: "Meet the ",
    ai: "AI",
    suffix: " Mind",
    href: "/about",
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
      "Clarify where Generative AI creates commercial value, set priorities that leadership can act on, and build a practical path from ambition to adoption.",
    points: [
      "Board-ready opportunity maps with clear commercial bets.",
      "Prioritised adoption roadmaps leadership can fund and follow.",
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
    title: "AI-Powered Content Systems",
    short: "Content",
    description:
      "Design governed content engines that scale production, preserve brand voice and keep human judgement in the loop where it matters.",
    points: [
      "Scalable content factories with built-in governance.",
      "Brand-aligned outputs across formats, channels and markets.",
      "Human-in-the-loop workflows that elevate judgement.",
      "Measurable impact through content intelligence and feedback loops.",
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
    "Phrenos.ai identifies high-value opportunities, designs practical systems, implements them responsibly and helps teams adopt them successfully.",
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
    label: "Start a Conversation",
    href: "/contact",
  },
} as const;

export const contactCta = {
  heading: "Bring intelligence to the work that matters.",
  supporting:
    "A short note is enough to begin. Tell us where the friction is, and we’ll help find the leverage.",
  button: {
    label: "Start a Conversation",
    href: "/contact#contact-form",
  },
} as const;

export const contactPage = {
  eyebrow: "Contact",
  title: "Start a conversation.",
  description:
    "A short note is enough to begin. Tell us a little about your organisation, and let’s find where AI, data or automation can create real leverage.",
  fields: {
    name: "Full name",
    email: "Work email",
    organisation: "Organisation",
    role: "Role",
    message: "Where should we look first?",
    submit: "Send message",
  },
  success:
    "Thank you. Your message is ready to send. We’ll be in touch shortly.",
} as const;

export const footer = {
  links: [
    { label: "Work", href: "/work" },
    { label: "Approach", href: "/approach" },
    { label: "AI Updates", href: "/ai-updates" },
    { label: "About", href: "/about" },
    { label: "Contact Us", href: "/contact" },
  ],
} as const;
