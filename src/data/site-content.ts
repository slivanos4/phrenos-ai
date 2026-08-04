export const site = {
  name: "Phrenos.ai",
  tagline: "AI Strategy & Automation",
  definition: "phren·os (n.) — mind, intellect, reason",
  description:
    "An independent AI consultancy helping businesses turn Generative AI, data and automation into measurable operational and commercial impact.",
  email: "hello@phrenos.ai",
  linkedin: "https://www.linkedin.com/",
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
    description:
      "Clarify where Generative AI creates commercial value, set priorities that leadership can act on, and build a practical path from ambition to adoption.",
  },
  {
    title: "Intelligent Workflow Automation",
    description:
      "Redesign repetitive operational processes into reliable AI-assisted workflows that free expert time and reduce costly manual friction.",
  },
  {
    title: "AI-Powered Content Systems",
    description:
      "Design governed content engines that scale production, preserve brand voice and keep human judgement in the loop where it matters.",
  },
  {
    title: "Competitive Intelligence & Analytics",
    description:
      "Turn fragmented market signals into structured insight so teams can anticipate competitors, customers and commercial opportunity sooner.",
  },
  {
    title: "AI Training & Team Enablement",
    description:
      "Equip leaders and practitioners with the fluency, judgement and working habits needed to use AI responsibly and productively every day.",
  },
] as const;

export const approach = {
  intro:
    "Phrenos.ai identifies high-value opportunities, designs practical systems, implements them responsibly and helps teams adopt them successfully.",
  stages: [
    {
      number: "01",
      title: "Understand",
      description:
        "Map the organisation, workflows and commercial goals to uncover where AI, data and automation can create meaningful leverage.",
    },
    {
      number: "02",
      title: "Prioritise",
      description:
        "Select the opportunities with the strongest operational and commercial return, then define a clear, staged path to value.",
    },
    {
      number: "03",
      title: "Build",
      description:
        "Design and implement practical systems with the right balance of automation, governance, human oversight and measurable outcomes.",
    },
    {
      number: "04",
      title: "Embed",
      description:
        "Train teams, refine ways of working and leave behind capabilities that continue to deliver after the engagement ends.",
    },
  ],
} as const;

export const selectedWork = [
  {
    title: "AI-Powered Competitive Intelligence Platform",
    problem:
      "Market and competitor signals were scattered across sources, slowing strategic response and leaving teams reliant on incomplete manual research.",
    solution:
      "An AI-assisted intelligence platform that gathers, structures and surfaces competitive insight for faster, clearer commercial decision-making.",
    impact:
      "Teams gained a repeatable intelligence rhythm, reducing research friction and improving the quality of competitive briefings.",
  },
  {
    title: "Enterprise AI Content Generation Platform",
    problem:
      "Content demand was growing faster than internal capacity, creating bottlenecks and inconsistent quality across channels.",
    solution:
      "A governed enterprise content platform combining AI generation with editorial controls, brand standards and human review.",
    impact:
      "Content operations scaled without sacrificing voice, accuracy or the judgement of subject-matter experts.",
  },
  {
    title: "AI Brand Review Governance Platform",
    problem:
      "Brand and compliance review was slow, fragmented and difficult to audit as content volume increased.",
    solution:
      "An AI-supported review workflow that flags risk, guides reviewers and creates a clearer trail of brand governance decisions.",
    impact:
      "Review cycles became more consistent, transparent and manageable for brand, legal and marketing stakeholders.",
  },
  {
    title: "Content Buddy: AI Knowledge Assistant",
    problem:
      "Institutional knowledge was hard to find, leaving teams re-asking the same questions and recreating work that already existed.",
    solution:
      "A conversational AI knowledge assistant grounded in approved organisational content and processes.",
    impact:
      "Staff could locate guidance faster, reducing repeated queries and improving day-to-day operational confidence.",
  },
] as const;

export const aboutPreview = {
  eyebrow: "About Phrenos",
  heading: "Understanding the machine — and the minds expected to use it.",
  narrative: [
    "The founder’s route into AI began in medicine, neuroscience and neurolinguistics rather than conventional software engineering. That understanding of language, cognition and human behaviour developed into hands-on work with NLP systems, AI-assisted content operations, automation and enterprise AI adoption.",
    "This background is a strategic advantage: Phrenos.ai understands both the machine and the people expected to use it — designing systems that fit how organisations actually think, decide and work.",
  ],
  cta: {
    label: "Meet the AI Mind",
    href: "/about",
  },
} as const;

export const contactCta = {
  heading: "Bring intelligence to the work that matters.",
  supporting:
    "Let’s identify where AI, data and automation can create meaningful impact inside your organisation.",
  button: {
    label: "Contact Us",
    href: "/contact",
  },
} as const;

export const contactPage = {
  eyebrow: "Contact",
  title: "Start a conversation.",
  description:
    "Tell us a little about your organisation and where AI, data or automation might create meaningful impact. We’ll respond thoughtfully.",
  fields: {
    name: "Full name",
    email: "Work email",
    organisation: "Organisation",
    role: "Role",
    message: "How can we help?",
    submit: "Send message",
  },
  success:
    "Thank you — your message is ready to send. We’ll be in touch shortly.",
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
