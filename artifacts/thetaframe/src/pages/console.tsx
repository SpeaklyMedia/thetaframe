import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Compass,
  Gauge,
  GitBranch,
  Layers3,
  ListTodo,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";
import {
  getGetBizdevSummaryQueryKey,
  getGetDailyFrameQueryKey,
  getGetLifeLedgerEventReminderQueueQueryKey,
  getGetVisionFrameQueryKey,
  getGetWeeklyFrameQueryKey,
  getListAiDraftsQueryKey,
  getListBizdevBrandsQueryKey,
  getListLifeLedgerEntriesQueryKey,
  getListReachFilesQueryKey,
  type AIDraft,
  type BizdevBrand,
  type BizdevSummary,
  type LifeLedgerEntry,
  type LifeLedgerEventReminderQueueItem,
  type ReachFile,
  type TierTask,
  type TimeBlock,
  type VisionGoal,
  type WeeklyStep,
  useGetBizdevSummary,
  useGetDailyFrame,
  useGetLifeLedgerEventReminderQueue,
  useGetVisionFrame,
  useGetWeeklyFrame,
  useListAiDrafts,
  useListBizdevBrands,
  useListLifeLedgerEntries,
  useListReachFiles,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { LaneHero } from "@/components/shell/LaneHero";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/hooks/use-auth-session";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import {
  dailyAIDraftListParams,
  getAIDraftKindLabel,
  getAIDraftPayloadSummary,
  getAIDraftReviewStateLabel,
  getAIDraftSourceRefChips,
  getAIDraftTargetSurfaceLabel,
  getLifeLedgerAIDraftListParams,
  reachAIDraftListParams,
  visionAIDraftListParams,
  weeklyAIDraftListParams,
} from "@/lib/ai-draft-review";
import { getMondayOfCurrentWeek, getTodayDateString } from "@/lib/dates";
import { getReminderToneCopy } from "@/lib/user-preferences";
import { cn } from "@/lib/utils";
import { resolveAIDraftDescriptor } from "@/lib/ai-draft-mapping";

type LaneAtlasItem = {
  key: string;
  href: string;
  label: string;
  description: string;
};

type ConsoleModuleCardProps = {
  title: string;
  purpose?: string;
  status: string;
  testId: string;
  accentClassName?: string;
  className?: string;
  contentClassName?: string;
  purposeClassName?: string;
  isSelected?: boolean;
  onSelect?: () => void;
  selectedSummary?: React.ReactNode;
  children?: React.ReactNode;
};

type ConsoleRegionKey =
  | "now-frame"
  | "week-vector"
  | "constraint-horizon"
  | "lane-atlas"
  | "system-health"
  | "assistant-review"
  | "continuity"
  | "reach-capture"
  | "bizdev-motion"
  | "system-notes";

type NowFrameSource = "tier-a" | "tier-b" | "time-block" | "micro-win" | "empty";

type NowFrameContent = {
  source: NowFrameSource;
  sourceLabel: string;
  primaryText: string;
  supportingText: string;
  ctaLabel: string;
};

type WeekVectorContent = {
  theme: string | null;
  steps: WeeklyStep[];
  nonNegotiables: WeeklyStep[];
  recoveryPlan: string | null;
};

type ConstraintFallbackEvent = {
  id: number;
  name: string;
  executionDate: string;
  route: string;
};

type ContinuityMode = "goal-and-step" | "goal-only" | "step-only" | "empty";

type ContinuityContent = {
  mode: ContinuityMode;
  label: string;
  primaryText: string;
  supportingText: string;
  nextStepText: string | null;
  ctaLabel: string;
};

type AssistantReviewRow = {
  draft: AIDraft;
  route: string;
  routeLabel: string;
  laneLabel: string;
};

type ProgressStat = {
  completed: number;
  total: number;
};

type ReviewPressureCounts = {
  draft: number;
  needsReview: number;
  approvalGated: number;
};

type ConstraintUrgencyCounts = {
  dueNow: number;
  near: number;
  staged: number;
  source: "reminders" | "fallback" | "empty";
};

type LaneReadinessChip = {
  key: "daily" | "weekly" | "vision";
  label: string;
  text: string;
  ready: boolean;
};

type BizdevPhase = "COLD" | "WARM" | "HOT";

type BizdevMotionChip = {
  key: "hot" | "warm" | "cold";
  label: string;
  count: number;
  accent: boolean;
};

const CORE_LANE_ATLAS: readonly LaneAtlasItem[] = [
  {
    key: "daily",
    href: "/daily",
    label: "Today",
    description: "Open the current-day execution lane.",
  },
  {
    key: "weekly",
    href: "/weekly",
    label: "This Week",
    description: "Open the weekly rhythm and recovery lane.",
  },
  {
    key: "vision",
    href: "/vision",
    label: "Goals",
    description: "Open the long-horizon goals and next steps lane.",
  },
];

const OPTIONAL_LANE_ATLAS: readonly LaneAtlasItem[] = [
  {
    key: "bizdev",
    href: "/bizdev",
    label: "FollowUps",
    description: "Open people and promise follow-up work.",
  },
  {
    key: "life-ledger",
    href: "/life-ledger?tab=events",
    label: "Life Ledger",
    description: "Open obligations, events, and personal logistics.",
  },
  {
    key: "reach",
    href: "/reach",
    label: "REACH",
    description: "Open private file intake and artifact review.",
  },
];

const REVIEW_STATES = new Set<AIDraft["reviewState"]>(["draft", "needs_review", "approval_gated"]);
const BIZDEV_PHASE_PRIORITY: Record<BizdevPhase, number> = {
  HOT: 0,
  WARM: 1,
  COLD: 2,
};
const BIZDEV_PHASE_LABELS: Record<BizdevPhase, string> = {
  HOT: "Needs attention",
  WARM: "Soon",
  COLD: "Later",
};

function countReviewDrafts(drafts: AIDraft[] | undefined): number {
  return drafts?.filter((draft) => REVIEW_STATES.has(draft.reviewState)).length ?? 0;
}

function hasTaskText(task: TierTask | undefined): boolean {
  return Boolean(task?.text?.trim());
}

function getFirstIncompleteTask(tasks: TierTask[] | undefined): TierTask | null {
  return tasks?.find((task) => !task.completed && hasTaskText(task)) ?? null;
}

function getTaskProgress(tasks: TierTask[] | undefined): ProgressStat {
  const relevantTasks = (tasks ?? []).filter(hasTaskText);
  return {
    completed: relevantTasks.filter((task) => task.completed).length,
    total: relevantTasks.length,
  };
}

function getFirstNonEmptyTimeBlock(timeBlocks: TimeBlock[] | undefined): TimeBlock | null {
  return (
    timeBlocks?.find((timeBlock) =>
      Boolean(timeBlock.action?.trim()) || Boolean(timeBlock.startTime?.trim()),
    ) ?? null
  );
}

function formatTimeBlockLabel(timeBlock: TimeBlock): string {
  const action = timeBlock.action?.trim();
  const startTime = timeBlock.startTime?.trim();

  if (action && startTime) {
    return `${startTime} · ${action}`;
  }
  if (action) {
    return action;
  }
  if (startTime) {
    return `${startTime} focus block`;
  }

  return "Time block ready";
}

function getNowFrameContent(frame: {
  tierA?: unknown;
  tierB?: unknown;
  timeBlocks?: unknown;
  microWin?: string | null;
} | null | undefined): NowFrameContent {
  const tierA = getFirstIncompleteTask((frame?.tierA as TierTask[] | undefined) ?? []);
  if (tierA) {
    return {
      source: "tier-a",
      sourceLabel: "Must Do Today",
      primaryText: tierA.text.trim(),
      supportingText: "Pulled from the first incomplete Today priority so Console can surface one clear move without creating another queue.",
      ctaLabel: "Open Today",
    };
  }

  const tierB = getFirstIncompleteTask((frame?.tierB as TierTask[] | undefined) ?? []);
  if (tierB) {
    return {
      source: "tier-b",
      sourceLabel: "Can Do Later",
      primaryText: tierB.text.trim(),
      supportingText: "No unfinished Tier A item is leading right now, so Console falls through to the first incomplete later task.",
      ctaLabel: "Open Today",
    };
  }

  const timeBlock = getFirstNonEmptyTimeBlock((frame?.timeBlocks as TimeBlock[] | undefined) ?? []);
  if (timeBlock) {
    return {
      source: "time-block",
      sourceLabel: "Time Shape",
      primaryText: formatTimeBlockLabel(timeBlock),
      supportingText: "No unfinished Daily task is leading, so Console uses the first saved time shape as the safest orienting object.",
      ctaLabel: "Open Today",
    };
  }

  const microWin = frame?.microWin?.trim();
  if (microWin) {
    return {
      source: "micro-win",
      sourceLabel: "Small Win",
      primaryText: microWin,
      supportingText: "With no active task or time block leading, Console anchors on the saved Daily small win instead of inventing a new summary.",
      ctaLabel: "Open Today",
    };
  }

  return {
    source: "empty",
    sourceLabel: "Daily Ready State",
    primaryText: "Today does not have a leading object yet.",
    supportingText: "Open Today to shape one clear next move. Console stays calm until Daily has something real to surface here.",
    ctaLabel: "Set Up Today",
  };
}

function getNonEmptyWeeklySteps(steps: unknown, limit: number): WeeklyStep[] {
  if (!Array.isArray(steps)) return [];

  return steps
    .filter(
      (step): step is WeeklyStep =>
        Boolean(
          step &&
            typeof step === "object" &&
            "text" in step &&
            typeof (step as { text?: unknown }).text === "string" &&
            (step as { text: string }).text.trim(),
        ),
    )
    .slice(0, limit);
}

function getWeekVectorContent(frame: {
  theme?: string | null;
  steps?: unknown;
  nonNegotiables?: unknown;
  recoveryPlan?: string | null;
} | null | undefined): WeekVectorContent {
  return {
    theme: frame?.theme?.trim() || null,
    steps: getNonEmptyWeeklySteps(frame?.steps, 3),
    nonNegotiables: getNonEmptyWeeklySteps(frame?.nonNegotiables, 2),
    recoveryPlan: frame?.recoveryPlan?.trim() || null,
  };
}

function getWeeklyStepProgress(steps: unknown): ProgressStat {
  const relevantSteps = getNonEmptyWeeklySteps(steps, Number.POSITIVE_INFINITY);
  return {
    completed: relevantSteps.filter((step) => step.completed).length,
    total: relevantSteps.length,
  };
}

function getEventExecutionDate(entry: LifeLedgerEntry): string | null {
  return entry.nextDueDate ?? entry.dueDate ?? null;
}

function formatReminderTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatExecutionDateLabel(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatCreatedDateLabel(value: string | null | undefined): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatBytes(bytes: number | null | undefined): string | null {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getReachFileCoarseType(fileType: string | null | undefined): string {
  if (!fileType) return "Other";
  if (fileType.startsWith("image/")) return "Image";
  if (fileType === "application/pdf") return "PDF";
  if (fileType.startsWith("text/") || fileType.includes("document")) return "Document";
  if (fileType.includes("zip") || fileType.includes("archive") || fileType.includes("tar")) return "Archive";
  return "Other";
}

function sortReachFilesNewestFirst(files: ReachFile[] | undefined): ReachFile[] {
  return [...(files ?? [])].sort((left, right) => {
    const leftTimestamp = left.createdAt ? new Date(left.createdAt).getTime() : Number.NaN;
    const rightTimestamp = right.createdAt ? new Date(right.createdAt).getTime() : Number.NaN;
    const normalizedLeft = Number.isNaN(leftTimestamp) ? 0 : leftTimestamp;
    const normalizedRight = Number.isNaN(rightTimestamp) ? 0 : rightTimestamp;
    if (normalizedRight !== normalizedLeft) return normalizedRight - normalizedLeft;
    return right.id - left.id;
  });
}

function isReminderDueNow(value: string): boolean {
  const reminderAt = new Date(value).getTime();
  if (Number.isNaN(reminderAt)) return false;
  return reminderAt <= Date.now() + 24 * 60 * 60 * 1000;
}

function padDateSegment(value: number): string {
  return String(value).padStart(2, "0");
}

function toDateOnlyString(date: Date): string {
  return `${date.getFullYear()}-${padDateSegment(date.getMonth() + 1)}-${padDateSegment(date.getDate())}`;
}

function addDaysToDateOnlyString(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  date.setDate(date.getDate() + days);
  return toDateOnlyString(date);
}

function getConstraintFallbackEvents(
  entries: LifeLedgerEntry[] | undefined,
  todayDate: string,
  limit = 3,
): ConstraintFallbackEvent[] {
  const events = (entries ?? [])
    .filter((entry) => {
      const executionDate = getEventExecutionDate(entry);
      return Boolean(
        executionDate &&
          executionDate >= todayDate &&
          entry.completionState !== "completed" &&
          entry.completionState !== "superseded",
      );
    })
    .sort((left, right) => {
      const leftDate = getEventExecutionDate(left) ?? "";
      const rightDate = getEventExecutionDate(right) ?? "";
      return leftDate.localeCompare(rightDate);
    })
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      executionDate: getEventExecutionDate(entry) ?? todayDate,
      route: "/life-ledger?tab=events",
    }));

  return Number.isFinite(limit) ? events.slice(0, limit) : events;
}

function getConstraintUrgencyCountsFromReminderQueue(
  items: LifeLedgerEventReminderQueueItem[] | undefined,
  nowTimestamp = Date.now(),
): ConstraintUrgencyCounts {
  const counts = {
    dueNow: 0,
    near: 0,
    staged: 0,
  };

  const dueNowBoundary = nowTimestamp + 24 * 60 * 60 * 1000;
  const nearBoundary = nowTimestamp + 72 * 60 * 60 * 1000;

  for (const item of items ?? []) {
    const reminderAt = new Date(item.nextReminderAt).getTime();
    if (Number.isNaN(reminderAt)) continue;

    if (reminderAt <= dueNowBoundary) {
      counts.dueNow += 1;
    } else if (reminderAt <= nearBoundary) {
      counts.near += 1;
    } else {
      counts.staged += 1;
    }
  }

  if (counts.dueNow + counts.near + counts.staged === 0) {
    return { ...counts, source: "empty" };
  }

  return { ...counts, source: "reminders" };
}

function getConstraintUrgencyCountsFromFallbackEvents(
  events: ConstraintFallbackEvent[],
  todayDate: string,
): ConstraintUrgencyCounts {
  const counts = {
    dueNow: 0,
    near: 0,
    staged: 0,
  };
  const tomorrow = addDaysToDateOnlyString(todayDate, 1);
  const nearBoundary = addDaysToDateOnlyString(todayDate, 3);

  for (const event of events) {
    if (event.executionDate <= tomorrow) {
      counts.dueNow += 1;
    } else if (event.executionDate <= nearBoundary) {
      counts.near += 1;
    } else {
      counts.staged += 1;
    }
  }

  if (counts.dueNow + counts.near + counts.staged === 0) {
    return { ...counts, source: "empty" };
  }

  return { ...counts, source: "fallback" };
}

function getFirstNonEmptyVisionGoal(goals: VisionGoal[] | undefined): VisionGoal | null {
  return goals?.find((goal) => goal.text.trim()) ?? null;
}

function getLaneReadinessChips({
  canDaily,
  canWeekly,
  canVision,
  nowFrameSource,
  weeklyTheme,
  visionGoals,
  visionNextSteps,
}: {
  canDaily: boolean;
  canWeekly: boolean;
  canVision: boolean;
  nowFrameSource: NowFrameSource;
  weeklyTheme: string | null | undefined;
  visionGoals: VisionGoal[] | null | undefined;
  visionNextSteps: VisionGoal[] | null | undefined;
}): LaneReadinessChip[] {
  const chips: LaneReadinessChip[] = [];

  if (canDaily) {
    const ready = nowFrameSource !== "empty";
    chips.push({
      key: "daily",
      label: "Today",
      text: ready ? "Today ready" : "Today needs setup",
      ready,
    });
  }

  if (canWeekly) {
    const ready = Boolean(weeklyTheme?.trim());
    chips.push({
      key: "weekly",
      label: "This Week",
      text: ready ? "Week named" : "Week needs theme",
      ready,
    });
  }

  if (canVision) {
    const ready =
      getFirstNonEmptyVisionGoal(visionGoals ?? []) !== null &&
      getFirstNonEmptyVisionGoal(visionNextSteps ?? []) !== null;
    chips.push({
      key: "vision",
      label: "Goals",
      text: ready ? "Goals anchored" : "Goals need anchor",
      ready,
    });
  }

  return chips;
}

function getContinuityContent(frame: {
  goals?: VisionGoal[] | null;
  nextSteps?: VisionGoal[] | null;
} | null | undefined): ContinuityContent {
  const goal = getFirstNonEmptyVisionGoal(frame?.goals ?? []);
  const nextStep = getFirstNonEmptyVisionGoal(frame?.nextSteps ?? []);

  if (goal && nextStep) {
    return {
      mode: "goal-and-step",
      label: "Long-horizon continuity",
      primaryText: goal.text.trim(),
      supportingText: "Vision still points here, with one saved next visible step ready below.",
      nextStepText: nextStep.text.trim(),
      ctaLabel: "Open Goals",
    };
  }

  if (goal) {
    return {
      mode: "goal-only",
      label: "Long-horizon continuity",
      primaryText: goal.text.trim(),
      supportingText: "No next visible step is saved yet. Open Goals to turn this direction into one concrete move without crowding Console.",
      nextStepText: null,
      ctaLabel: "Open Goals",
    };
  }

  if (nextStep) {
    return {
      mode: "step-only",
      label: "Next visible step",
      primaryText: nextStep.text.trim(),
      supportingText: "Vision does not have a saved headline goal yet, so Console anchors on the next visible step instead of fabricating a larger summary.",
      nextStepText: nextStep.text.trim(),
      ctaLabel: "Open Goals",
    };
  }

  return {
    mode: "empty",
    label: "Vision continuity",
    primaryText: "Goals does not have a saved long-horizon anchor yet.",
    supportingText: "Open Goals to capture one meaningful direction and one next visible step before Console starts summarizing them here.",
    nextStepText: null,
    ctaLabel: "Set Up Goals",
  };
}

const REVIEW_STATE_PRIORITY: Record<AIDraft["reviewState"], number> = {
  approval_gated: 3,
  needs_review: 2,
  draft: 1,
  approved: 0,
  applied: 0,
  rejected: 0,
};

function sortActionableDrafts(drafts: AIDraft[]): AIDraft[] {
  return [...drafts].sort((left, right) => {
    const priorityDelta = REVIEW_STATE_PRIORITY[right.reviewState] - REVIEW_STATE_PRIORITY[left.reviewState];
    if (priorityDelta !== 0) return priorityDelta;

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

function getBizdevSupportLine(brand: BizdevBrand): string {
  return (
    brand.nextAction?.trim() ||
    brand.humanStatus?.trim() ||
    brand.blocker?.trim() ||
    "Follow-up ready in lane"
  );
}

function sortBizdevBrandsForConsole(brands: BizdevBrand[] | undefined): BizdevBrand[] {
  return [...(brands ?? [])].sort((left, right) => {
    const leftHasDate = Boolean(left.nextTouchDate?.trim());
    const rightHasDate = Boolean(right.nextTouchDate?.trim());

    if (leftHasDate !== rightHasDate) {
      return leftHasDate ? -1 : 1;
    }

    if (leftHasDate && rightHasDate) {
      const dateDelta = (left.nextTouchDate ?? "").localeCompare(right.nextTouchDate ?? "");
      if (dateDelta !== 0) return dateDelta;
    }

    const leftPriority = BIZDEV_PHASE_PRIORITY[left.phase as BizdevPhase] ?? 99;
    const rightPriority = BIZDEV_PHASE_PRIORITY[right.phase as BizdevPhase] ?? 99;
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.brand.localeCompare(right.brand, undefined, { sensitivity: "base" });
  });
}

function getBizdevMotionChips(summary: BizdevSummary | null | undefined): BizdevMotionChip[] {
  const counts = summary?.counts;
  const chips: BizdevMotionChip[] = [];

  if ((counts?.HOT ?? 0) > 0) {
    chips.push({
      key: "hot",
      label: BIZDEV_PHASE_LABELS.HOT,
      count: counts?.HOT ?? 0,
      accent: true,
    });
  }

  if ((counts?.WARM ?? 0) > 0) {
    chips.push({
      key: "warm",
      label: BIZDEV_PHASE_LABELS.WARM,
      count: counts?.WARM ?? 0,
      accent: false,
    });
  }

  if ((counts?.COLD ?? 0) > 0) {
    chips.push({
      key: "cold",
      label: BIZDEV_PHASE_LABELS.COLD,
      count: counts?.COLD ?? 0,
      accent: false,
    });
  }

  return chips;
}

function getReviewPressureCounts(drafts: AIDraft[]): ReviewPressureCounts {
  return drafts.reduce<ReviewPressureCounts>(
    (counts, draft) => {
      if (draft.reviewState === "draft") counts.draft += 1;
      if (draft.reviewState === "needs_review") counts.needsReview += 1;
      if (draft.reviewState === "approval_gated") counts.approvalGated += 1;
      return counts;
    },
    { draft: 0, needsReview: 0, approvalGated: 0 },
  );
}

function getProgressPercent({ completed, total }: ProgressStat): number {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}

function ConsoleHorizontalProgress({
  stat,
  testId,
  labelTestId,
}: {
  stat: ProgressStat;
  testId: string;
  labelTestId: string;
}) {
  if (stat.total === 0) {
    return (
      <div className="space-y-2" data-testid={testId}>
        <div className="flex items-center justify-between gap-3">
          <p className="tf-console-eyebrow text-xs font-semibold uppercase tracking-[0.22em]">Today Completion</p>
          <span className="tf-console-copy-muted text-xs" data-testid={labelTestId}>
            No Tier A tasks saved yet
          </span>
        </div>
        <div className="tf-console-progress-track" data-testid={`${testId}-bar`}>
          <div className="tf-console-progress-fill" style={{ width: "0%" }} />
        </div>
      </div>
    );
  }

  const percent = getProgressPercent(stat);

  return (
    <div className="space-y-2" data-testid={testId}>
      <div className="flex items-center justify-between gap-3">
        <p className="tf-console-eyebrow text-xs font-semibold uppercase tracking-[0.22em]">Today Completion</p>
        <span className="tf-console-copy-muted text-xs" data-testid={labelTestId}>
          {stat.completed}/{stat.total} complete
        </span>
      </div>
      <div
        className="tf-console-progress-track"
        data-testid={`${testId}-bar`}
        aria-label="Today completion progress"
      >
        <div
          className="tf-console-progress-fill"
          style={{ width: `${percent}%` }}
          data-testid={`${testId}-fill`}
        />
      </div>
    </div>
  );
}

function ConsoleProgressRing({
  stat,
  testId,
  valueTestId,
  emptyStateTestId,
}: {
  stat: ProgressStat;
  testId: string;
  valueTestId: string;
  emptyStateTestId: string;
}) {
  if (stat.total === 0) {
    return (
      <div
        className="tf-console-progress-ring-shell inline-flex items-center justify-center overflow-hidden"
        data-testid={testId}
        aria-label="No weekly steps saved yet"
      >
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center">
          <ListTodo className="h-4 w-4 text-[rgb(var(--console-text-muted-rgb))]" aria-hidden="true" />
          <p
            className="tf-console-copy-muted max-w-[3.6rem] text-[9px] font-semibold uppercase leading-[1.05] tracking-[0.12em]"
            data-testid={emptyStateTestId}
          >
            No steps
          </p>
        </div>
      </div>
    );
  }

  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const percent = getProgressPercent(stat);
  const dashOffset = circumference - (circumference * percent) / 100;

  return (
    <div className="tf-console-progress-ring-shell" data-testid={testId}>
      <svg className="h-20 w-20 -rotate-90" viewBox="0 0 72 72" aria-hidden="true">
        <circle
          className="tf-console-progress-ring-track"
          cx="36"
          cy="36"
          r={radius}
          strokeWidth="7"
          fill="none"
        />
        <circle
          className="tf-console-progress-ring-fill"
          cx="36"
          cy="36"
          r={radius}
          strokeWidth="7"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="tf-console-title text-lg font-semibold" data-testid={valueTestId}>
          {percent}%
        </span>
        <span className="tf-console-copy-muted text-[11px]">
          {stat.completed}/{stat.total} steps
        </span>
      </div>
    </div>
  );
}

function ConsoleSegmentedProgressBar({
  counts,
  testId,
}: {
  counts: ReviewPressureCounts;
  testId: string;
}) {
  const total = counts.draft + counts.needsReview + counts.approvalGated;
  const segments = [
    {
      key: "draft",
      label: "Draft",
      count: counts.draft,
      className: "tf-console-segmented-bar-segment-draft",
    },
    {
      key: "needs-review",
      label: "Needs review",
      count: counts.needsReview,
      className: "tf-console-segmented-bar-segment-needs-review",
    },
    {
      key: "approval-gated",
      label: "Approval gated",
      count: counts.approvalGated,
      className: "tf-console-segmented-bar-segment-approval-gated",
    },
  ] as const;

  return (
    <div className="space-y-2" data-testid={testId}>
      <div className="flex items-center justify-between gap-3">
        <p className="tf-console-eyebrow text-xs font-semibold uppercase tracking-[0.22em]">Review Pressure Shape</p>
        <span className="tf-console-copy-muted text-xs" data-testid={`${testId}-label`}>
          {total === 0 ? "No actionable review pressure" : `${total} actionable drafts`}
        </span>
      </div>
      <div className="tf-console-segmented-bar" data-testid={`${testId}-bar`} aria-label="Review pressure segmented bar">
        {segments.map((segment) => {
          const width = total === 0 ? 0 : Math.max((segment.count / total) * 100, segment.count > 0 ? 8 : 0);
          return (
            <div
              key={segment.key}
              className={cn("tf-console-segmented-bar-segment", segment.className)}
              style={{ width: `${width}%` }}
              data-testid={`${testId}-segment-${segment.key}`}
              aria-label={`${segment.label}: ${segment.count}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        {segments.map((segment) => (
          <span key={segment.key} className="tf-console-chip rounded-full px-2.5 py-1 text-[11px]">
            {segment.label}: {segment.count}
          </span>
        ))}
      </div>
    </div>
  );
}

function ConsoleUrgencyStrip({
  counts,
  reminderTone,
  testId,
  labelTestId,
  emptyStateTestId,
}: {
  counts: ConstraintUrgencyCounts;
  reminderTone: Parameters<typeof getReminderToneCopy>[0];
  testId: string;
  labelTestId: string;
  emptyStateTestId: string;
}) {
  const total = counts.dueNow + counts.near + counts.staged;
  const helperCopy =
    counts.source === "reminders"
      ? getReminderToneCopy(reminderTone, "consoleUrgencyStrip")
      : counts.source === "fallback"
        ? getReminderToneCopy(reminderTone, "consoleUrgencyFallbackStrip")
        : getReminderToneCopy(reminderTone, "consoleUrgencyEmptyStrip");
  const summaryLabel =
    total === 0 ? "Calm" : `${counts.dueNow} due now · ${counts.near} near · ${counts.staged} staged`;
  const segmentTestIdBase = testId.replace(/-strip$/, "");
  const segments = [
    {
      key: "due-now",
      count: counts.dueNow,
      className: "tf-console-urgency-strip-segment-due-now",
      testId: `${segmentTestIdBase}-segment-due-now`,
      label: "Due now",
    },
    {
      key: "near",
      count: counts.near,
      className: "tf-console-urgency-strip-segment-near",
      testId: `${segmentTestIdBase}-segment-near`,
      label: "Near",
    },
    {
      key: "staged",
      count: counts.staged,
      className: "tf-console-urgency-strip-segment-staged",
      testId: `${segmentTestIdBase}-segment-staged`,
      label: "Staged",
    },
  ] as const;

  return (
    <div className="space-y-2.5" data-testid={testId}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="tf-console-eyebrow text-xs font-semibold uppercase tracking-[0.22em]">Urgency Shape</p>
          <p className="tf-console-copy-muted text-xs leading-5" data-testid={labelTestId}>
            {helperCopy}
          </p>
        </div>
        <span className="tf-console-chip rounded-full px-2.5 py-1 text-[11px]">{summaryLabel}</span>
      </div>
      <div className="tf-console-urgency-strip" aria-label="Constraint horizon urgency strip">
        {segments.map((segment) => {
          const width = total === 0 ? 0 : Math.max((segment.count / total) * 100, segment.count > 0 ? 10 : 0);
          return (
            <div
              key={segment.key}
              className={cn("tf-console-urgency-strip-segment", segment.className)}
              style={{ width: `${width}%` }}
              data-testid={segment.testId}
              aria-label={`${segment.label}: ${segment.count}`}
            />
          );
        })}
      </div>
      {total === 0 ? (
        <p className="tf-console-copy-muted text-xs leading-5" data-testid={emptyStateTestId}>
          {helperCopy}
        </p>
      ) : null}
    </div>
  );
}

function getDraftRoute(draft: AIDraft): string {
  if (draft.draftKind === "life_ledger_classification_draft" && draft.targetSurfaceKey) {
    return `/life-ledger?tab=${draft.targetSurfaceKey}`;
  }

  return resolveAIDraftDescriptor(draft.draftKind).route;
}

function getDraftRouteLabel(draft: AIDraft): string {
  if (draft.draftKind === "daily_frame_draft") return "Open Today";
  if (draft.draftKind === "weekly_frame_draft") return "Open This Week";
  if (draft.draftKind === "vision_alignment_draft") return "Open Goals";
  if (draft.draftKind === "life_ledger_classification_draft" && draft.targetSurfaceKey === "events") return "Open Events";
  if (draft.draftKind === "reach_file_summary") return "Open REACH";
  return "Open Lane";
}

function getDraftLaneLabel(draft: AIDraft): string {
  const targetSurfaceLabel = getAIDraftTargetSurfaceLabel(draft);
  if (draft.draftKind === "life_ledger_classification_draft" && draft.targetSurfaceKey === "events") {
    return `${targetSurfaceLabel} · Events`;
  }

  return targetSurfaceLabel;
}

function getConsoleStatusChipClass(status: string): string {
  const normalizedStatus = status.toLowerCase();
  if (normalizedStatus.includes("safety") || normalizedStatus.includes("safe")) return "tf-console-chip-safe";
  if (normalizedStatus.includes("review") || normalizedStatus.includes("manual")) return "tf-console-chip-signal";
  if (normalizedStatus.includes("live")) return "tf-console-chip-accent";
  return "tf-console-chip";
}

function ConsoleModuleCard({
  title,
  purpose,
  status,
  testId,
  accentClassName,
  className,
  contentClassName,
  purposeClassName,
  isSelected,
  onSelect,
  selectedSummary,
  children,
}: ConsoleModuleCardProps) {
  const hasSelectionState = typeof isSelected === "boolean" && Boolean(onSelect);
  const showDetail = hasSelectionState ? isSelected : true;

  return (
    <section
      className={cn(
        "tf-console-panel rounded-[1.75rem] p-5 transition-colors",
        hasSelectionState && !showDetail ? "cursor-pointer" : null,
        accentClassName,
        className,
      )}
      data-testid={testId}
      data-selected={showDetail ? "true" : "false"}
      role={hasSelectionState && !showDetail ? "button" : undefined}
      tabIndex={hasSelectionState && !showDetail ? 0 : undefined}
      onClick={hasSelectionState && !showDetail ? onSelect : undefined}
      onKeyDown={
        hasSelectionState && !showDetail
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect?.();
              }
            }
          : undefined
      }
    >
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="tf-console-title truncate text-xl font-semibold tracking-tight">{title}</h2>
            {hasSelectionState && showDetail ? (
              <span className="tf-console-chip-selected rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
                Selected
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={cn(getConsoleStatusChipClass(status), "rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]")}>
              {status}
            </span>
            {hasSelectionState && showDetail ? null : (
              <span className="tf-console-chip-select rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
                Select
              </span>
            )}
          </div>
        </div>
        {showDetail && purpose ? (
          <p className={cn("tf-console-body max-w-3xl text-sm leading-6", purposeClassName)}>{purpose}</p>
        ) : null}
      </div>
      {!showDetail && selectedSummary ? <div className="mt-4">{selectedSummary}</div> : null}
      {showDetail && children ? <div className={cn("mt-5", contentClassName)}>{children}</div> : null}
    </section>
  );
}

function getAllowedLaneAtlasItems(modules: string[], isAdmin: boolean, permissionsError: boolean): LaneAtlasItem[] {
  const hasAllowedModule = (module: string) => isAdmin || (!permissionsError && modules.includes(module));
  const items = CORE_LANE_ATLAS.filter((item) => hasAllowedModule(item.key));

  for (const item of OPTIONAL_LANE_ATLAS) {
    if (hasAllowedModule(item.key)) {
      items.push(item);
    }
  }

  if (isAdmin) {
    items.push({
      key: "admin",
      href: "/admin",
      label: "Admin",
      description: "Open governance, user access, and system operations.",
    });
  }

  return items;
}

export default function ConsolePage() {
  const todayDate = getTodayDateString();
  const weekStart = getMondayOfCurrentWeek();
  const { status } = useAuthSession();
  const { modules, isAdmin, isError: permissionsError } = usePermissions();
  const { preferences } = useUserPreferences();
  const [selectedConsoleRegion, setSelectedConsoleRegion] = useState<ConsoleRegionKey>("week-vector");
  const laneAtlasItems = getAllowedLaneAtlasItems(modules, isAdmin, permissionsError);
  const hasAllowedModule = (module: string) => isAdmin || (!permissionsError && modules.includes(module));
  const canDaily = hasAllowedModule("daily");
  const canWeekly = hasAllowedModule("weekly");
  const canVision = hasAllowedModule("vision");
  const canBizdev = hasAllowedModule("bizdev");
  const canLifeLedger = hasAllowedModule("life-ledger");
  const canReach = hasAllowedModule("reach");
  const laneAccessCount = laneAtlasItems.filter((item) => item.key !== "admin").length;

  const { data: dailyFrame, isLoading: isDailyFrameLoading } = useGetDailyFrame(todayDate, {
    query: {
      enabled: status === "ready" && canDaily,
      queryKey: getGetDailyFrameQueryKey(todayDate),
      retry: 0,
      refetchOnWindowFocus: false,
    },
  });
  const { data: weeklyFrame, isLoading: isWeeklyFrameLoading } = useGetWeeklyFrame(weekStart, {
    query: {
      enabled: status === "ready" && canWeekly,
      queryKey: getGetWeeklyFrameQueryKey(weekStart),
      retry: 0,
      refetchOnWindowFocus: false,
    },
  });
  const { data: visionFrame, isLoading: isVisionFrameLoading } = useGetVisionFrame({
    query: {
      enabled: status === "ready" && canVision,
      queryKey: getGetVisionFrameQueryKey(),
      retry: 0,
      refetchOnWindowFocus: false,
    },
  });
  const { data: lifeLedgerEvents } = useListLifeLedgerEntries("events", {
    query: {
      enabled: status === "ready" && canLifeLedger,
      queryKey: getListLifeLedgerEntriesQueryKey("events"),
      refetchOnWindowFocus: false,
    },
  });
  const { data: eventReminderQueue } = useGetLifeLedgerEventReminderQueue({
    query: {
      enabled: status === "ready" && canLifeLedger,
      queryKey: getGetLifeLedgerEventReminderQueueQueryKey(),
      refetchOnWindowFocus: false,
    },
  });
  const { data: bizdevBrands } = useListBizdevBrands({
    query: {
      enabled: status === "ready" && canBizdev,
      queryKey: getListBizdevBrandsQueryKey(),
      refetchOnWindowFocus: false,
    },
  });
  const { data: bizdevSummary } = useGetBizdevSummary({
    query: {
      enabled: status === "ready" && canBizdev,
      queryKey: getGetBizdevSummaryQueryKey(),
      refetchOnWindowFocus: false,
    },
  });
  const { data: reachFiles } = useListReachFiles({
    query: {
      enabled: status === "ready" && canReach,
      queryKey: getListReachFilesQueryKey(),
      refetchOnWindowFocus: false,
    },
  });
  const dailyDrafts = useListAiDrafts(dailyAIDraftListParams, {
    query: {
      enabled: status === "ready" && canDaily,
      queryKey: getListAiDraftsQueryKey(dailyAIDraftListParams),
      refetchOnWindowFocus: false,
    },
  });
  const weeklyDrafts = useListAiDrafts(weeklyAIDraftListParams, {
    query: {
      enabled: status === "ready" && canWeekly,
      queryKey: getListAiDraftsQueryKey(weeklyAIDraftListParams),
      refetchOnWindowFocus: false,
    },
  });
  const visionDrafts = useListAiDrafts(visionAIDraftListParams, {
    query: {
      enabled: status === "ready" && canVision,
      queryKey: getListAiDraftsQueryKey(visionAIDraftListParams),
      refetchOnWindowFocus: false,
    },
  });
  const reachDrafts = useListAiDrafts(reachAIDraftListParams, {
    query: {
      enabled: status === "ready" && canReach,
      queryKey: getListAiDraftsQueryKey(reachAIDraftListParams),
      refetchOnWindowFocus: false,
    },
  });
  const lifeLedgerDraftParams = getLifeLedgerAIDraftListParams("events");
  const lifeLedgerDrafts = useListAiDrafts(lifeLedgerDraftParams, {
    query: {
      enabled: status === "ready" && canLifeLedger,
      queryKey: getListAiDraftsQueryKey(lifeLedgerDraftParams),
      refetchOnWindowFocus: false,
    },
  });

  const reviewCount =
    countReviewDrafts(dailyDrafts.data) +
    countReviewDrafts(weeklyDrafts.data) +
    countReviewDrafts(visionDrafts.data) +
    countReviewDrafts(reachDrafts.data) +
    countReviewDrafts(lifeLedgerDrafts.data);
  const nowFrame = getNowFrameContent(dailyFrame);
  const nowFrameProgress = getTaskProgress((dailyFrame?.tierA as TierTask[] | undefined) ?? []);
  const isNowFrameReady = nowFrame.source !== "empty" && !isDailyFrameLoading;
  const weekVector = getWeekVectorContent(weeklyFrame);
  const weekVectorProgress = getWeeklyStepProgress(weeklyFrame?.steps);
  const hasWeekVectorContent =
    Boolean(weekVector.theme) ||
    weekVector.steps.length > 0 ||
    weekVector.nonNegotiables.length > 0 ||
    Boolean(weekVector.recoveryPlan);
  const reminderQueueItems = eventReminderQueue?.items ?? [];
  const dueNowReminderItems = reminderQueueItems
    .filter((item) => isReminderDueNow(item.nextReminderAt))
    .slice(0, 2);
  const comingUpReminderItems = reminderQueueItems
    .filter((item) => !isReminderDueNow(item.nextReminderAt))
    .slice(0, 3);
  const hasReminderQueueItems = reminderQueueItems.length > 0;
  const allFallbackConstraintEvents = hasReminderQueueItems
    ? []
    : getConstraintFallbackEvents(lifeLedgerEvents, todayDate, Number.POSITIVE_INFINITY);
  const fallbackConstraintEvents = hasReminderQueueItems
    ? []
    : allFallbackConstraintEvents.slice(0, 3);
  const constraintUrgencyCounts = !canLifeLedger
    ? { dueNow: 0, near: 0, staged: 0, source: "empty" as const }
    : hasReminderQueueItems
      ? getConstraintUrgencyCountsFromReminderQueue(reminderQueueItems)
      : getConstraintUrgencyCountsFromFallbackEvents(allFallbackConstraintEvents, todayDate);
  const weekVectorStatus = hasWeekVectorContent
    ? "Live Weekly Reuse"
    : isWeeklyFrameLoading
      ? "Loading Weekly"
      : "Calm Empty State";
  const constraintHorizonStatus = !canLifeLedger
    ? "Life Ledger Locked"
    : hasReminderQueueItems
      ? "Live Reminder Horizon"
      : fallbackConstraintEvents.length > 0
        ? "Live Event Fallback"
        : "Calm Empty State";
  const actionableDrafts = sortActionableDrafts([
    ...(dailyDrafts.data?.filter((draft) => REVIEW_STATES.has(draft.reviewState)) ?? []),
    ...(weeklyDrafts.data?.filter((draft) => REVIEW_STATES.has(draft.reviewState)) ?? []),
    ...(visionDrafts.data?.filter((draft) => REVIEW_STATES.has(draft.reviewState)) ?? []),
    ...(lifeLedgerDrafts.data?.filter((draft) => REVIEW_STATES.has(draft.reviewState)) ?? []),
    ...(reachDrafts.data?.filter((draft) => REVIEW_STATES.has(draft.reviewState)) ?? []),
  ]);
  const assistantReviewRows: AssistantReviewRow[] = actionableDrafts.slice(0, 4).map((draft) => ({
    draft,
    route: getDraftRoute(draft),
    routeLabel: getDraftRouteLabel(draft),
    laneLabel: getDraftLaneLabel(draft),
  }));
  const additionalDraftCount = Math.max(0, actionableDrafts.length - assistantReviewRows.length);
  const reviewPressureCounts = getReviewPressureCounts(actionableDrafts);
  const assistantReviewStatus =
    assistantReviewRows.length > 0
      ? "Live Approval Queue"
      : reviewCount > 0
        ? "Live Review Pressure"
        : "Calm Empty State";
  const continuity = getContinuityContent(visionFrame);
  const continuityStatus =
    continuity.mode !== "empty"
      ? "Live Vision Reuse"
      : isVisionFrameLoading
        ? "Loading Vision"
        : "Calm Empty State";
  const actionableReachDraftCount = countReviewDrafts(reachDrafts.data);
  const bizdevMotionRows = sortBizdevBrandsForConsole(bizdevBrands).slice(0, 2);
  const bizdevMotionChips = getBizdevMotionChips(bizdevSummary);
  const bizdevTotal = bizdevSummary?.total ?? bizdevBrands?.length ?? 0;
  const showBizdevMotion = canBizdev && (bizdevTotal > 0 || (bizdevBrands?.length ?? 0) > 0);
  const bizdevMotionStatus =
    (bizdevSummary?.counts.HOT ?? 0) > 0
      ? "Live Follow-Up Pressure"
      : bizdevMotionRows.length > 0
        ? "Live Follow-Up Surface"
        : "Live Follow-Up Snapshot";
  const recentReachFiles = sortReachFilesNewestFirst(reachFiles).slice(0, 2);
  const reachFileCount = reachFiles?.length ?? 0;
  const showReachCapture = canReach && (reachFileCount > 0 || actionableReachDraftCount > 0);
  const reachCaptureStatus =
    actionableReachDraftCount > 0 ? "Live Intake + Review" : "Live Intake Surface";
  const laneReadinessChips = getLaneReadinessChips({
    canDaily,
    canWeekly,
    canVision,
    nowFrameSource: nowFrame.source,
    weeklyTheme: weeklyFrame?.theme,
    visionGoals: visionFrame?.goals,
    visionNextSteps: visionFrame?.nextSteps,
  });
  const getSelectionProps = (region: ConsoleRegionKey) => ({
    isSelected: selectedConsoleRegion === region,
    onSelect: () => setSelectedConsoleRegion(region),
  });

  return (
    <Layout>
      <div className="relative flex-1 overflow-x-clip">
        <div
          className="tf-console-shell-glow pointer-events-none absolute inset-x-0 top-0 h-[32rem]"
          aria-hidden="true"
        />
        <main
          className="tf-density-console-shell relative mx-auto w-full max-w-[1920px] sm:px-6 lg:px-8 lg:pb-14 lg:pt-6 min-[2400px]:px-10"
          data-testid="console-shell"
        >
          <div className="tf-density-stack mx-auto max-w-[1480px] space-y-6 min-[1400px]:max-w-[1560px] min-[1800px]:max-w-[1640px] min-[2400px]:max-w-[1720px]">
            <section className="tf-console-panel overflow-hidden rounded-[2rem] px-5 py-6 sm:px-7 sm:py-8 min-[1600px]:px-8 min-[1800px]:py-9">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(240px,0.58fr)] lg:items-end min-[1800px]:grid-cols-[minmax(0,1.68fr)_minmax(260px,0.52fr)]">
                <LaneHero
                  label="ThetaFrame Console"
                  title="Preview Shell"
                  subtitle="Select one operating surface at a time. Compact cards show signals; selected cards show detail and action."
                  className="space-y-3 min-[1600px]:max-w-[58rem]"
                  headingTestId="text-console-title"
                >
                  <div className="tf-console-body flex flex-wrap items-center gap-3 text-sm min-[1800px]:max-w-[52rem]">
                    <span className="tf-console-chip-accent inline-flex items-center gap-2 rounded-full px-3 py-1.5">
                      <Compass className="h-4 w-4" />
                      Dashboard stays home.
                    </span>
                    <span className="tf-console-chip-selected inline-flex items-center gap-2 rounded-full px-3 py-1.5">
                      <Sparkles className="h-4 w-4" />
                      One selected panel expands.
                    </span>
                  </div>
                </LaneHero>

                <div className="tf-console-panel-muted rounded-[1.5rem] p-4 text-[13px] min-[1800px]:p-5">
                  <p className="tf-console-eyebrow text-[11px] font-semibold uppercase tracking-[0.24em]">Current Mode</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="tf-console-chip rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">Read-only</span>
                    <span className="tf-console-chip rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">Lane-owned actions</span>
                    <span className="tf-console-chip-signal rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">Manual review</span>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-6 min-[820px]:grid-cols-[minmax(0,1.18fr)_minmax(248px,0.74fr)] xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.68fr)] min-[1600px]:grid-cols-[minmax(0,1.68fr)_minmax(280px,0.54fr)] min-[2400px]:grid-cols-[minmax(0,1.72fr)_minmax(300px,0.48fr)]">
              <div className="space-y-6">
                <ConsoleModuleCard
                  title="Now Frame"
                  purpose="Use this when you want the safest next move from Today."
                  status={isNowFrameReady ? "Live Daily Reuse" : isDailyFrameLoading ? "Loading Today" : "Calm Empty State"}
                  testId="console-region-now-frame"
                  accentClassName="tf-console-panel-hero-shell"
                  className="min-[1600px]:p-6 min-[2400px]:p-7"
                  contentClassName="min-[1600px]:mt-6"
                  purposeClassName="min-[1600px]:max-w-[44rem]"
                  {...getSelectionProps("now-frame")}
                  selectedSummary={
                    <div className="flex flex-wrap gap-2">
                      <span className="tf-console-chip-accent rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
                        {nowFrame.sourceLabel}
                      </span>
                      <span className="tf-console-chip rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
                        {nowFrameProgress.completed}/{nowFrameProgress.total}
                      </span>
                    </div>
                  }
                >
                  <div
                    className="tf-console-panel-hero rounded-[1.6rem] p-5 sm:p-6 min-[1600px]:p-7 min-[2400px]:p-8"
                    data-testid="console-now-frame-live"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="tf-console-chip-accent rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
                        {nowFrame.sourceLabel}
                      </span>
                      <span className="tf-console-chip rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
                        One dominant object
                      </span>
                      <span className="sr-only" data-testid={`console-now-frame-source-${nowFrame.source}`}>
                        {nowFrame.source}
                      </span>
                    </div>

                    <div className="mt-5">
                      <ConsoleHorizontalProgress
                        stat={nowFrameProgress}
                        testId="console-now-frame-progress"
                        labelTestId="console-now-frame-progress-label"
                      />
                    </div>

                    {nowFrame.source === "empty" ? (
                      <div className="mt-5 space-y-4" data-testid="console-now-frame-empty-state">
                        <h3 className="tf-console-title max-w-3xl text-3xl font-semibold tracking-tight min-[1600px]:max-w-[48rem] min-[1600px]:text-4xl min-[2400px]:text-[3.35rem]">
                          {nowFrame.primaryText}
                        </h3>
                        <p className="tf-console-body max-w-3xl text-sm leading-7 min-[1600px]:max-w-[36rem] min-[1600px]:text-[15px]">
                          {nowFrame.supportingText}
                        </p>
                        <Button asChild className="tf-console-cta-primary" data-testid="console-now-frame-primary-cta">
                          <Link href="/daily">{nowFrame.ctaLabel}</Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-5 space-y-5">
                        <div className="space-y-3">
                          <h3 className="tf-console-title max-w-4xl text-3xl font-semibold tracking-tight sm:text-4xl min-[1600px]:max-w-[52rem] min-[1600px]:text-[3.3rem] min-[2400px]:text-[3.75rem]">
                            {nowFrame.primaryText}
                          </h3>
                          <p className="tf-console-body max-w-3xl text-sm leading-7 min-[1600px]:max-w-[38rem] min-[1600px]:text-[15px]">
                            {nowFrame.supportingText}
                          </p>
                        </div>
                        <div className="tf-console-body flex flex-wrap items-center gap-3 text-sm">
                          <span className="tf-console-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5">
                            <CheckCircle2 className="h-4 w-4" />
                            Editing and apply still live in Today.
                          </span>
                          <Button asChild className="tf-console-cta-primary" data-testid="console-now-frame-primary-cta">
                            <Link href="/daily">{nowFrame.ctaLabel}</Link>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </ConsoleModuleCard>

                <div className="grid gap-6 md:grid-cols-2">
                  <ConsoleModuleCard
                  title="Week Vector"
                  status={weekVectorStatus}
                  testId="console-region-week-vector"
                  className="min-[1600px]:p-4"
                  contentClassName="min-[1600px]:mt-4"
                  {...getSelectionProps("week-vector")}
                  selectedSummary={
                    <div className="flex flex-wrap gap-2">
                      <span className="tf-console-chip rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
                        {weekVector.steps.length} steps
                      </span>
                      <span className="tf-console-chip rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
                        {weekVector.nonNegotiables.length} protected
                      </span>
                    </div>
                  }
                >
                  <div className="space-y-4" data-testid="console-week-vector-live">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="tf-console-chip rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]">
                          {weekVector.steps.length} steps
                        </span>
                        <span className="tf-console-chip rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]">
                          {weekVector.nonNegotiables.length} protected
                        </span>
                        {weekVector.theme ? (
                          <span className="sr-only" data-testid="console-week-vector-theme-present">
                            theme present
                          </span>
                        ) : null}
                        {weekVector.steps.length > 0 ? (
                          <span className="sr-only" data-testid="console-week-vector-steps-present">
                            steps present
                          </span>
                        ) : null}
                      </div>
                      <ConsoleProgressRing
                        stat={weekVectorProgress}
                        testId="console-week-vector-progress-ring"
                        valueTestId="console-week-vector-progress-value"
                        emptyStateTestId="console-week-vector-progress-empty-state"
                      />
                    </div>
                      {hasWeekVectorContent ? (
                        <>
                          {weekVector.theme ? (
                            <div className="tf-console-surface rounded-2xl px-4 py-3">
                              <p className="tf-console-eyebrow text-xs font-semibold uppercase tracking-[0.22em]">Theme</p>
                              <h3 className="tf-console-title mt-1 truncate text-lg font-semibold tracking-tight" title={weekVector.theme}>
                                {weekVector.theme}
                              </h3>
                            </div>
                          ) : null}

                          <div className="grid grid-cols-3 gap-2">
                            <div className="tf-console-surface rounded-2xl px-3 py-3 text-center">
                              <p className="tf-console-title text-lg font-semibold">{weekVector.steps.length}</p>
                              <p className="tf-console-copy-muted text-[10px] uppercase tracking-[0.16em]">steps</p>
                            </div>
                            <div className="tf-console-surface rounded-2xl px-3 py-3 text-center">
                              <p className="tf-console-title text-lg font-semibold">{weekVector.nonNegotiables.length}</p>
                              <p className="tf-console-copy-muted text-[10px] uppercase tracking-[0.16em]">kept</p>
                            </div>
                            <div className="tf-console-surface rounded-2xl px-3 py-3 text-center">
                              <p className="tf-console-title text-lg font-semibold">{weekVector.recoveryPlan ? "On" : "Off"}</p>
                              <p className="tf-console-copy-muted text-[10px] uppercase tracking-[0.16em]">backup</p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="tf-console-surface rounded-2xl px-4 py-4" data-testid="console-week-vector-empty-state">
                          <div className="flex items-center gap-3">
                            <ListTodo className="tf-console-copy-muted h-5 w-5 shrink-0" />
                            <div className="min-w-0">
                              <h3 className="tf-console-title text-base font-semibold tracking-tight">No weekly direction</h3>
                              <p className="tf-console-copy-muted text-xs">Open This Week to set direction.</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3">
                        <Button asChild className="tf-console-cta-primary" data-testid="console-week-vector-primary-cta">
                          <Link href="/weekly">Open This Week</Link>
                        </Button>
                      </div>
                    </div>
                  </ConsoleModuleCard>
                  <ConsoleModuleCard
                  title="Constraint Horizon"
                  purpose="This region will show due-soon obligations and constraint awareness from Life Ledger reminder truth first, then upcoming event dates, without taking over the Console with a calendar-home shell."
                  status={constraintHorizonStatus}
                  testId="console-region-constraint-horizon"
                  className="min-[1600px]:p-4"
                  contentClassName="min-[1600px]:mt-4"
                  purposeClassName="min-[1600px]:max-w-[28rem] min-[1600px]:text-[13px]"
                  {...getSelectionProps("constraint-horizon")}
                  selectedSummary={
                    <div className="flex flex-wrap gap-2">
                      <span className="tf-console-chip rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                        {constraintUrgencyCounts.dueNow} due
                      </span>
                      <span className="tf-console-chip rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                        {constraintUrgencyCounts.near} near
                      </span>
                    </div>
                  }
                >
                    <div className="tf-density-stack space-y-4" data-testid="console-constraint-horizon-live">
                      <ConsoleUrgencyStrip
                        counts={constraintUrgencyCounts}
                        reminderTone={preferences.reminderTone}
                        testId="console-constraint-horizon-urgency-strip"
                        labelTestId="console-constraint-horizon-urgency-strip-label"
                        emptyStateTestId="console-constraint-horizon-urgency-strip-empty-state"
                      />
                      {!canLifeLedger ? (
                        <div className="space-y-4" data-testid="console-constraint-horizon-empty-state">
                          <h3 className="tf-console-title text-2xl font-semibold tracking-tight">Life Ledger is not enabled for this account.</h3>
                          <p className="tf-console-body text-sm leading-7">
                            Console keeps this region guarded until the Events lane is available. No reminder or obligation data is exposed here without that lane.
                          </p>
                          <Button
                            disabled
                            className="tf-console-cta-secondary"
                            data-testid="console-constraint-horizon-primary-cta"
                          >
                            Life Ledger unavailable
                          </Button>
                        </div>
                      ) : hasReminderQueueItems ? (
                        <>
                          <section className="space-y-3" data-testid="console-constraint-horizon-due-now">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="tf-console-eyebrow text-xs font-semibold uppercase tracking-[0.22em]">Due Now</p>
                                <p className="tf-console-body text-sm">{getReminderToneCopy(preferences.reminderTone, "consoleDueNow")}</p>
                              </div>
                              <span className="tf-console-chip-signal rounded-full px-2.5 py-1 text-[11px]">
                                {dueNowReminderItems.length}
                              </span>
                            </div>
                            {dueNowReminderItems.length > 0 ? (
                              <div className="space-y-2">
                                {dueNowReminderItems.map((item) => (
                                  <ConstraintReminderRow key={item.id} item={item} />
                                ))}
                              </div>
                            ) : (
                              <div className="tf-console-surface tf-console-surface-dashed rounded-2xl px-4 py-4 text-sm">
                                {getReminderToneCopy(preferences.reminderTone, "consoleDueNowEmpty")}
                              </div>
                            )}
                          </section>

                          <section className="space-y-3" data-testid="console-constraint-horizon-coming-up">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="tf-console-eyebrow text-xs font-semibold uppercase tracking-[0.22em]">Coming Up</p>
                                <p className="tf-console-body text-sm">{getReminderToneCopy(preferences.reminderTone, "consoleComingUp")}</p>
                              </div>
                              <span className="tf-console-chip rounded-full px-2.5 py-1 text-[11px]">
                                {comingUpReminderItems.length}
                              </span>
                            </div>
                            {comingUpReminderItems.length > 0 ? (
                              <div className="space-y-2">
                                {comingUpReminderItems.map((item) => (
                                  <ConstraintReminderRow key={item.id} item={item} />
                                ))}
                              </div>
                            ) : (
                              <div className="tf-console-surface tf-console-surface-dashed rounded-2xl px-4 py-4 text-sm">
                                {getReminderToneCopy(preferences.reminderTone, "consoleComingUpEmpty")}
                              </div>
                            )}
                          </section>

                          <Button asChild className="tf-console-cta-primary" data-testid="console-constraint-horizon-primary-cta">
                            <Link href="/life-ledger?tab=events">Open Events</Link>
                          </Button>
                        </>
                      ) : fallbackConstraintEvents.length > 0 ? (
                        <>
                          <section className="space-y-3" data-testid="console-constraint-horizon-fallback-events">
                            <div>
                              <p className="tf-console-eyebrow text-xs font-semibold uppercase tracking-[0.22em]">Upcoming Event Dates</p>
                              <p className="tf-console-body text-sm">{getReminderToneCopy(preferences.reminderTone, "consoleFallback")}</p>
                            </div>
                            <div className="space-y-2">
                              {fallbackConstraintEvents.map((event) => (
                                <div
                                  key={event.id}
                                  className="tf-console-surface rounded-2xl px-4 py-3 text-sm"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 space-y-1">
                                      <p className="tf-console-title font-semibold">{event.name}</p>
                                      <p className="tf-console-body text-sm">Next due {formatExecutionDateLabel(event.executionDate)}</p>
                                    </div>
                                    <span className="tf-console-copy-muted shrink-0 font-mono text-xs">{event.executionDate}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </section>

                          <Button asChild className="tf-console-cta-primary" data-testid="console-constraint-horizon-primary-cta">
                            <Link href="/life-ledger?tab=events">Open Events</Link>
                          </Button>
                        </>
                      ) : (
                        <div className="space-y-4" data-testid="console-constraint-horizon-empty-state">
                          <h3 className="tf-console-title text-2xl font-semibold tracking-tight">{getReminderToneCopy(preferences.reminderTone, "consoleEmptyHeading")}</h3>
                          <p className="tf-console-body text-sm leading-7">
                            {getReminderToneCopy(preferences.reminderTone, "consoleEmptyBody")}
                          </p>
                          <Button asChild className="tf-console-cta-primary" data-testid="console-constraint-horizon-primary-cta">
                            <Link href="/life-ledger?tab=events">Open Events</Link>
                          </Button>
                        </div>
                      )}
                    </div>
                  </ConsoleModuleCard>
                </div>

                <ConsoleModuleCard
                  title="Lane Atlas"
                  purpose="Use the currently allowed lanes as a calm navigation overview. This slice exposes real links only, with no counts, reminders, or derived operational data."
                  status="Live Navigation"
                  testId="console-region-lane-atlas"
                  className="min-[1600px]:p-4"
                  contentClassName="min-[1600px]:mt-4"
                  purposeClassName="min-[1600px]:max-w-[34rem] min-[1600px]:text-[13px]"
                  {...getSelectionProps("lane-atlas")}
                  selectedSummary={
                    <div className="flex flex-wrap gap-2">
                      <span className="tf-console-chip rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                        {laneAccessCount} lanes
                      </span>
                      <span className="tf-console-chip rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                        Navigation
                      </span>
                    </div>
                  }
                >
                  {laneAtlasItems.length > 0 ? (
                    <div className="space-y-4">
                      {laneReadinessChips.length > 0 ? (
                        <div className="space-y-2.5" data-testid="console-lane-readiness-row">
                          <div className="flex items-center gap-2">
                            <p className="tf-console-eyebrow text-xs font-semibold uppercase tracking-[0.22em]">
                              Core Lane Readiness
                            </p>
                            <span className="tf-console-copy-muted text-xs">
                              Quiet setup truth from Today, This Week, and Goals.
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {laneReadinessChips.map((chip) => (
                              <div
                                key={chip.key}
                                className={cn(
                                  "rounded-full px-3 py-1.5 text-sm",
                                  chip.ready ? "tf-console-chip-accent" : "tf-console-chip",
                                )}
                                data-testid={`console-lane-readiness-${chip.key}`}
                              >
                                <span className="font-semibold">{chip.label}</span>
                                <span className="tf-console-copy-muted mx-2 opacity-70">·</span>
                                <span
                                  className="inline"
                                  data-testid={`console-lane-readiness-${chip.key}-${chip.ready ? "ready" : "not-ready"}`}
                                >
                                  {chip.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="grid max-w-4xl gap-3 sm:grid-cols-2 min-[1800px]:max-w-[42rem]">
                        {laneAtlasItems.map((item) => (
                          <Link
                            key={item.key}
                            href={item.href}
                            className="tf-console-surface tf-console-lane-link group rounded-[1.35rem] p-4 transition-colors min-[1600px]:p-3.5"
                            data-testid={`console-lane-link-${item.key}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <p className="tf-console-title text-sm font-semibold">{item.label}</p>
                                <p className="tf-console-body text-sm leading-6">{item.description}</p>
                              </div>
                              <ArrowRight className="tf-console-copy-muted tf-console-link-icon mt-0.5 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="tf-console-surface tf-console-surface-dashed rounded-2xl p-4 text-sm">
                      Lane access could not be resolved for this session. Open Dashboard or a core lane directly while permissions reload.
                    </div>
                  )}
                </ConsoleModuleCard>
              </div>

              <div className="space-y-6 min-[1600px]:space-y-4">
                <ConsoleModuleCard
                  title="System Health"
                  purpose="This always-on support band will surface sync, reminders, review pressure, and system safety signals without drifting into a BI-style metrics panel."
                  status="Live Review + Safety"
                  testId="console-region-system-health"
                  className="min-[1600px]:p-4"
                  contentClassName="min-[1600px]:mt-4"
                  purposeClassName="min-[1600px]:max-w-[24rem] min-[1600px]:text-[13px]"
                  {...getSelectionProps("system-health")}
                  selectedSummary={
                    <div className="flex flex-wrap gap-2">
                      <span className="tf-console-chip rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                        {reviewCount} review
                      </span>
                        <span className="tf-console-chip-safe rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
                        Safe
                      </span>
                    </div>
                  }
                >
                    <div className="space-y-4" data-testid="console-system-health-live">
                      <div className="flex flex-wrap gap-3">
                      <div
                        className="tf-console-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm min-[1600px]:text-[13px]"
                        data-testid="console-system-health-chip-review-count"
                      >
                        <Gauge className="h-4 w-4" />
                        <span>{reviewCount} {reviewCount === 1 ? "item" : "items"} need review</span>
                      </div>
                      <div
                        className="tf-console-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm min-[1600px]:text-[13px]"
                        data-testid="console-system-health-chip-lane-access"
                      >
                        <ListTodo className="h-4 w-4" />
                        <span>{laneAccessCount} {laneAccessCount === 1 ? "lane" : "lanes"} available</span>
                      </div>
                      <div
                        className="tf-console-chip-safe inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm min-[1600px]:text-[13px]"
                        data-testid="console-system-health-chip-console-state"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        <span>Preview shell live. Dashboard stays default.</span>
                      </div>
                    </div>
                    <ConsoleSegmentedProgressBar
                      counts={reviewPressureCounts}
                      testId="console-system-health-review-pressure"
                    />
                    <div className="grid gap-3">
                      <div className="tf-console-surface rounded-2xl p-4 text-sm">
                        <div className="tf-console-eyebrow flex items-center gap-2">
                          <Gauge className="h-4 w-4" />
                          <span className="font-semibold">Needs Review</span>
                        </div>
                        <p className="mt-2 leading-6">
                          {reviewCount > 0
                            ? "Actionable draft pressure is present across your allowed lanes."
                            : "No actionable review queue is pressuring the Console right now."}
                        </p>
                      </div>
                      <div className="tf-console-surface rounded-2xl p-4 text-sm">
                        <div className="tf-console-eyebrow flex items-center gap-2">
                          <Trophy className="h-4 w-4" />
                          <span className="font-semibold">Lane Access</span>
                        </div>
                        <p className="mt-2 leading-6">
                          Console is reading only the lanes this session can already open. No new access rules are introduced here.
                        </p>
                      </div>
                      <div className="tf-console-surface rounded-2xl p-4 text-sm">
                        <div className="tf-console-eyebrow flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          <span className="font-semibold">Console State</span>
                        </div>
                        <p className="mt-2 leading-6">
                          Reminder, mobile, transport, and BI-style health signals stay deferred until later Console slices.
                        </p>
                      </div>
                    </div>
                  </div>
                </ConsoleModuleCard>

                <ConsoleModuleCard
                  title="Assistant Review"
                  purpose="This region surfaces the current approval-gated draft queue with provenance and lane CTAs. It does not become a transcript-first assistant home."
                  status={assistantReviewStatus}
                  testId="console-region-assistant-review"
                  className="min-[1600px]:p-4"
                  contentClassName="min-[1600px]:mt-4"
                  purposeClassName="min-[1600px]:max-w-[24rem] min-[1600px]:text-[13px]"
                  {...getSelectionProps("assistant-review")}
                  selectedSummary={
                    <div className="flex flex-wrap gap-2">
                      <span className="tf-console-chip rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                        {reviewPressureCounts.needsReview} needs review
                      </span>
                      <span className="tf-console-chip rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                        {reviewPressureCounts.approvalGated} gated
                      </span>
                    </div>
                  }
                >
                  <div className="space-y-4" data-testid="console-assistant-review-live">
                    {assistantReviewRows.length > 0 ? (
                      <div className="space-y-3" data-testid="console-assistant-review-queue-present">
                        {assistantReviewRows.map(({ draft, route, routeLabel, laneLabel }) => (
                          <article
                            key={draft.id}
                            className="tf-console-surface rounded-2xl p-4 min-[1600px]:p-3.5"
                            data-testid={`console-assistant-review-row-${draft.id}`}
                          >
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className="tf-console-chip rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                                      data-testid={`console-assistant-review-lane-${draft.id}`}
                                    >
                                      {laneLabel}
                                    </span>
                                    <span className="tf-console-chip-accent rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                                      {getAIDraftReviewStateLabel(draft)}
                                    </span>
                                  </div>
                                  <p className="tf-console-title text-sm font-semibold">{getAIDraftKindLabel(draft)}</p>
                                  <p className="tf-console-body text-sm leading-6">{getAIDraftPayloadSummary(draft)}</p>
                                </div>
                                <Button
                                  asChild
                                  variant="outline"
                                  className="tf-console-cta-secondary"
                                  data-testid={`console-assistant-review-row-cta-${draft.id}`}
                                >
                                  <Link href={route}>{routeLabel}</Link>
                                </Button>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {getAIDraftSourceRefChips(draft).map((chip, chipIndex) => (
                                  <span
                                    key={`${draft.id}-${chip}-${chipIndex}`}
                                    className="tf-console-provenance-chip inline-flex items-center rounded-full px-2.5 py-1 text-[11px]"
                                    data-testid={`console-assistant-review-provenance-chip-${draft.id}-${chipIndex}`}
                                  >
                                    {chip}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </article>
                        ))}

                        {additionalDraftCount > 0 ? (
                          <div className="tf-console-surface tf-console-surface-dashed rounded-2xl px-4 py-3 text-sm">
                            +{additionalDraftCount} more actionable {additionalDraftCount === 1 ? "draft" : "drafts"} remain in their lane-owned review surfaces.
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="space-y-4" data-testid="console-assistant-review-empty-state">
                        <h3 className="tf-console-title text-2xl font-semibold tracking-tight">No approval-gated review pressure is active right now.</h3>
                        <p className="tf-console-body text-sm leading-7">
                          Stored drafts stay review-first and lane-owned. When nothing actionable is waiting, Console stays calm instead of inventing an assistant queue.
                        </p>
                        <Button asChild className="tf-console-cta-primary" data-testid="console-assistant-review-primary-cta">
                          <Link href="/dashboard">Open Dashboard</Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </ConsoleModuleCard>

                <ConsoleModuleCard
                  title="Continuity"
                  purpose="This region preserves long-horizon direction from Vision so the Console can answer what still matters beyond the current day."
                  status={continuityStatus}
                  testId="console-region-continuity"
                  className="min-[1600px]:p-4"
                  contentClassName="min-[1600px]:mt-4"
                  purposeClassName="min-[1600px]:max-w-[24rem] min-[1600px]:text-[13px]"
                  {...getSelectionProps("continuity")}
                  selectedSummary={
                    <div className="flex flex-wrap gap-2">
                      <span className="tf-console-chip rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                        {continuity.label}
                      </span>
                    </div>
                  }
                >
                  <div className="space-y-4" data-testid="console-continuity-live">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="tf-console-chip rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]">
                        {continuity.label}
                      </span>
                      {continuity.mode === "goal-and-step" || continuity.mode === "goal-only" ? (
                        <span className="sr-only" data-testid="console-continuity-goal-present">
                          goal present
                        </span>
                      ) : null}
                      {continuity.mode === "goal-and-step" || continuity.mode === "step-only" ? (
                        <span className="sr-only" data-testid="console-continuity-next-step-present">
                          next step present
                        </span>
                      ) : null}
                    </div>

                    {continuity.mode === "empty" ? (
                      <div className="space-y-4" data-testid="console-continuity-empty-state">
                        <h3 className="tf-console-title text-2xl font-semibold tracking-tight">{continuity.primaryText}</h3>
                        <p className="tf-console-body text-sm leading-7">{continuity.supportingText}</p>
                        <Button asChild className="tf-console-cta-primary" data-testid="console-continuity-primary-cta">
                          <Link href="/vision">{continuity.ctaLabel}</Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <h3 className="tf-console-title text-2xl font-semibold tracking-tight min-[1600px]:text-[1.7rem]">{continuity.primaryText}</h3>
                          <p className="tf-console-body text-sm leading-7 min-[1600px]:max-w-[22rem]">{continuity.supportingText}</p>
                        </div>
                        {continuity.nextStepText ? (
                          <div className="tf-console-surface rounded-2xl p-4 text-sm">
                            <p className="tf-console-eyebrow text-xs font-semibold uppercase tracking-[0.22em]">Next Visible Step</p>
                            <p className="tf-console-body mt-2 text-sm">{continuity.nextStepText}</p>
                          </div>
                        ) : null}
                        <Button asChild className="tf-console-cta-primary" data-testid="console-continuity-primary-cta">
                          <Link href="/vision">{continuity.ctaLabel}</Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </ConsoleModuleCard>

                {showReachCapture ? (
                  <ConsoleModuleCard
                    title="REACH Capture"
                    purpose="This read-only intake and review snapshot keeps private file activity visible without turning Console into a file manager."
                    status={reachCaptureStatus}
                    testId="console-region-reach-capture"
                    className="tf-console-panel-muted p-4 min-[1600px]:p-4"
                    contentClassName="min-[1600px]:mt-4"
                    purposeClassName="tf-console-copy-muted max-w-[24rem] text-[13px]"
                    {...getSelectionProps("reach-capture")}
                    selectedSummary={
                      <div className="flex flex-wrap gap-2">
                        <span className="tf-console-chip rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                          {reachFileCount} files
                        </span>
                        <span className="tf-console-chip rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                          {actionableReachDraftCount} review
                        </span>
                      </div>
                    }
                  >
                    <div className="space-y-4" data-testid="console-reach-capture-live">
                      <p className="tf-console-body text-sm leading-6">
                        {actionableReachDraftCount > 0
                          ? "Actionable REACH review is active. Intake and review stay lane-owned, so Console only surfaces the signal and routes back to REACH."
                          : "Recent REACH file intake is available. Full file work, notes, and review actions remain inside the REACH lane."}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {reachFileCount > 0 ? (
                          <span
                            className="tf-console-chip rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                            data-testid="console-reach-capture-chip-files"
                          >
                            {reachFileCount} {reachFileCount === 1 ? "file" : "files"}
                          </span>
                        ) : null}
                        {actionableReachDraftCount > 0 ? (
                          <span
                            className="tf-console-chip-accent rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                            data-testid="console-reach-capture-chip-review"
                          >
                            {actionableReachDraftCount} {actionableReachDraftCount === 1 ? "review item" : "review items"}
                          </span>
                        ) : null}
                      </div>

                      {recentReachFiles.length > 0 ? (
                        <div className="space-y-3">
                          {recentReachFiles.map((file) => {
                            const metadata = [
                              getReachFileCoarseType(file.fileType),
                              formatBytes(file.sizeBytes),
                              formatCreatedDateLabel(file.createdAt),
                            ].filter(Boolean);

                            return (
                              <div
                                key={file.id}
                                className="tf-console-surface rounded-2xl px-4 py-3 text-sm"
                                data-testid={`console-reach-capture-file-row-${file.id}`}
                              >
                                <p className="tf-console-title truncate font-semibold" title={file.name}>
                                  {file.name}
                                </p>
                                {metadata.length > 0 ? (
                                  <p className="tf-console-copy-muted mt-1 text-xs leading-5">{metadata.join(" · ")}</p>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : null}

                      <Button asChild className="tf-console-cta-secondary" data-testid="console-reach-capture-primary-cta">
                        <Link href="/reach">Open REACH</Link>
                      </Button>
                    </div>
                  </ConsoleModuleCard>
                ) : null}

                {showBizdevMotion ? (
                  <ConsoleModuleCard
                    title="FollowUps Motion"
                    purpose="This read-only follow-up snapshot keeps promise pressure visible without turning Console into a pipeline dashboard."
                    status={bizdevMotionStatus}
                    testId="console-region-bizdev-motion"
                    className="tf-console-panel-muted p-4 min-[1600px]:p-4"
                    contentClassName="min-[1600px]:mt-4"
                    purposeClassName="tf-console-copy-muted max-w-[24rem] text-[13px]"
                    {...getSelectionProps("bizdev-motion")}
                    selectedSummary={
                      <div className="flex flex-wrap gap-2">
                        <span className="tf-console-chip rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                          {bizdevTotal} contacts
                        </span>
                        <span className="tf-console-chip rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                          {(bizdevSummary?.counts.HOT ?? 0)} hot
                        </span>
                      </div>
                    }
                  >
                    <div className="space-y-4" data-testid="console-bizdev-motion-live">
                      <p className="tf-console-body text-sm leading-6">
                        {(bizdevSummary?.counts.HOT ?? 0) > 0
                          ? "Higher-pressure follow-ups are active. Editing, reminder planning, and ownership stay in the FollowUps lane."
                          : "Current follow-up motion is visible here as a calm read-only snapshot. Full editing and reminder planning stay in FollowUps."}
                      </p>

                      {bizdevMotionChips.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {bizdevMotionChips.map((chip) => (
                            <span
                              key={chip.key}
                              className={cn(
                                "rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                                chip.accent ? "tf-console-chip-accent" : "tf-console-chip",
                              )}
                              data-testid={`console-bizdev-motion-chip-${chip.key}`}
                            >
                              {chip.label}: {chip.count}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {bizdevMotionRows.length > 0 ? (
                        <div className="space-y-3">
                          {bizdevMotionRows.map((brand) => (
                            <div
                              key={brand.id}
                              className="tf-console-surface rounded-2xl px-4 py-3 text-sm"
                              data-testid={`console-bizdev-motion-row-${brand.id}`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 space-y-1">
                                  <p className="tf-console-title truncate font-semibold" title={brand.brand}>
                                    {brand.brand}
                                  </p>
                                  <p className="tf-console-body text-sm leading-6">
                                    {getBizdevSupportLine(brand)}
                                  </p>
                                  {brand.nextTouchDate ? (
                                    <p className="tf-console-copy-muted text-xs">
                                      Reminder {formatExecutionDateLabel(brand.nextTouchDate)}
                                    </p>
                                  ) : null}
                                </div>
                                <span className="tf-console-chip rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                                  {BIZDEV_PHASE_LABELS[brand.phase as BizdevPhase]}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <Button asChild className="tf-console-cta-secondary" data-testid="console-bizdev-motion-primary-cta">
                        <Link href="/bizdev">Open FollowUps</Link>
                      </Button>
                    </div>
                  </ConsoleModuleCard>
                ) : null}

                <ConsoleModuleCard
                  title="System Notes"
                  purpose="This preview shell records the current Console operating rules so the shipped module set stays additive, read-only, and centered on orientation instead of lane-owned work."
                  status="Current Slice"
                  testId="console-region-system-notes"
                  className="tf-console-panel-muted p-4 min-[1600px]:p-4"
                  contentClassName="min-[1600px]:mt-4"
                  purposeClassName="tf-console-copy-muted max-w-[24rem] text-[13px]"
                  {...getSelectionProps("system-notes")}
                  selectedSummary={
                    <div className="flex flex-wrap gap-2">
                      <span className="tf-console-chip rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                        Rules
                      </span>
                      <span className="tf-console-chip rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                        Read-only
                      </span>
                    </div>
                  }
                >
                  <div className="tf-console-copy-muted space-y-3 text-[13px]">
                    <div className="tf-console-surface rounded-2xl p-3.5">
                      <div className="flex items-start gap-3">
                      <Layers3 className="tf-console-eyebrow mt-0.5 h-4 w-4 shrink-0" />
                      <p>Phone stays a one-column overview. Tablet and small desktop stack the hero with support. Desktop adds a support rail. First ultrawide keeps the reading field centered.</p>
                      </div>
                    </div>
                    <div className="tf-console-surface rounded-2xl p-3.5">
                      <div className="flex items-start gap-3">
                      <CalendarClock className="tf-console-eyebrow mt-0.5 h-4 w-4 shrink-0" />
                      <p>`Assistant Review` and `Continuity` now reuse real AI draft and Vision read models. Review/apply and editing stay in Dashboard and the lane surfaces so Console does not drift into a crowded dashboard.</p>
                      </div>
                    </div>
                    <div className="tf-console-surface rounded-2xl p-3.5">
                      <div className="flex items-start gap-3">
                      <GitBranch className="tf-console-eyebrow mt-0.5 h-4 w-4 shrink-0" />
                      <p>Calendar projection, editing, review/apply, and lane-specific operations continue to live outside Console in Dashboard and the existing lane routes.</p>
                      </div>
                    </div>
                  </div>
                </ConsoleModuleCard>
              </div>
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
}

function ConstraintReminderRow({ item }: { item: LifeLedgerEventReminderQueueItem }) {
  return (
    <div className="tf-console-surface rounded-2xl px-4 py-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="tf-console-title font-semibold">{item.name}</p>
          <p className="tf-console-body text-sm">
            Next reminder {formatReminderTimestamp(item.nextReminderAt) ?? item.nextReminderAt}
          </p>
          <p className="tf-console-copy-muted text-xs">Executes {item.executionDate}</p>
        </div>
        <Link
          href={item.route}
          className="tf-console-link-open shrink-0 text-xs font-semibold uppercase tracking-[0.18em] transition-colors"
        >
          Open
        </Link>
      </div>
    </div>
  );
}
