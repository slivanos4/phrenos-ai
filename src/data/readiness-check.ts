/** The AI readiness check: eight questions, four answers each (scored 0 to 3), grouped into five areas. */

export type ReadinessArea = "strategy" | "data" | "workflows" | "people" | "governance";

export const readinessAreas: Record<ReadinessArea, { label: string; firstStep: string }> = {
  strategy: {
    label: "Strategy and priorities",
    firstStep:
      "Pick the two or three AI opportunities with the clearest commercial return, give each an owner and a measure, and park the rest.",
  },
  data: {
    label: "Data you can trust",
    firstStep:
      "Choose one decision your leaders make every week and make its data reliable and easy to reach before you automate anything around it.",
  },
  workflows: {
    label: "Workflows and automation",
    firstStep:
      "List your most repetitive reports and admin tasks, then automate the one that costs the most expert time, with a human checking the output.",
  },
  people: {
    label: "People and confidence",
    firstStep:
      "Start with a short, practical session for the teams who would benefit most, built around their real work rather than generic prompts.",
  },
  governance: {
    label: "Governance and measurement",
    firstStep:
      "Write a one-page rule set covering what AI may be used for, who signs off, and how you will measure whether it is paying off.",
  },
};

export type ReadinessQuestion = {
  id: string;
  area: ReadinessArea;
  question: string;
  options: readonly [string, string, string, string];
};

export const readinessQuestions: readonly ReadinessQuestion[] = [
  {
    id: "q1",
    area: "strategy",
    question: "How would you describe your organisation’s AI strategy today?",
    options: [
      "We don’t have one",
      "Individuals experiment on their own",
      "We have priorities, but no funded plan",
      "A funded roadmap tied to commercial goals",
    ],
  },
  {
    id: "q2",
    area: "strategy",
    question: "How do you decide which AI opportunities to pursue?",
    options: [
      "We don’t, ideas come up ad hoc",
      "Case by case, led by whoever is keenest",
      "We rank ideas by value and effort",
      "A tracked pipeline with clear owners and measures",
    ],
  },
  {
    id: "q3",
    area: "data",
    question: "How easy is it to get reliable data for an important decision?",
    options: [
      "Hard: it sits in spreadsheets and inboxes",
      "Possible, but it takes days of manual work",
      "Mostly accessible, with some gaps",
      "Trusted and available when we need it",
    ],
  },
  {
    id: "q4",
    area: "workflows",
    question: "How much of your recurring reporting and admin is still done by hand?",
    options: ["Most of it", "A large share", "Some of it", "Very little, it’s automated"],
  },
  {
    id: "q5",
    area: "workflows",
    question: "Where you already use AI, is it part of a repeatable process?",
    options: [
      "We don’t use AI yet",
      "Only as one-off prompts",
      "In a few workflows",
      "Built into core workflows, with human checkpoints",
    ],
  },
  {
    id: "q6",
    area: "people",
    question: "How confident are your teams using AI in their daily work?",
    options: [
      "Most people avoid it",
      "A few enthusiasts",
      "Many people use it, but unevenly",
      "Trained, confident and consistent",
    ],
  },
  {
    id: "q7",
    area: "governance",
    question: "Do your people know what AI may and may not be used for?",
    options: [
      "There’s no guidance",
      "Informal advice only",
      "A written policy that is rarely followed up",
      "Clear rules, named owners and human sign-off",
    ],
  },
  {
    id: "q8",
    area: "governance",
    question: "How do you know whether your AI efforts are paying off?",
    options: [
      "We don’t measure it",
      "Mostly anecdotes",
      "Some metrics on some projects",
      "Clear measures, reviewed regularly",
    ],
  },
] as const;

export type ReadinessTier = {
  key: "starting" | "building" | "scaling";
  label: string;
  headline: string;
  summary: string;
  nextSteps: readonly string[];
};

export const readinessTiers: readonly ReadinessTier[] = [
  {
    key: "starting",
    label: "Starting out",
    headline: "You have room to move fast, once the foundations are in place.",
    summary:
      "AI is mostly ad hoc in your organisation right now. That’s a common place to be, and it means the biggest gains come from choosing a few well-aimed bets rather than doing more of everything.",
    nextSteps: [
      "Agree two or three priority use cases with the clearest commercial return.",
      "Fix the data behind one weekly decision so the first project has something solid to stand on.",
      "Set simple ground rules for AI use so people can experiment safely.",
    ],
  },
  {
    key: "building",
    label: "Building momentum",
    headline: "You have real energy. Now it needs direction and structure.",
    summary:
      "You’re using AI in places and people are keen, but results are uneven. The next step is turning scattered effort into a plan leadership can fund, measure and repeat.",
    nextSteps: [
      "Rank your current ideas by value and effort, and stop the ones that won’t pay back.",
      "Turn your best pilot into a repeatable workflow with a human checkpoint.",
      "Agree how you will measure return, and review it every month.",
    ],
  },
  {
    key: "scaling",
    label: "Ready to scale",
    headline: "Your foundations are strong. The question is where to point them.",
    summary:
      "You have strategy, data and habits in decent shape. The opportunity now is deeper automation and sharper competitive advantage, while keeping oversight tight as the systems do more.",
    nextSteps: [
      "Look for the next high-value workflow to automate end to end.",
      "Stress-test your governance as AI takes on more autonomous work.",
      "Build the capability inside the team so the gains outlast any engagement.",
    ],
  },
] as const;

export type ReadinessResult = {
  percent: number;
  tier: ReadinessTier;
  areas: { area: ReadinessArea; label: string; percent: number }[];
  weakest: ReadinessArea;
};

/** answers maps a question id to the chosen option index (0 to 3). */
export function scoreReadiness(answers: Record<string, number>): ReadinessResult {
  const totals: Record<ReadinessArea, { got: number; max: number }> = {
    strategy: { got: 0, max: 0 },
    data: { got: 0, max: 0 },
    workflows: { got: 0, max: 0 },
    people: { got: 0, max: 0 },
    governance: { got: 0, max: 0 },
  };
  let got = 0;
  let max = 0;
  for (const question of readinessQuestions) {
    const value = Math.min(3, Math.max(0, answers[question.id] ?? 0));
    totals[question.area].got += value;
    totals[question.area].max += 3;
    got += value;
    max += 3;
  }
  const percent = Math.round((got / max) * 100);
  const areas = (Object.keys(totals) as ReadinessArea[]).map((area) => ({
    area,
    label: readinessAreas[area].label,
    percent: Math.round((totals[area].got / totals[area].max) * 100),
  }));
  const weakest = [...areas].sort((a, b) => a.percent - b.percent)[0].area;
  const tier = percent < 35 ? readinessTiers[0] : percent < 65 ? readinessTiers[1] : readinessTiers[2];
  return { percent, tier, areas, weakest };
}
