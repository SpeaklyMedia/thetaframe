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
    label: "Today",
    intro: "This is your work view for today.",
    purpose: "It helps you set a workspace color, choose must-do tasks, and keep extra tasks out of your head.",
    firstStep: "Add one must-do. Extra tasks can wait.",
  },
  weekly: {
    label: "This Week",
    intro: "This is your plan for the week.",
    purpose: "It helps you name the week, pick main steps, and make a backup plan.",
    firstStep: "Name the week, then add one week step.",
  },
  vision: {
    label: "Goals",
    intro: "This is your long-view planning space.",
    purpose: "It keeps big goals and next steps in one place.",
    firstStep: "Write one goal and one next step.",
  },
  bizdev: {
    label: "FollowUps",
    intro: "You are looking at the people and organizations you said you would get back to.",
    purpose: "It keeps next promises, reminder dates, blockers, and context in view so follow-ups do not have to live in memory.",
    firstStep: "Add one FollowUp with the person or organization and what you said you would do next.",
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
