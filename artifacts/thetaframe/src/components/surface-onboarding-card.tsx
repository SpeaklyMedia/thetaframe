import type { OnboardingSurface } from "@/hooks/use-onboarding";

export const SURFACE_ONBOARDING_COPY: Record<
  OnboardingSurface,
  {
    label: string;
    intro: string;
    purpose: string;
    firstStep: string;
  }
> = {
  daily: {
    label: "Daily Frame",
    intro: "You are looking at your working view for today.",
    purpose: "It helps you match the day to your energy, pick your must-do tasks, and shape a realistic rhythm.",
    firstStep: "Pick the color that matches your current state, then add at least one Tier A task.",
  },
  weekly: {
    label: "Weekly Rhythm",
    intro: "You are looking at the week-level planning space.",
    purpose: "It gives your week a theme, keeps your top steps visible, and holds your recovery plan before things get noisy.",
    firstStep: "Name the week, then add one step you want to protect this week.",
  },
  vision: {
    label: "Vision Tracker",
    intro: "You are looking at the long-view planning surface.",
    purpose: "It keeps your bigger goals and the next visible steps in the same place so the work stays grounded.",
    firstStep: "Write one goal you are building toward and one next visible step.",
  },
  bizdev: {
    label: "BizDev",
    intro: "You are looking at your lead and opportunity tracker.",
    purpose: "It keeps brands, next touches, blockers, and money in view so outreach does not disappear into memory.",
    firstStep: "Create your first lead with a brand name and the next action you want to take.",
  },
  "life-ledger": {
    label: "Life Ledger",
    intro: "You are looking at the obligations and commitments map for your life.",
    purpose: "It helps you hold people, deadlines, bills, subscriptions, and travel in one organized place.",
    firstStep: "Open the tab that matters most right now and save one real entry.",
  },
  reach: {
    label: "REACH",
    intro: "You are looking at the file bundle manager.",
    purpose: "It keeps the documents and assets you need close by so they are easy to upload, open, and reuse.",
    firstStep: "Upload one file you actually need in your workflow and add a short note if it needs context.",
  },
  admin: {
    label: "Admin",
    intro: "You are looking at the access control lane for the app.",
    purpose: "It lets you review users, control which modules they can reach, and save reusable permission presets.",
    firstStep: "Open a user and make one real permission or preset change when you are ready to manage access.",
  },
};

export function SurfaceOnboardingCard({
  surface,
}: {
  surface: OnboardingSurface;
}) {
  const copy = SURFACE_ONBOARDING_COPY[surface];

  return (
    <section
      className="rounded-2xl border bg-accent/30 px-5 py-4 shadow-sm space-y-2"
      data-testid={`surface-onboarding-${surface}`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Getting Started
      </p>
      <h2 className="text-lg font-semibold">{copy.label}</h2>
      <p className="text-sm text-foreground">{copy.intro}</p>
      <p className="text-sm text-muted-foreground">{copy.purpose}</p>
      <p className="text-sm font-medium">{copy.firstStep}</p>
    </section>
  );
}
