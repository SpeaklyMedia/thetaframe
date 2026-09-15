import type {
  DailyFrame,
  DailyReflection,
  RoutineSession,
  TierTask,
} from "@workspace/api-client-react";

export type RoutineMode = "full" | "short" | "minimum";
export type RoutineKey = "morning" | "night";
export type RoutineCompletionState = "not_started" | "in_progress" | "complete";

export type RoutineStep = {
  key: string;
  icon: string;
  label: string;
  description: string;
};

export type DailyCommitmentSlot = {
  key: "family" | "wealth" | "self";
  icon: string;
  label: string;
  description: string;
};

export const MORNING_STEPS: readonly RoutineStep[] = [
  {
    key: "hydrate",
    icon: "💧",
    label: "Hydrate",
    description: "Wake, water, simple physical start.",
  },
  {
    key: "outside_light",
    icon: "🌤️",
    label: "Outside / Light",
    description:
      "Daylight, fresh air, curtains, or reconnecting with the physical day.",
  },
  {
    key: "move",
    icon: "👟",
    label: "Move",
    description: "Walk, stretch, mobility, or brief body activation.",
  },
  {
    key: "center",
    icon: "🛡️",
    label: "Center",
    description:
      "Identity, calm, intention, gratitude, breath, or a short journal note.",
  },
  {
    key: "family",
    icon: "🏠",
    label: "Family",
    description: "Remember the people, home, and responsibilities that matter.",
  },
  {
    key: "wealth",
    icon: "🌳",
    label: "Wealth",
    description:
      "Name the action that builds future security, leverage, stewardship, or business strength.",
  },
  {
    key: "command",
    icon: "🧭",
    label: "Command",
    description:
      "Enter ThetaFrame and choose the day before external inputs do.",
  },
] as const;

export const NIGHT_STEPS: readonly RoutineStep[] = [
  {
    key: "capture",
    icon: "📥",
    label: "Capture",
    description: "Move open loops out of memory and into ThetaFrame.",
  },
  {
    key: "review",
    icon: "📓",
    label: "Review",
    description: "Name one win, one slip, and one lesson.",
  },
  {
    key: "choose",
    icon: "🎯",
    label: "Choose",
    description: "Pre-decide tomorrow's first meaningful action.",
  },
  {
    key: "prepare",
    icon: "🧺",
    label: "Prepare",
    description: "Reduce tomorrow's physical or practical friction.",
  },
  {
    key: "sleep",
    icon: "🌙",
    label: "Sleep",
    description: "Close the planning loop for the night.",
  },
] as const;

export const ROUTINE_MODE_LABELS: Record<
  RoutineMode,
  { label: string; description: string }
> = {
  full: {
    label: "Full",
    description: "Use every step when the morning has room.",
  },
  short: {
    label: "Short",
    description: "Keep the identity, reduce the ceremony.",
  },
  minimum: {
    label: "Minimum",
    description: "Shrink the routine instead of abandoning it.",
  },
};

export const DAILY_COMMITMENT_SLOTS: readonly DailyCommitmentSlot[] = [
  {
    key: "family",
    icon: "🏠",
    label: "Family Win",
    description:
      "One action for family, home, relationships, responsibilities, or household stability.",
  },
  {
    key: "wealth",
    icon: "🌳",
    label: "Wealth Win",
    description:
      "One action for long-term security, business strength, earning power, leverage, or stewardship.",
  },
  {
    key: "self",
    icon: "🛡️",
    label: "Self Win",
    description:
      "One action for health, learning, recovery, mental state, growth, or well-being.",
  },
] as const;

const REQUIRED_MORNING_STEPS_BY_MODE: Record<RoutineMode, readonly string[]> = {
  full: MORNING_STEPS.map((step) => step.key),
  short: ["hydrate", "outside_light", "move", "center", "command"],
  minimum: ["hydrate", "center", "command"],
};

export function getRoutineSession(
  sessions: RoutineSession[] | undefined,
  routineKey: RoutineKey,
): RoutineSession | null {
  return sessions?.find((session) => session.routineKey === routineKey) ?? null;
}

export function getCompletedStepKeys(
  session: RoutineSession | null | undefined,
): string[] {
  return Array.isArray(session?.completedStepKeys)
    ? session.completedStepKeys
    : [];
}

export function getMorningRequiredStepKeys(
  mode: RoutineMode,
): readonly string[] {
  return REQUIRED_MORNING_STEPS_BY_MODE[mode];
}

export function canCompleteMorning(
  mode: RoutineMode,
  completedStepKeys: readonly string[],
): boolean {
  const completed = new Set(completedStepKeys);
  return REQUIRED_MORNING_STEPS_BY_MODE[mode].every((key) =>
    completed.has(key),
  );
}

export function toggleStepKey(
  completedStepKeys: readonly string[],
  stepKey: string,
): string[] {
  const completed = new Set(completedStepKeys);
  if (completed.has(stepKey)) {
    completed.delete(stepKey);
  } else {
    completed.add(stepKey);
  }
  return Array.from(completed);
}

export function getCommitmentValue(tierA: TierTask[], index: number): string {
  return tierA[index]?.text ?? "";
}

export function getCommitmentCompleted(
  tierA: TierTask[],
  index: number,
): boolean {
  return tierA[index]?.completed ?? false;
}

export function setCommitmentSlot(
  tierA: TierTask[],
  index: number,
  value: string,
  completed?: boolean,
): TierTask[] {
  const next = [...tierA].slice(0, DAILY_COMMITMENT_SLOTS.length);
  for (let i = 0; i <= index; i += 1) {
    next[i] ??= {
      id: `daily-rhythm-${DAILY_COMMITMENT_SLOTS[i].key}`,
      text: "",
      completed: false,
    };
  }
  next[index] = {
    ...next[index],
    text: value,
    completed: completed ?? next[index].completed,
  };
  return next;
}

export function getFirstActionValue(
  firstAction: string | null | undefined,
  previousReflection?: DailyReflection | null,
): string {
  return firstAction || previousReflection?.firstActionTomorrow || "";
}

export function normalizeFirstAction(value: string): string | null {
  const trimmedValue = value.trim();
  return trimmedValue || null;
}

export function getDashboardFirstAction(
  frame: DailyFrame | undefined,
  previousReflection?: DailyReflection | null,
): string {
  return getFirstActionValue(frame?.firstAction, previousReflection);
}

export function getDashboardCommitments(
  frame: DailyFrame | undefined,
): string[] {
  const tierA = (frame?.tierA as TierTask[] | undefined) ?? [];
  return DAILY_COMMITMENT_SLOTS.map((_, index) =>
    getCommitmentValue(tierA, index),
  );
}

export function getRoutineStatusLabel(
  session: RoutineSession | null | undefined,
): string {
  if (!session) return "Not started";
  if (session.completionState === "complete")
    return `Complete · ${ROUTINE_MODE_LABELS[session.mode].label} mode`;
  if (session.completionState === "in_progress")
    return `In progress · ${ROUTINE_MODE_LABELS[session.mode].label} mode`;
  return "Not started";
}
