import { useState, useEffect, useRef, useCallback } from "react";
import { Layout } from "@/components/layout";
import { AIDraftReviewPanel } from "@/components/shell/AIDraftReviewPanel";
import { LaneHero } from "@/components/shell/LaneHero";
import { CalendarLinkStatusCard } from "@/components/shell/CalendarLinkStatusCard";
import { MobileIntegrationStatusCard } from "@/components/shell/MobileIntegrationStatusCard";
import { SupportRail } from "@/components/shell/SupportRail";
import { BabyHeroConsequencesCard } from "@/components/shell/BabyHeroConsequencesCard";
import { WorkspaceMoodPicker } from "@/components/shell/WorkspaceMoodPicker";
import { SkipProtocol } from "@/components/skip-protocol";
import { 
  type AIDraft,
  type UserMode,
  type UserModeColourState,
  type UserModeMode,
  useApplyAiDraft,
  useListAiDrafts,
  getListAiDraftsQueryKey,
  useUpdateAiDraftReviewState,
  useGetWeeklyFrame, 
  useUpsertWeeklyFrame, 
  getGetWeeklyFrameQueryKey,
  useGetUserMode,
  useUpsertUserMode,
  getGetUserModeQueryKey,
  ApiError,
} from "@workspace/api-client-react";
import { getMondayOfCurrentWeek } from "@/lib/dates";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { WeeklyStep } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuthSession } from "@/hooks/use-auth-session";
import { ONBOARDING_QUERY_KEY, useOnboardingProgress } from "@/hooks/use-onboarding";
import { SurfaceOnboardingCard } from "@/components/surface-onboarding-card";
import {
  BasicAITimeSaver,
  BasicLaneNextStep,
  BasicLaneStepOrder,
  BasicMoreSection,
} from "@/components/basic-guidance";
import {
  AIDraftCanvasBlock,
  HabitCanvasObjectChip,
  HabitCanvasSection,
  HabitCanvasSurface,
} from "@/components/habit-canvas";
import {
  getWeeklyAIDraftReviewPanelCopy,
  weeklyAIDraftListParams,
} from "@/lib/ai-draft-review";
import { weeklyCalendarPlaceholder } from "@/lib/calendar-placeholders";
import { weeklyMobilePlaceholder } from "@/lib/mobile-placeholders";
import { useBabyKbHeroRollups } from "@/hooks/use-parent-packet-imports";

const STEP_EMOJIS = ["🎯", "🔥", "💡", "🌱", "🛠️", "⚡", "📌", "✅", "🚀", "🧠", "💪", "🎨"];

function EmojiPicker({ value, onChange }: { value?: string | null; onChange: (e: string | null) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-9 h-9 text-lg shrink-0"
          data-testid="button-emoji-picker"
        >
          {value || "➕"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2">
        <div className="grid grid-cols-6 gap-1">
          {STEP_EMOJIS.map(e => (
            <button
              key={e}
              onClick={() => onChange(e)}
              className={`text-lg p-1 rounded hover:bg-accent transition-colors ${value === e ? "bg-accent" : ""}`}
              data-testid={`emoji-option-${e}`}
            >
              {e}
            </button>
          ))}
          {value && (
            <button
              onClick={() => onChange(null)}
              className="text-xs text-muted-foreground col-span-6 mt-1 text-center hover:text-foreground"
            >
              clear
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function WeeklyPage() {
  const weekStart = getMondayOfCurrentWeek();
  const queryClient = useQueryClient();
  const { status: authSessionStatus } = useAuthSession();
  const { data: frame, isLoading, error } = useGetWeeklyFrame(weekStart, { 
    query: { enabled: !!weekStart, queryKey: getGetWeeklyFrameQueryKey(weekStart), retry: 0 } 
  });
  const {
    data: aiDrafts,
    isLoading: isAIDraftsLoading,
    error: aiDraftsError,
  } = useListAiDrafts(weeklyAIDraftListParams, {
    query: {
      enabled: !!weekStart,
      queryKey: getListAiDraftsQueryKey(weeklyAIDraftListParams),
      refetchOnWindowFocus: false,
    },
  });
  const frameError = error instanceof ApiError && error.status !== 404 ? error : null;
  const upsert = useUpsertWeeklyFrame();
  const { data: userMode } = useGetUserMode({
    query: {
      enabled: authSessionStatus === "ready",
      queryKey: getGetUserModeQueryKey(),
      retry: 0,
    },
  });
  const upsertUserMode = useUpsertUserMode();
  const applyAiDraft = useApplyAiDraft();
  const updateAiDraftReviewState = useUpdateAiDraftReviewState();
  const { isSurfaceComplete } = useOnboardingProgress();
  const weeklyAIDraftReview = getWeeklyAIDraftReviewPanelCopy();
  const { data: babyHeroRollups } = useBabyKbHeroRollups(true);

  const [theme, setTheme] = useState("");
  const [steps, setSteps] = useState<WeeklyStep[]>([
    { id: crypto.randomUUID(), text: "" },
    { id: crypto.randomUUID(), text: "" },
    { id: crypto.randomUUID(), text: "" }
  ]);
  const [nonNegotiables, setNonNegotiables] = useState<WeeklyStep[]>([
    { id: crypto.randomUUID(), text: "" },
    { id: crypto.randomUUID(), text: "" }
  ]);
  const [recoveryPlan, setRecoveryPlan] = useState("");
  const [applyingDraftId, setApplyingDraftId] = useState<number | null>(null);
  const [reviewingDraftId, setReviewingDraftId] = useState<number | null>(null);
  const [draftActionError, setDraftActionError] = useState<string | null>(null);

  const initRef = useRef<number | null>(null);

  const hydrateWeeklyFrameState = useCallback((nextFrame: {
    id: number;
    theme?: string | null;
    steps?: unknown;
    nonNegotiables?: unknown;
    recoveryPlan?: string | null;
  }) => {
    initRef.current = nextFrame.id;
    setTheme(nextFrame.theme || "");
    if (nextFrame.steps && Array.isArray(nextFrame.steps) && nextFrame.steps.length > 0) {
      setSteps(nextFrame.steps as WeeklyStep[]);
    } else {
      setSteps([
        { id: crypto.randomUUID(), text: "" },
        { id: crypto.randomUUID(), text: "" },
        { id: crypto.randomUUID(), text: "" },
      ]);
    }
    if (
      nextFrame.nonNegotiables &&
      Array.isArray(nextFrame.nonNegotiables) &&
      nextFrame.nonNegotiables.length > 0
    ) {
      setNonNegotiables(nextFrame.nonNegotiables as WeeklyStep[]);
    } else {
      setNonNegotiables([
        { id: crypto.randomUUID(), text: "" },
        { id: crypto.randomUUID(), text: "" },
      ]);
    }
    setRecoveryPlan(nextFrame.recoveryPlan || "");
  }, []);

  useEffect(() => {
    if (frame && initRef.current !== frame.id) {
      hydrateWeeklyFrameState(frame);
    }
  }, [frame, hydrateWeeklyFrameState]);

  const save = useCallback((updates: Partial<{
    theme: string;
    steps: WeeklyStep[];
    nonNegotiables: WeeklyStep[];
    recoveryPlan: string;
  }>) => {
    const payload = {
      theme: updates.theme ?? theme,
      steps: updates.steps ?? steps,
      nonNegotiables: updates.nonNegotiables ?? nonNegotiables,
      recoveryPlan: updates.recoveryPlan ?? recoveryPlan,
    };
    
    upsert.mutate({ weekStart, data: payload }, {
      onSuccess: (newFrame) => {
        queryClient.setQueryData(getGetWeeklyFrameQueryKey(weekStart), newFrame);
        queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY });
      }
    });
  }, [weekStart, theme, steps, nonNegotiables, recoveryPlan, upsert, queryClient]);

  const handleApplyDraft = useCallback(async (draftId: number) => {
    setApplyingDraftId(draftId);
    setDraftActionError(null);

    try {
      const response = await applyAiDraft.mutateAsync({
        id: draftId,
        data: { weekStart },
      });

      if (!response.weeklyFrame) {
        throw new Error("Weekly apply response did not include a weekly frame.");
      }

      hydrateWeeklyFrameState(response.weeklyFrame);
      queryClient.setQueryData(getGetWeeklyFrameQueryKey(weekStart), response.weeklyFrame);
      queryClient.setQueryData(getListAiDraftsQueryKey(weeklyAIDraftListParams), (current: AIDraft[] | undefined) =>
        current?.map((draft) => (draft.id === response.draft.id ? response.draft : draft)) ?? current,
      );
      queryClient.invalidateQueries({ queryKey: getGetWeeklyFrameQueryKey(weekStart) });
      queryClient.invalidateQueries({ queryKey: getListAiDraftsQueryKey(weeklyAIDraftListParams) });
      queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 409) {
          setDraftActionError("This draft can no longer be applied. Refresh the review panel and try another draft.");
        } else if (error.status === 422) {
          setDraftActionError("This stored draft payload no longer matches the Weekly frame contract and could not be applied.");
        } else {
          setDraftActionError(`Failed to apply the draft (HTTP ${error.status}).`);
        }
      } else if (error instanceof Error) {
        setDraftActionError(error.message);
      } else {
        setDraftActionError("Failed to apply the draft.");
      }
    } finally {
      setApplyingDraftId(null);
    }
  }, [applyAiDraft, hydrateWeeklyFrameState, queryClient, weekStart]);

  const handleReviewStateChange = useCallback(async (draftId: number, reviewState: "approved" | "rejected") => {
    setReviewingDraftId(draftId);
    setDraftActionError(null);

    try {
      const updatedDraft = await updateAiDraftReviewState.mutateAsync({
        id: draftId,
        data: { reviewState },
      });

      queryClient.setQueryData(getListAiDraftsQueryKey(weeklyAIDraftListParams), (current: AIDraft[] | undefined) =>
        current?.map((draft) => (draft.id === updatedDraft.id ? updatedDraft : draft)) ?? current,
      );
      queryClient.invalidateQueries({ queryKey: getListAiDraftsQueryKey(weeklyAIDraftListParams) });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 409) {
          setDraftActionError("This draft can no longer be reviewed from the current state.");
        } else {
          setDraftActionError(`Failed to update the draft review state (HTTP ${error.status}).`);
        }
      } else if (error instanceof Error) {
        setDraftActionError(error.message);
      } else {
        setDraftActionError("Failed to update the draft review state.");
      }
    } finally {
      setReviewingDraftId(null);
    }
  }, [queryClient, updateAiDraftReviewState]);

  const isNewFrame = !isLoading && !frame;

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto p-4 md:p-8 space-y-8">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      </Layout>
    );
  }

  if (frameError) {
    return (
      <Layout>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 py-24 text-center">
          <h2 className="text-xl font-semibold">Couldn't load this week's frame</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            {frameError.status === 401
              ? "You're not signed in. Please sign in and try again."
              : "Something went wrong on our end. Try refreshing the page."}
          </p>
        </div>
      </Layout>
    );
  }

  const updateStep = (id: string, text: string) => {
    const updated = steps.map(s => s.id === id ? { ...s, text } : s);
    setSteps(updated);
    save({ steps: updated });
  };

  const updateStepEmoji = (id: string, emoji: string | null) => {
    const updated = steps.map(s => s.id === id ? { ...s, emoji } : s);
    setSteps(updated);
    save({ steps: updated });
  };

  const updateNonNegotiable = (id: string, text: string) => {
    const updated = nonNegotiables.map(s => s.id === id ? { ...s, text } : s);
    setNonNegotiables(updated);
    save({ nonNegotiables: updated });
  };

  const addWeeklyStep = () => {
    const updated = [...steps, { id: crypto.randomUUID(), text: "" }];
    setSteps(updated);
    save({ steps: updated });
  };

  const addMustKeep = () => {
    const updated = [...nonNegotiables, { id: crypto.randomUUID(), text: "" }];
    setNonNegotiables(updated);
    save({ nonNegotiables: updated });
  };

  const handleColourChange = (color: UserModeColourState) => {
    const userModeQueryKey = getGetUserModeQueryKey();
    const previousMode = queryClient.getQueryData<UserMode | undefined>(userModeQueryKey);
    const nextMode = (previousMode?.mode ?? userMode?.mode ?? "explore") as UserModeMode;

    queryClient.setQueryData<UserMode>(userModeQueryKey, {
      id: previousMode?.id ?? userMode?.id ?? 0,
      userId: previousMode?.userId ?? userMode?.userId ?? "optimistic",
      mode: nextMode,
      colourState: color,
      createdAt: previousMode?.createdAt ?? userMode?.createdAt,
      updatedAt: new Date().toISOString(),
    });
    upsertUserMode.mutate(
      {
        data: {
          mode: nextMode,
          colourState: color,
        },
      },
      {
        onSuccess: (updatedMode) => {
          queryClient.setQueryData(userModeQueryKey, updatedMode);
        },
        onError: () => {
          queryClient.setQueryData(userModeQueryKey, previousMode);
        },
      },
    );
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-8 max-w-4xl space-y-10">
        <LaneHero
          label="This Week"
          title="This Week"
          subtitle={`Week of ${new Date(`${weekStart}T12:00:00`).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}`}
        />

        <WorkspaceMoodPicker
          colourState={(userMode?.colourState ?? "green") as UserModeColourState}
          onColourChange={handleColourChange}
          isSaving={upsertUserMode.isPending}
        />

        <div className="grid gap-3 md:grid-cols-2">
          <BasicLaneNextStep lane="weekly" isComplete={isSurfaceComplete("weekly")} />
          <BasicAITimeSaver lane="weekly" />
        </div>

        <BasicLaneStepOrder lane="weekly" />

        <HabitCanvasSurface
          title="Week Canvas"
          description="Design the week around a theme, protected steps, must-keep supports, and a backup plan."
          testId="week-canvas"
          aside={
            <>
              <HabitCanvasObjectChip tone="week">{steps.filter((step) => step.text.trim()).length} protected steps</HabitCanvasObjectChip>
              <HabitCanvasObjectChip tone="neutral">{nonNegotiables.filter((item) => item.text.trim()).length} supports</HabitCanvasObjectChip>
            </>
          }
        >
          <HabitCanvasSection
            stepLabel="Step 1"
            title="Name This Week"
            description="Use a short name or theme."
            testId="weekly-theme-island"
          >
            <Input
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              onBlur={() => save({ theme })}
              placeholder="e.g. steady week, school focus, rest..."
              className="max-w-md bg-transparent"
            />
          </HabitCanvasSection>

          {isNewFrame && (
            <div className="rounded-lg border border-accent bg-accent/40 px-5 py-4 text-sm text-muted-foreground" data-testid="empty-state-weekly">
              Start with one weekly name. It saves as you work.
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <HabitCanvasSection
              stepLabel="Step 2"
              title="Protected Steps"
              description="Write one to three steps for this week."
            >
            <div className="space-y-3" data-testid="weekly-steps">
              {steps.map((step, i) => (
                <div key={step.id} className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm font-medium w-4 shrink-0">{i + 1}.</span>
                  <EmojiPicker
                    value={step.emoji}
                    onChange={(emoji) => updateStepEmoji(step.id, emoji)}
                  />
                  <Input 
                    value={step.text}
                    onChange={(e) => updateStep(step.id, e.target.value)}
                    onBlur={() => save({ steps })}
                    placeholder="One week step..."
                    className="flex-1 bg-transparent"
                    data-testid={`input-step-${i}`}
                  />
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addWeeklyStep} data-testid="button-add-weekly-step">
                Add week step
              </Button>
            </div>
            </HabitCanvasSection>

            <HabitCanvasSection
              stepLabel="Step 3"
              title="Must-Keep Supports"
              description="Write the basics that help you stay okay."
            >
            <div className="space-y-3">
              {nonNegotiables.map((nn, i) => (
                <div key={nn.id} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                  <Input 
                    value={nn.text}
                    onChange={(e) => updateNonNegotiable(nn.id, e.target.value)}
                    onBlur={() => save({ nonNegotiables })}
                    placeholder="One must-keep item..."
                    className="flex-1 bg-transparent"
                    data-testid={`input-non-neg-${i}`}
                  />
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addMustKeep} data-testid="button-add-weekly-must-keep">
                Add must-keep item
              </Button>
            </div>
            </HabitCanvasSection>
          </div>

          <HabitCanvasSection
            stepLabel="Step 4"
            title="Backup Plan"
            description="Write the backup plan before you need it."
          >
          <Textarea 
            value={recoveryPlan}
            onChange={(e) => setRecoveryPlan(e.target.value)}
            onBlur={() => save({ recoveryPlan })}
            placeholder="Drop later tasks, take a break, ask for help..."
            className="resize-none h-24 bg-transparent"
          />
          </HabitCanvasSection>
        </HabitCanvasSurface>

        <BasicMoreSection
          title="Review AI drafts"
          description="AI can make a draft. You choose what to save."
          testId="more-ai-drafts-weekly"
        >
          <AIDraftCanvasBlock count={aiDrafts?.length ?? 0} label="Weekly draft review" />
          <AIDraftReviewPanel
            title={weeklyAIDraftReview.title}
            emptyTitle={weeklyAIDraftReview.emptyTitle}
            emptyDescription={weeklyAIDraftReview.emptyDescription}
            drafts={aiDrafts}
            isLoading={isAIDraftsLoading}
            errorMessage={aiDraftsError instanceof Error ? aiDraftsError.message : null}
            actionErrorMessage={draftActionError}
            modeBadgeLabel="Review first"
            footerNote="Weekly drafts can be approved, rejected, or applied to this week. AI does not save changes by itself."
            renderDraftActions={(draft) => {
              if (draft.reviewState === "applied") {
                return (
                  <Button variant="outline" size="sm" disabled>
                    Applied
                  </Button>
                );
              }

              const isBusy = applyingDraftId !== null || reviewingDraftId !== null;

              if (draft.reviewState === "rejected") {
                return (
                  <Button variant="outline" size="sm" disabled>
                    Rejected
                  </Button>
                );
              }

              if (draft.reviewState === "needs_review" || draft.reviewState === "approved") {
                return (
                  <div className="flex flex-wrap justify-end gap-2">
                    {draft.reviewState === "needs_review" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleReviewStateChange(draft.id, "approved")}
                        disabled={isBusy}
                        data-testid={`button-approve-draft-${draft.id}`}
                      >
                        {reviewingDraftId === draft.id ? "Saving..." : "Approve draft"}
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleReviewStateChange(draft.id, "rejected")}
                      disabled={isBusy}
                      data-testid={`button-reject-draft-${draft.id}`}
                    >
                      {reviewingDraftId === draft.id ? "Saving..." : "Reject draft"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => void handleApplyDraft(draft.id)}
                      disabled={isBusy}
                      data-testid={`button-apply-draft-${draft.id}`}
                    >
                      {applyingDraftId === draft.id ? "Saving..." : "Save to this week"}
                    </Button>
                  </div>
                );
              }

              return null;
            }}
            data-testid="ai-draft-placeholder-weekly"
          />
        </BasicMoreSection>

        <BasicMoreSection
          title="More help"
          description="Use these when the week needs extra support."
          testId="more-help-weekly"
        >
          <SkipProtocol />
          {!isSurfaceComplete("weekly") && <SurfaceOnboardingCard surface="weekly" />}
          <SupportRail direction="row">
            <span className="text-xs text-muted-foreground">Main Steps · Must Keep · If Things Get Hard</span>
          </SupportRail>
        </BasicMoreSection>

        <BasicMoreSection
          title="Connected tools"
          description="Calendar, mobile, and linked system items live here."
          testId="more-connected-tools-weekly"
        >
          <BabyHeroConsequencesCard
            title="Linked items this week"
            description="Linked assignments show here only when they shape this week."
            items={babyHeroRollups?.weekly ?? []}
            emptyMessage="No linked items are due this week."
            data-testid="baby-hero-consequences-weekly"
          />

          <CalendarLinkStatusCard
            state={weeklyCalendarPlaceholder.state}
            title={weeklyCalendarPlaceholder.title}
            description={weeklyCalendarPlaceholder.description}
            chips={weeklyCalendarPlaceholder.chips}
            note={weeklyCalendarPlaceholder.note}
            data-testid="calendar-placeholder-weekly"
          />

          <MobileIntegrationStatusCard
            mode={weeklyMobilePlaceholder.mode}
            title={weeklyMobilePlaceholder.title}
            description={weeklyMobilePlaceholder.description}
            chips={weeklyMobilePlaceholder.chips}
            note={weeklyMobilePlaceholder.note}
            data-testid="mobile-placeholder-weekly"
          />
        </BasicMoreSection>

      </div>
    </Layout>
  );
}
