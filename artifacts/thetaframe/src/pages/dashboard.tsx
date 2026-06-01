import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  type AIDraft,
  type UserModeMode,
  getGetUserModeQueryKey,
  getListAiDraftsQueryKey,
  useGetUserMode,
  useListAiDrafts,
  useUpsertUserMode,
} from "@workspace/api-client-react";
import { CalendarDays, CheckCircle2, ClipboardCheck, LayoutDashboard, Smartphone, Sparkles } from "lucide-react";
import { HabitCanvasMap, type HabitCanvasMapNode } from "@/components/habit-canvas";
import { DashboardBrainDumpSetup } from "@/components/dashboard-brain-dump-setup";
import { Layout } from "@/components/layout";
import { LifeOSDashboardWidget } from "@/components/lifeos/LifeOSDashboardWidget";
import { LaneHero } from "@/components/shell/LaneHero";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/hooks/use-auth-session";
import { usePermissions } from "@/hooks/usePermissions";
import {
  BASIC_LANE_ACTION_STEPS,
  BASIC_LANE_ORDER,
  BASIC_LANE_STEPS,
  type BasicLane,
} from "@/lib/basic-onboarding";
import {
  dailyAIDraftListParams,
  getLifeLedgerAIDraftListParams,
  reachAIDraftListParams,
  visionAIDraftListParams,
  weeklyAIDraftListParams,
} from "@/lib/ai-draft-review";
import { getEmotionColorClass, type WorkspaceColourState } from "@/lib/colors";
import { getMondayOfCurrentWeek, getTodayDateString } from "@/lib/dates";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { getReminderToneCopy } from "@/lib/user-preferences";

const DASHBOARD_MODE_OPTIONS: readonly {
  label: string;
  description: string;
  mode: UserModeMode;
}[] = [
  {
    label: "Look Around",
    description: "Scan for what needs attention before choosing.",
    mode: "explore",
  },
  {
    label: "Do The Work",
    description: "Protect focus around the next useful action.",
    mode: "build",
  },
  {
    label: "Wrap Up",
    description: "Save progress and leave a clean next step.",
    mode: "release",
  },
];

const REVIEW_STATES = new Set<AIDraft["reviewState"]>(["draft", "needs_review", "approval_gated"]);

function countReviewDrafts(drafts: AIDraft[] | undefined): number {
  return drafts?.filter((draft) => REVIEW_STATES.has(draft.reviewState)).length ?? 0;
}

function isWorkspaceColour(value: string | null | undefined): value is WorkspaceColourState {
  return value === "green" || value === "yellow" || value === "red" || value === "blue" || value === "purple";
}

function DashboardSection({
  title,
  description,
  testId,
  children,
}: {
  title: string;
  description?: string;
  testId?: string;
  children: ReactNode;
}) {
  return (
    <section className="tf-density-card rounded-lg border bg-card/90 shadow-sm" data-testid={testId}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { status } = useAuthSession();
  const todayDate = getTodayDateString();
  const weekStart = getMondayOfCurrentWeek();
  const { modules, isAdmin, isError: permissionsError } = usePermissions();
  const hasAllowedModule = (module: string) => isAdmin || (!permissionsError && modules.includes(module));
  const canDaily = hasAllowedModule("daily");
  const canWeekly = hasAllowedModule("weekly");
  const canVision = hasAllowedModule("vision");
  const canLifeLedger = hasAllowedModule("life-ledger");
  const canReach = hasAllowedModule("reach");
  const canBizDev = hasAllowedModule("bizdev");

  const { data: userMode } = useGetUserMode({
    query: {
      enabled: status === "ready",
      queryKey: getGetUserModeQueryKey(),
      retry: 0,
    },
  });
  const upsertUserMode = useUpsertUserMode();
  const currentColour = isWorkspaceColour(userMode?.colourState) ? userMode.colourState : null;
  const currentMode = userMode?.mode as UserModeMode | undefined;
  const { preferences } = useUserPreferences();

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

  const reviewCounts = [
    { label: "Today", href: "/daily", count: countReviewDrafts(dailyDrafts.data), enabled: canDaily },
    { label: "This Week", href: "/weekly", count: countReviewDrafts(weeklyDrafts.data), enabled: canWeekly },
    { label: "Goals", href: "/vision", count: countReviewDrafts(visionDrafts.data), enabled: canVision },
    { label: "REACH", href: "/reach", count: countReviewDrafts(reachDrafts.data), enabled: canReach },
    {
      label: "Life Ledger",
      href: "/life-ledger?tab=events",
      count: countReviewDrafts(lifeLedgerDrafts.data),
      enabled: canLifeLedger,
    },
  ].filter((item) => item.enabled);
  const totalReviewCount = reviewCounts.reduce((total, item) => total + item.count, 0);
  const basicLaneAccess: Record<BasicLane, boolean> = {
    daily: canDaily,
    weekly: canWeekly,
    vision: canVision,
  };
  const currentColourLabel = currentColour ? currentColour[0].toUpperCase() + currentColour.slice(1) : "Not set";
  const basicCanvasNodes: HabitCanvasMapNode[] = BASIC_LANE_ORDER
    .filter((lane) => basicLaneAccess[lane])
    .map((lane) => {
      const step = BASIC_LANE_STEPS[lane];
      const firstAction = BASIC_LANE_ACTION_STEPS[lane][0];

      return {
        id: lane,
        title: step.plainLabel,
        subtitle: firstAction.description,
        href: step.href,
        actionLabel: firstAction.actionLabel,
        status: lane === "daily" ? "Today Canvas" : lane === "weekly" ? "Week Canvas" : "Goals Canvas",
        testId: `dashboard-canvas-node-${lane}`,
        focusTestId: `habit-focus-card-dashboard-${lane}`,
      };
    });

  const handleModeChange = (mode: UserModeMode) => {
    upsertUserMode.mutate(
      { data: { mode, colourState: currentColour ?? "green" } },
      {
        onSuccess: (result) => {
          queryClient.setQueryData(getGetUserModeQueryKey(), result);
        },
      },
    );
  };

  return (
    <Layout>
      <main
        className="tf-density-page tf-density-page-spacious container mx-auto max-w-6xl space-y-6 lg:space-y-8"
        data-testid="dashboard-control-center"
      >
        <LaneHero
          label="Dashboard"
          title="Daily command center"
          subtitle="Check safety, choose focus, and move one useful lane forward."
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LayoutDashboard className="h-4 w-4" />
            <span>Review gates before making bigger moves.</span>
          </div>
        </LaneHero>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] xl:gap-8">
          <div className="space-y-5 lg:space-y-6">
            <DashboardBrainDumpSetup
              dailyDrafts={dailyDrafts.data}
              weeklyDrafts={weeklyDrafts.data}
              visionDrafts={visionDrafts.data}
              date={todayDate}
              weekStart={weekStart}
              canUse={canDaily && canWeekly && canVision}
            />

            <LifeOSDashboardWidget />

            <DashboardSection
              title="Start here today"
              description="Pick one small action. You can switch lanes later."
              testId="dashboard-start-today"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Current color:</span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getEmotionColorClass(currentColour)}`}
                >
                  {currentColourLabel}
                </span>
              </div>
              <div className="mt-4">
                <HabitCanvasMap
                  nodes={basicCanvasNodes}
                  colourLabel={currentColourLabel}
                  draftCount={totalReviewCount}
                />
              </div>
            </DashboardSection>

            <DashboardSection
              title="Needs review"
              testId="dashboard-needs-review"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-sm font-semibold">AI review queue</span>
                </div>
                <span className="rounded-full border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
                  {totalReviewCount} waiting
                </span>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {reviewCounts.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group rounded-lg border bg-background/80 p-3 transition-colors hover:border-primary/50 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-sm font-semibold">{item.label}</span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          item.count > 0
                            ? "bg-violet-100 text-violet-900"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {item.count}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </DashboardSection>

            <DashboardSection
              title="Coming up"
              description={canLifeLedger ? getReminderToneCopy(preferences.reminderTone, "dashboardComingUp") : "Use Today and This Week to plan what is next."}
              testId="dashboard-coming-up"
            >
              {canLifeLedger ? (
                <div className="tf-density-card flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-background/80">
                  <div className="flex items-start gap-3">
                    <CalendarDays className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-semibold">Life Ledger events</p>
                      <p className="text-sm text-muted-foreground">
                        {getReminderToneCopy(preferences.reminderTone, "dashboardLifeLedger")}
                      </p>
                    </div>
                  </div>
                  <Button asChild type="button" variant="outline" size="sm">
                    <Link href="/life-ledger?tab=events">Open events</Link>
                  </Button>
                </div>
              ) : (
                <div className="tf-density-card flex items-start gap-4 rounded-lg border bg-background/80">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Start with one action for today, then protect one step for the week.
                  </p>
                </div>
              )}
            </DashboardSection>

            <DashboardSection
              title="Plan calendar"
              description="Calendar planning is a workspace note right now. Real calendar sync is not on yet."
              testId="dashboard-calendar-planning"
            >
              <div className="tf-density-card flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-background/80">
                <div className="flex items-start gap-3">
                  <ClipboardCheck className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">Shape the plan first</p>
                    <p className="text-sm text-muted-foreground">
                      Use Today and This Week before placing work on a calendar.
                    </p>
                  </div>
                </div>
                <Button asChild type="button" variant="outline" size="sm">
                  <Link href="/weekly">Plan week</Link>
                </Button>
              </div>
            </DashboardSection>
          </div>

          <aside className="space-y-5 lg:space-y-6">
            <DashboardSection
              title="Focus mode"
              description="Tell the workspace how to support this session."
            >
              <div className="grid gap-2">
                {DASHBOARD_MODE_OPTIONS.map((option) => {
                  const isCurrent = currentMode === option.mode;
                  return (
                    <button
                      key={option.mode}
                      type="button"
                      className={`rounded-md border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        isCurrent
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "bg-background hover:border-primary/50 hover:bg-accent"
                      }`}
                      onClick={() => handleModeChange(option.mode)}
                      disabled={upsertUserMode.isPending}
                    >
                      <span className="block text-sm font-semibold">{option.label}</span>
                      <span className={isCurrent ? "block text-sm text-primary-foreground/85" : "block text-sm text-muted-foreground"}>
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </DashboardSection>

            {canLifeLedger ? (
              <DashboardSection
                title="Mobile reminders"
                description="Return prompts for reminders, events, and follow-up moments."
                testId="dashboard-mobile-returns"
              >
                <div className="flex items-start gap-3">
                  <Smartphone className="mt-0.5 h-4 w-4 text-primary" />
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {getReminderToneCopy(preferences.reminderTone, "dashboardPhoneRemindersBody")}
                    </p>
                    <Button asChild type="button" variant="outline" size="sm">
                      <Link href="/life-ledger?tab=events">Open reminders</Link>
                    </Button>
                  </div>
                </div>
              </DashboardSection>
            ) : null}

            {(canBizDev || isAdmin) ? (
              <DashboardSection
                title="Assigned work lanes"
                description="Open the work areas available to this account."
              >
                <div className="space-y-2">
                  {canBizDev ? (
                    <Button asChild type="button" variant="outline" className="w-full justify-start">
                      <Link href="/bizdev">Open FollowUps</Link>
                    </Button>
                  ) : null}
                  {isAdmin ? (
                    <Button asChild type="button" variant="outline" className="w-full justify-start">
                      <Link href="/admin">Open Admin governance</Link>
                    </Button>
                  ) : null}
                </div>
              </DashboardSection>
            ) : null}
          </aside>
        </div>
      </main>
    </Layout>
  );
}
