export type BasicLane = "daily" | "weekly" | "vision";

export type BasicLaneStep = {
  lane: BasicLane;
  label: string;
  plainLabel: string;
  href: string;
  headline: string;
  nextStep: string;
  resetStep: string;
  primaryAction: string;
};

export type BasicAITimeSaver = {
  lane: BasicLane;
  title: string;
  description: string;
  reviewPolicy: string;
};

export type BasicLaneActionStep = {
  stepNumber: number;
  title: string;
  description: string;
  actionLabel: string;
};

export const BASIC_LANE_ORDER: readonly BasicLane[] = ["daily", "weekly", "vision"] as const;

export const BASIC_LANE_STEPS: Record<BasicLane, BasicLaneStep> = {
  daily: {
    lane: "daily",
    label: "Daily Frame",
    plainLabel: "Today",
    href: "/daily",
    headline: "Start with one thing for today.",
    nextStep: "Set your workspace color if it helps, then add one must-do. Extra tasks can wait.",
    resetStep: "If today feels too full, keep one must-do and move the rest out of your head.",
    primaryAction: "Open Today",
  },
  weekly: {
    lane: "weekly",
    label: "Weekly Rhythm",
    plainLabel: "This Week",
    href: "/weekly",
    headline: "Give this week one simple shape.",
    nextStep: "Name the week, then add one step you want to protect.",
    resetStep: "If the week feels noisy, pick one step worth protecting before adding more.",
    primaryAction: "Open This Week",
  },
  vision: {
    lane: "vision",
    label: "Vision Tracker",
    plainLabel: "Goals",
    href: "/vision",
    headline: "Turn a big idea into one next step.",
    nextStep: "Add one goal and one next step you can see.",
    resetStep: "If the goal feels vague, write only the next visible step you can recognize.",
    primaryAction: "Open Goals",
  },
};

export const BASIC_LANE_ACTION_STEPS: Record<BasicLane, readonly BasicLaneActionStep[]> = {
  daily: [
    {
      stepNumber: 1,
      title: "Add one must-do",
      description: "Choose the one task that matters most today.",
      actionLabel: "Add must-do",
    },
    {
      stepNumber: 2,
      title: "Add later tasks if needed",
      description: "Put extra tasks here so they are out of your head.",
      actionLabel: "Add later task",
    },
    {
      stepNumber: 3,
      title: "Add a simple time plan",
      description: "Add time only if it helps you start.",
      actionLabel: "Add time block",
    },
    {
      stepNumber: 4,
      title: "Save a small win",
      description: "End with one small thing that went right.",
      actionLabel: "Add small win",
    },
  ],
  weekly: [
    {
      stepNumber: 1,
      title: "Name this week",
      description: "Give the week a short name or theme.",
      actionLabel: "Name this week",
    },
    {
      stepNumber: 2,
      title: "Add main steps",
      description: "Write one to three steps for the week.",
      actionLabel: "Add week step",
    },
    {
      stepNumber: 3,
      title: "Add what must stay steady",
      description: "List the basics that help you stay okay.",
      actionLabel: "Add must-keep item",
    },
    {
      stepNumber: 4,
      title: "Add a backup plan",
      description: "Write what to do if the week gets hard.",
      actionLabel: "Add backup plan",
    },
  ],
  vision: [
    {
      stepNumber: 1,
      title: "Add one goal",
      description: "Write one thing you want to build or change.",
      actionLabel: "Add goal",
    },
    {
      stepNumber: 2,
      title: "Add one next step",
      description: "Write the next step you can actually see.",
      actionLabel: "Add next step",
    },
    {
      stepNumber: 3,
      title: "Review your goals",
      description: "Keep what helps. Change what does not.",
      actionLabel: "Review goals",
    },
  ],
};

export const BASIC_AI_TIME_SAVERS: Record<BasicLane, BasicAITimeSaver> = {
  daily: {
    lane: "daily",
    title: "AI can sort a messy today list",
    description: "A brain dump can become must-dos, later tasks, time blocks, and one small win.",
    reviewPolicy: "AI can make a draft. You choose what to save.",
  },
  weekly: {
    lane: "weekly",
    title: "AI can sort messy weekly notes",
    description: "Loose notes can become a theme, week steps, must-keep items, and a backup plan.",
    reviewPolicy: "AI can make a draft. You choose what to save.",
  },
  vision: {
    lane: "vision",
    title: "AI can turn big ideas into next steps",
    description: "Long-term ideas can become goals with next steps you can see.",
    reviewPolicy: "AI can make a draft. You choose what to save.",
  },
};
