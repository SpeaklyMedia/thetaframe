import { useState, useEffect, useRef, useCallback } from "react";
import { Layout } from "@/components/layout";
import { AIDraftReviewPanel } from "@/components/shell/AIDraftReviewPanel";
import { LaneHero } from "@/components/shell/LaneHero";
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
  useGetVisionFrame, 
  useUpsertVisionFrame, 
  getGetVisionFrameQueryKey,
  useGetUserMode,
  useUpsertUserMode,
  getGetUserModeQueryKey,
  ApiError,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { VisionGoal } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  getVisionAIDraftReviewPanelCopy,
  visionAIDraftListParams,
} from "@/lib/ai-draft-review";
import { useBabyKbHeroRollups } from "@/hooks/use-parent-packet-imports";

export default function VisionPage() {
  const queryClient = useQueryClient();
  const { status: authSessionStatus } = useAuthSession();
  const { data: babyHeroRollups } = useBabyKbHeroRollups(true);
  const { data: frame, isLoading, error } = useGetVisionFrame({ 
    query: { queryKey: getGetVisionFrameQueryKey(), retry: 0 } 
  });
  const {
    data: aiDrafts,
    isLoading: isAIDraftsLoading,
    error: aiDraftsError,
  } = useListAiDrafts(visionAIDraftListParams, {
    query: {
      queryKey: getListAiDraftsQueryKey(visionAIDraftListParams),
      refetchOnWindowFocus: false,
    },
  });
  const frameError = error instanceof ApiError && error.status !== 404 ? error : null;
  const upsert = useUpsertVisionFrame();
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
  const visionAIDraftReview = getVisionAIDraftReviewPanelCopy();

  const [goals, setGoals] = useState<VisionGoal[]>([
    { id: crypto.randomUUID(), text: "" },
    { id: crypto.randomUUID(), text: "" },
    { id: crypto.randomUUID(), text: "" }
  ]);
  const [nextSteps, setNextSteps] = useState<VisionGoal[]>([
    { id: crypto.randomUUID(), text: "" },
    { id: crypto.randomUUID(), text: "" },
    { id: crypto.randomUUID(), text: "" }
  ]);
  const [applyingDraftId, setApplyingDraftId] = useState<number | null>(null);
  const [reviewingDraftId, setReviewingDraftId] = useState<number | null>(null);
  const [draftActionError, setDraftActionError] = useState<string | null>(null);

  const initRef = useRef<number | null>(null);

  const hydrateVisionFrameState = useCallback((nextFrame: {
    id: number;
    goals?: VisionGoal[] | null;
    nextSteps?: VisionGoal[] | null;
  }) => {
    initRef.current = nextFrame.id;
    if (nextFrame.goals && nextFrame.goals.length > 0) {
      setGoals(nextFrame.goals);
    } else {
      setGoals([
        { id: crypto.randomUUID(), text: "" },
        { id: crypto.randomUUID(), text: "" },
        { id: crypto.randomUUID(), text: "" },
      ]);
    }
    if (nextFrame.nextSteps && nextFrame.nextSteps.length > 0) {
      setNextSteps(nextFrame.nextSteps);
    } else {
      setNextSteps([
        { id: crypto.randomUUID(), text: "" },
        { id: crypto.randomUUID(), text: "" },
        { id: crypto.randomUUID(), text: "" },
      ]);
    }
  }, []);

  useEffect(() => {
    if (frame && initRef.current !== frame.id) {
      hydrateVisionFrameState(frame);
    }
  }, [frame, hydrateVisionFrameState]);

  const save = useCallback((updates: Partial<{
    goals: VisionGoal[];
    nextSteps: VisionGoal[];
  }>) => {
    const payload = {
      goals: updates.goals ?? goals,
      nextSteps: updates.nextSteps ?? nextSteps,
    };
    
    upsert.mutate({ data: payload }, {
      onSuccess: (newFrame) => {
        queryClient.setQueryData(getGetVisionFrameQueryKey(), newFrame);
        queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY });
      }
    });
  }, [goals, nextSteps, upsert, queryClient]);

  const handleApplyDraft = useCallback(async (draftId: number) => {
    setApplyingDraftId(draftId);
    setDraftActionError(null);

    try {
      const response = await applyAiDraft.mutateAsync({
        id: draftId,
        data: {},
      });

      if (!response.visionFrame) {
        throw new Error("Vision apply response did not include a vision frame.");
      }

      hydrateVisionFrameState(response.visionFrame);
      queryClient.setQueryData(getGetVisionFrameQueryKey(), response.visionFrame);
      queryClient.setQueryData(getListAiDraftsQueryKey(visionAIDraftListParams), (current: AIDraft[] | undefined) =>
        current?.map((draft) => (draft.id === response.draft.id ? response.draft : draft)) ?? current,
      );
      queryClient.invalidateQueries({ queryKey: getGetVisionFrameQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListAiDraftsQueryKey(visionAIDraftListParams) });
      queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 409) {
          setDraftActionError("This draft can no longer be applied. Refresh the review panel and try another draft.");
        } else if (error.status === 422) {
          setDraftActionError("This stored draft payload no longer matches the Vision frame contract and could not be applied.");
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
  }, [applyAiDraft, hydrateVisionFrameState, queryClient]);

  const handleReviewStateChange = useCallback(async (draftId: number, reviewState: "approved" | "rejected") => {
    setReviewingDraftId(draftId);
    setDraftActionError(null);

    try {
      const updatedDraft = await updateAiDraftReviewState.mutateAsync({
        id: draftId,
        data: { reviewState },
      });

      queryClient.setQueryData(getListAiDraftsQueryKey(visionAIDraftListParams), (current: AIDraft[] | undefined) =>
        current?.map((draft) => (draft.id === updatedDraft.id ? updatedDraft : draft)) ?? current,
      );
      queryClient.invalidateQueries({ queryKey: getListAiDraftsQueryKey(visionAIDraftListParams) });
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
          <h2 className="text-xl font-semibold">Couldn't load your vision frame</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            {frameError.status === 401
              ? "You're not signed in. Please sign in and try again."
              : "Something went wrong on our end. Try refreshing the page."}
          </p>
        </div>
      </Layout>
    );
  }

  const updateGoal = (id: string, text: string) => {
    const updated = goals.map(s => s.id === id ? { ...s, text } : s);
    setGoals(updated);
    save({ goals: updated });
  };

  const updateNextStep = (id: string, text: string) => {
    const updated = nextSteps.map(s => s.id === id ? { ...s, text } : s);
    setNextSteps(updated);
    save({ nextSteps: updated });
  };

  const addGoal = () => {
    const updated = [...goals, { id: crypto.randomUUID(), text: "" }];
    setGoals(updated);
    save({ goals: updated });
  };

  const addNextStep = () => {
    const updated = [...nextSteps, { id: crypto.randomUUID(), text: "" }];
    setNextSteps(updated);
    save({ nextSteps: updated });
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
          label="Goals"
          title="Goals"
          subtitle="Big ideas, broken into next steps."
        />

        <WorkspaceMoodPicker
          colourState={(userMode?.colourState ?? "green") as UserModeColourState}
          onColourChange={handleColourChange}
          isSaving={upsertUserMode.isPending}
        />

        <div className="grid gap-3 md:grid-cols-2">
          <BasicLaneNextStep lane="vision" isComplete={isSurfaceComplete("vision")} />
          <BasicAITimeSaver lane="vision" />
        </div>

        <BasicLaneStepOrder lane="vision" />

        <HabitCanvasSurface
          title="Goals Canvas"
          description="Shape bigger goals into visible next steps and keep the support pattern close to the work."
          testId="goals-canvas"
          aside={
            <>
              <HabitCanvasObjectChip tone="goals">{goals.filter((goal) => goal.text.trim()).length} goals</HabitCanvasObjectChip>
              <HabitCanvasObjectChip tone="neutral">Support pattern below</HabitCanvasObjectChip>
            </>
          }
        >
          <HabitCanvasSection
            stepLabel="Step 1"
            title="Goals"
            description="Write one thing you want to build or change."
            testId="vision-goals-island"
          >
            <div className="space-y-3">
              {goals.map((goal, i) => (
                <div key={goal.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-medium text-sm shrink-0">
                    {i + 1}
                  </div>
                  <Input
                    value={goal.text}
                    onChange={(e) => updateGoal(goal.id, e.target.value)}
                    placeholder="One goal..."
                    className="flex-1 bg-transparent border-transparent focus-visible:border-input"
                  />
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addGoal} data-testid="button-add-vision-goal">
                Add goal
              </Button>
            </div>
          </HabitCanvasSection>

          {isNewFrame && (
            <div className="rounded-lg border border-accent bg-accent/40 px-5 py-4 text-sm text-muted-foreground" data-testid="empty-state-vision">
              Start with one goal. It saves as you work.
            </div>
          )}

          <HabitCanvasSection
            stepLabel="Step 2"
            title="Next Visible Steps"
            description="Write the next step you can actually see."
          >
          <div className="space-y-3">
            {nextSteps.map((step) => (
              <div key={step.id} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                <Input
                  value={step.text}
                  onChange={(e) => updateNextStep(step.id, e.target.value)}
                  placeholder="One next step..."
                  className="flex-1 bg-transparent border-transparent focus-visible:border-input"
                />
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addNextStep} data-testid="button-add-vision-next-step">
              Add next step
            </Button>
          </div>
          </HabitCanvasSection>
        </HabitCanvasSurface>

        <BasicMoreSection
          title="Review AI drafts"
          description="AI can make a draft. You choose what to save."
          testId="more-ai-drafts-vision"
        >
          <AIDraftCanvasBlock count={aiDrafts?.length ?? 0} label="Goals draft review" />
          <AIDraftReviewPanel
            title={visionAIDraftReview.title}
            emptyTitle={visionAIDraftReview.emptyTitle}
            emptyDescription={visionAIDraftReview.emptyDescription}
            drafts={aiDrafts}
            isLoading={isAIDraftsLoading}
            errorMessage={aiDraftsError instanceof Error ? aiDraftsError.message : null}
            actionErrorMessage={draftActionError}
            modeBadgeLabel="Review first"
            footerNote="Vision drafts can be approved, rejected, or applied to your goals. AI does not save changes by itself."
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

              if (draft.reviewState === "approval_gated" || draft.reviewState === "needs_review") {
                return (
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleReviewStateChange(draft.id, "approved")}
                      disabled={isBusy}
                      data-testid={`button-approve-draft-${draft.id}`}
                    >
                      {reviewingDraftId === draft.id ? "Saving..." : "Approve draft"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleReviewStateChange(draft.id, "rejected")}
                      disabled={isBusy}
                      data-testid={`button-reject-draft-${draft.id}`}
                    >
                      {reviewingDraftId === draft.id ? "Saving..." : "Reject draft"}
                    </Button>
                  </div>
                );
              }

              if (draft.reviewState === "approved") {
                return (
                  <div className="flex flex-wrap justify-end gap-2">
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
                      {applyingDraftId === draft.id ? "Saving..." : "Save to goals"}
                    </Button>
                  </div>
                );
              }

              return null;
            }}
            data-testid="ai-draft-placeholder-vision"
          />
        </BasicMoreSection>

        <BasicMoreSection
          title="More help"
          description="Use these when goals need extra support."
          testId="more-help-vision"
        >
          <SkipProtocol />
          {!isSurfaceComplete("vision") && <SurfaceOnboardingCard surface="vision" />}
          <SupportRail direction="row">
            <span className="text-xs text-muted-foreground">Goals · Next Steps</span>
          </SupportRail>
        </BasicMoreSection>

        <BasicMoreSection
          title="Connected tools"
          description="Linked longer-term items live here."
          testId="more-connected-tools-vision"
        >
          <BabyHeroConsequencesCard
            title="Linked milestones"
            description="Linked assignments show here only when they affect your bigger picture."
            items={babyHeroRollups?.vision ?? []}
            emptyMessage="No linked milestones are in this window."
            data-testid="baby-hero-consequences-vision"
          />
        </BasicMoreSection>

      </div>
    </Layout>
  );
}
