import { useState, useEffect, useRef, useCallback } from "react";
import { Layout } from "@/components/layout";
import { AIDraftReviewPanel } from "@/components/shell/AIDraftReviewPanel";
import { LaneHero } from "@/components/shell/LaneHero";
import { CalendarLinkStatusCard } from "@/components/shell/CalendarLinkStatusCard";
import { MobileIntegrationStatusCard } from "@/components/shell/MobileIntegrationStatusCard";
import { BabyHeroConsequencesCard } from "@/components/shell/BabyHeroConsequencesCard";
import { SupportRail } from "@/components/shell/SupportRail";
import { WorkspaceMoodPicker } from "@/components/shell/WorkspaceMoodPicker";
import {
  type AIDraft,
  type UserMode,
  type UserModeColourState,
  useApplyAiDraft,
  useListAiDrafts,
  getListAiDraftsQueryKey,
  useUpdateAiDraftReviewState,
  useGetDailyFrame,
  useUpsertDailyFrame,
  useCreateMobileQuickCapture,
  useGetUserMode,
  useUpsertUserMode,
  getGetDailyFrameQueryKey,
  getGetUserModeQueryKey,
  type MobileQuickCaptureChannel,
  type UserModeMode,
} from "@workspace/api-client-react";
import { useAuth } from "@clerk/react";
import { getTodayDateString } from "@/lib/dates";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { DailyFrameColourState, TierTask, TimeBlock } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";
import { SkipProtocol } from "@/components/skip-protocol";
import { ApiError } from "@workspace/api-client-react";
import { useAuthSession } from "@/hooks/use-auth-session";
import { ONBOARDING_QUERY_KEY, useOnboardingProgress } from "@/hooks/use-onboarding";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
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
  TaskFeelingColorControl,
  TaskFeelingRelaxationRow,
  type TaskFeelingColour,
} from "@/components/task-feeling-color";
import {
  dailyAIDraftListParams,
  getDailyAIDraftReviewPanelCopy,
} from "@/lib/ai-draft-review";
import { dailyCalendarPlaceholder } from "@/lib/calendar-placeholders";
import { dailyMobilePlaceholder } from "@/lib/mobile-placeholders";
import { useBabyKbHeroRollups } from "@/hooks/use-parent-packet-imports";
import { mobileDeepLinkByLane, resolveQuickCaptureIntentRoute } from "@/lib/mobile-routing";

function getDailyFrameErrorMessage(error: ApiError<unknown>): string {
  if (error.status === 400) {
    return "Today's date request was invalid. Refresh and try again.";
  }

  if (error.status === 401) {
    return "Your session could not be verified. Sign in again and retry.";
  }

  if (error.status >= 500) {
    return "The server failed while loading today's frame. Try again shortly.";
  }

  return `Request failed while loading today's frame (HTTP ${error.status}).`;
}

function DailyMobileQuickCaptureCard({
  inputValue,
  onInputChange,
  onCapture,
  captureState,
  errorMessage,
  lastCapture,
}: {
  inputValue: string;
  onInputChange: (value: string) => void;
  onCapture: (channel: MobileQuickCaptureChannel) => void;
  captureState: MobileQuickCaptureChannel | null;
  errorMessage: string | null;
  lastCapture: { text: string; route: string; deepLink: string } | null;
}) {
  const quickCapture = resolveQuickCaptureIntentRoute("current_work");
  const dynamicChips = [
    ...dailyMobilePlaceholder.chips,
    `Deep link: ${mobileDeepLinkByLane.daily}`,
    "Channels: ios_shortcut + android_shortcut",
  ];

  return (
    <MobileIntegrationStatusCard
      mode={dailyMobilePlaceholder.mode}
      title="Daily shortcut capture is now live"
      description="Phone capture now writes directly into Can Do Later without making another list."
      chips={dynamicChips}
      note="This slice activates shortcut-based Daily quick capture only. Share sheet, widgets, and other lanes remain dormant."
      statusLabel="Quick capture active"
      data-testid="mobile-placeholder-daily"
    >
      <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Daily quick-capture simulator</p>
          <p className="text-xs text-muted-foreground">
            Captures route to <span className="font-medium">{quickCapture.route}</span> and add one Can Do Later task.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
          <Input
            value={inputValue}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder="Capture a task into Can Do Later"
            data-testid="input-daily-mobile-quick-capture"
          />
          <Button
            variant="outline"
            disabled={captureState !== null}
            onClick={() => onCapture("ios_shortcut")}
            data-testid="button-daily-mobile-capture-ios"
          >
            {captureState === "ios_shortcut" ? "Capturing..." : "Capture via iPhone Shortcut"}
          </Button>
          <Button
            variant="outline"
            disabled={captureState !== null}
            onClick={() => onCapture("android_shortcut")}
            data-testid="button-daily-mobile-capture-android"
          >
            {captureState === "android_shortcut" ? "Capturing..." : "Capture via Android Shortcut"}
          </Button>
        </div>

        {errorMessage ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive" data-testid="daily-mobile-capture-error">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-background/80 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Target lane</p>
            <p className="mt-1 text-sm font-medium capitalize">{quickCapture.lane}</p>
            <p className="mt-1 text-xs text-muted-foreground">{quickCapture.route}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/80 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Deep link</p>
            <p className="mt-1 text-sm font-medium truncate">{mobileDeepLinkByLane.daily}</p>
            <p className="mt-1 text-xs text-muted-foreground">Lane-safe return route for shortcut capture.</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/80 p-3" data-testid="daily-mobile-capture-last-preview">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Last captured task</p>
            <p className="mt-1 text-sm font-medium truncate">{lastCapture?.text ?? "No shortcut capture yet"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {lastCapture ? `${lastCapture.route} · ${lastCapture.deepLink}` : "Successful shortcut captures will preview here."}
            </p>
          </div>
        </div>
      </div>
    </MobileIntegrationStatusCard>
  );
}

export default function DailyPage() {
  const date = getTodayDateString();
  const { isLoaded: isAuthLoaded, userId } = useAuth();
  const { status: authSessionStatus, errorMessage: authSessionError } = useAuthSession();
  const queryClient = useQueryClient();
  const { surfaces, isSurfaceComplete } = useOnboardingProgress();
  const { data: frame, isLoading, error, refetch } = useGetDailyFrame(date, {
    query: {
      enabled: isAuthLoaded && Boolean(userId) && authSessionStatus === "ready" && !!date,
      queryKey: getGetDailyFrameQueryKey(date),
      retry: 0,
    },
  });
  const {
    data: aiDrafts,
    isLoading: isAIDraftsLoading,
    error: aiDraftsError,
  } = useListAiDrafts(dailyAIDraftListParams, {
    query: {
      enabled: isAuthLoaded && Boolean(userId) && authSessionStatus === "ready",
      queryKey: getListAiDraftsQueryKey(dailyAIDraftListParams),
      refetchOnWindowFocus: false,
    },
  });
  const { data: userMode } = useGetUserMode({
    query: {
      enabled: isAuthLoaded && Boolean(userId) && authSessionStatus === "ready",
      queryKey: getGetUserModeQueryKey(),
      retry: 0,
    },
  });
  const isFirstRunDaily = error instanceof ApiError && error.status === 404;
  const frameError = error instanceof ApiError && error.status !== 404 ? error : null;
  const remainingSurfaces = surfaces.filter((surface) => surface.surface !== "daily" && !surface.isComplete);
  const upsert = useUpsertDailyFrame();
  const upsertUserMode = useUpsertUserMode();
  const createMobileQuickCapture = useCreateMobileQuickCapture();
  const applyAiDraft = useApplyAiDraft();
  const updateAiDraftReviewState = useUpdateAiDraftReviewState();
  const dailyAIDraftReview = getDailyAIDraftReviewPanelCopy();
  const { data: babyHeroRollups } = useBabyKbHeroRollups(true);

  const [colourState, setColourState] = useState<DailyFrameColourState>("green");
  const [tierA, setTierA] = useState<TierTask[]>([]);
  const [tierB, setTierB] = useState<TierTask[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [microWin, setMicroWin] = useState("");
  const [taskFeelingColours, setTaskFeelingColours] = useState<Record<string, TaskFeelingColour>>({});
  const [applyingDraftId, setApplyingDraftId] = useState<number | null>(null);
  const [reviewingDraftId, setReviewingDraftId] = useState<number | null>(null);
  const [draftActionError, setDraftActionError] = useState<string | null>(null);
  const [mobileCaptureInput, setMobileCaptureInput] = useState("");
  const [mobileCaptureState, setMobileCaptureState] = useState<MobileQuickCaptureChannel | null>(null);
  const [mobileCaptureError, setMobileCaptureError] = useState<string | null>(null);
  const [lastMobileCapture, setLastMobileCapture] = useState<{ text: string; route: string; deepLink: string } | null>(null);

  const initRef = useRef<number | null>(null);

  const hydrateDailyFrameState = useCallback((nextFrame: {
    id: number;
    colourState: DailyFrameColourState;
    tierA: unknown;
    tierB: unknown;
    timeBlocks: unknown;
    microWin?: string | null;
  }) => {
    initRef.current = nextFrame.id;
    setColourState(nextFrame.colourState);
    setTierA((nextFrame.tierA as TierTask[]) || []);
    setTierB((nextFrame.tierB as TierTask[]) || []);
    setTimeBlocks((nextFrame.timeBlocks as TimeBlock[]) || []);
    setMicroWin(nextFrame.microWin || "");
  }, []);

  useEffect(() => {
    if (frame && initRef.current !== frame.id) {
      hydrateDailyFrameState(frame);
    }
  }, [frame, hydrateDailyFrameState]);

  const save = useCallback(
    (updates: Partial<{
      colourState: DailyFrameColourState;
      tierA: TierTask[];
      tierB: TierTask[];
      timeBlocks: TimeBlock[];
      microWin: string;
    }>) => {
      const payload = {
        colourState: updates.colourState ?? colourState,
        tierA: updates.tierA ?? tierA,
        tierB: updates.tierB ?? tierB,
        timeBlocks: updates.timeBlocks ?? timeBlocks,
        microWin: updates.microWin ?? microWin,
        skipProtocolUsed: frame?.skipProtocolUsed ?? false,
        skipProtocolChoice: (frame?.skipProtocolChoice as "micro-win" | "intentional-recovery" | null) ?? null,
      };
      upsert.mutate({ date, data: payload }, {
        onSuccess: (newFrame) => {
          queryClient.setQueryData(getGetDailyFrameQueryKey(date), newFrame);
          queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY });
        },
      });
    },
    [date, colourState, tierA, tierB, timeBlocks, microWin, frame, upsert, queryClient]
  );

  const handleMobileQuickCapture = useCallback(async (captureChannel: MobileQuickCaptureChannel) => {
    setMobileCaptureState(captureChannel);
    setMobileCaptureError(null);

    try {
      const response = await createMobileQuickCapture.mutateAsync({
        data: {
          intent: "current_work",
          text: mobileCaptureInput,
          captureChannel,
        },
      });

      hydrateDailyFrameState(response.dailyFrame);
      queryClient.setQueryData(getGetDailyFrameQueryKey(date), response.dailyFrame);
      queryClient.invalidateQueries({ queryKey: getGetDailyFrameQueryKey(date) });
      queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY });
      setLastMobileCapture({
        text: mobileCaptureInput.trim(),
        route: response.route,
        deepLink: response.deepLink,
      });
      setMobileCaptureInput("");
      await refetch();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 400) {
          setMobileCaptureError("Enter a non-empty task before capturing it into Daily.");
        } else {
          setMobileCaptureError(`Failed to capture the shortcut task (HTTP ${error.status}).`);
        }
      } else if (error instanceof Error) {
        setMobileCaptureError(error.message);
      } else {
        setMobileCaptureError("Failed to capture the shortcut task.");
      }
    } finally {
      setMobileCaptureState(null);
    }
  }, [createMobileQuickCapture, date, hydrateDailyFrameState, mobileCaptureInput, queryClient, refetch]);

  const handleApplyDraft = useCallback(async (draftId: number) => {
    setApplyingDraftId(draftId);
    setDraftActionError(null);

    try {
      const response = await applyAiDraft.mutateAsync({
        id: draftId,
        data: { date },
      });

      if (!response.dailyFrame) {
        throw new Error("Daily apply response did not include a daily frame.");
      }

      hydrateDailyFrameState(response.dailyFrame);
      queryClient.setQueryData(getGetDailyFrameQueryKey(date), response.dailyFrame);
      queryClient.setQueryData(getListAiDraftsQueryKey(dailyAIDraftListParams), (current: AIDraft[] | undefined) =>
        current?.map((draft) => (draft.id === response.draft.id ? response.draft : draft)) ?? current,
      );
      queryClient.invalidateQueries({ queryKey: getGetDailyFrameQueryKey(date) });
      queryClient.invalidateQueries({ queryKey: getListAiDraftsQueryKey(dailyAIDraftListParams) });
      queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 409) {
          setDraftActionError("This draft can no longer be applied. Refresh the review panel and try another draft.");
        } else if (error.status === 422) {
          setDraftActionError("This stored draft payload no longer matches the Daily frame contract and could not be applied.");
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
  }, [applyAiDraft, date, hydrateDailyFrameState, queryClient]);

  const handleReviewStateChange = useCallback(async (draftId: number, reviewState: "approved" | "rejected") => {
    setReviewingDraftId(draftId);
    setDraftActionError(null);

    try {
      const updatedDraft = await updateAiDraftReviewState.mutateAsync({
        id: draftId,
        data: { reviewState },
      });

      queryClient.setQueryData(getListAiDraftsQueryKey(dailyAIDraftListParams), (current: AIDraft[] | undefined) =>
        current?.map((draft) => (draft.id === updatedDraft.id ? updatedDraft : draft)) ?? current,
      );
      queryClient.invalidateQueries({ queryKey: getListAiDraftsQueryKey(dailyAIDraftListParams) });
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

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto p-4 md:p-8 space-y-8">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (isAuthLoaded && userId && authSessionStatus === "failed") {
    return (
      <Layout>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 py-24 text-center">
          <h2 className="text-xl font-semibold">Your session is not ready</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            {authSessionError ?? "We could not prepare a signed-in session for today's frame."}
          </p>
          <p className="text-xs text-muted-foreground" data-testid="text-daily-frame-session-meta">
            Date: {date} · Session: {authSessionStatus}
          </p>
        </div>
      </Layout>
    );
  }

  if (frameError) {
    return (
      <Layout>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 py-24 text-center">
          <h2 className="text-xl font-semibold">Couldn't load today's frame</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            {getDailyFrameErrorMessage(frameError)}
          </p>
          <p className="text-xs text-muted-foreground" data-testid="text-daily-frame-error-meta">
            Date: {date} · HTTP {frameError.status}
          </p>
        </div>
      </Layout>
    );
  }

  const handleColourChange = (color: UserModeColourState) => {
    const dailyColour = color as DailyFrameColourState;
    const userModeQueryKey = getGetUserModeQueryKey();
    const previousMode = queryClient.getQueryData<UserMode | undefined>(userModeQueryKey);
    const nextMode = (previousMode?.mode ?? userMode?.mode ?? "explore") as UserModeMode;

    setColourState(dailyColour);
    queryClient.setQueryData<UserMode>(userModeQueryKey, {
      id: previousMode?.id ?? userMode?.id ?? 0,
      userId: previousMode?.userId ?? userMode?.userId ?? userId ?? "optimistic",
      mode: nextMode,
      colourState: color,
      createdAt: previousMode?.createdAt ?? userMode?.createdAt,
      updatedAt: new Date().toISOString(),
    });
    save({ colourState: dailyColour });
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

  const updateTierTaskText = (tier: "A" | "B", id: string, text: string) => {
    if (tier === "A") {
      setTierA(prev => prev.map(t => t.id === id ? { ...t, text } : t));
    } else {
      setTierB(prev => prev.map(t => t.id === id ? { ...t, text } : t));
    }
  };

  const toggleTierTask = (tier: "A" | "B", id: string, completed: boolean) => {
    if (tier === "A") {
      const updated = tierA.map(t => t.id === id ? { ...t, completed } : t);
      setTierA(updated);
      save({ tierA: updated });
    } else {
      const updated = tierB.map(t => t.id === id ? { ...t, completed } : t);
      setTierB(updated);
      save({ tierB: updated });
    }
  };

  const addTierTask = (tier: "A" | "B") => {
    const newTask: TierTask = { id: crypto.randomUUID(), text: "", completed: false };
    if (tier === "A") {
      if (tierA.length >= 3) return;
      const updated = [...tierA, newTask];
      setTierA(updated);
      save({ tierA: updated });
    } else {
      const updated = [...tierB, newTask];
      setTierB(updated);
      save({ tierB: updated });
    }
  };

  const getTaskFeelingColour = (id: string): TaskFeelingColour => taskFeelingColours[id] ?? "green";

  const setTaskFeelingColour = (id: string, colour: TaskFeelingColour) => {
    setTaskFeelingColours((current) => ({ ...current, [id]: colour }));
  };

  const removeTierTask = (tier: "A" | "B", id: string) => {
    if (tier === "A") {
      const updated = tierA.filter(t => t.id !== id);
      setTierA(updated);
      save({ tierA: updated });
    } else {
      const updated = tierB.filter(t => t.id !== id);
      setTierB(updated);
      save({ tierB: updated });
    }
    setTaskFeelingColours((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const addTimeBlock = () => {
    const newBlock: TimeBlock = { id: crypto.randomUUID(), startTime: "09:00", action: "" };
    const updated = [...timeBlocks, newBlock];
    setTimeBlocks(updated);
    save({ timeBlocks: updated });
  };

  const updateTimeBlockField = (id: string, field: "startTime" | "action", value: string, immediate = false) => {
    const updated = timeBlocks.map(b => b.id === id ? { ...b, [field]: value } : b);
    setTimeBlocks(updated);
    if (immediate) save({ timeBlocks: updated });
  };

  const removeTimeBlock = (id: string) => {
    const updated = timeBlocks.filter(b => b.id !== id);
    setTimeBlocks(updated);
    save({ timeBlocks: updated });
  };

  const saveSkipProtocol = (
    used: boolean,
    choice: "micro-win" | "intentional-recovery" | null,
  ) => {
    const payload = {
      colourState,
      tierA,
      tierB,
      timeBlocks,
      microWin,
      skipProtocolUsed: used,
      skipProtocolChoice: choice,
    };

    upsert.mutate({ date, data: payload }, {
      onSuccess: (newFrame) => {
        queryClient.setQueryData(getGetDailyFrameQueryKey(date), newFrame);
        queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY });
      },
    });
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-8 max-w-4xl space-y-10">
        <LaneHero
          label="Today"
          title={new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          subtitle={isFirstRunDaily ? "Set up today with a realistic starting point." : "How are you feeling right now?"}
          headingTestId="text-daily-title"
        />

        <WorkspaceMoodPicker
          colourState={(userMode?.colourState ?? colourState) as UserModeColourState}
          onColourChange={handleColourChange}
          isSaving={upsertUserMode.isPending}
        />

        <div className="grid gap-3 md:grid-cols-2">
          <BasicLaneNextStep lane="daily" isComplete={isSurfaceComplete("daily")} />
          <BasicAITimeSaver lane="daily" />
        </div>

        <BasicLaneStepOrder lane="daily" />

        <HabitCanvasSurface
          title="Today Canvas"
          description="Arrange energy, must-do work, can-wait tasks, time shape, and one small win into a visible plan."
          testId="today-canvas"
          focusGroupTestId="habit-focus-group-today"
          aside={
            <>
              <HabitCanvasObjectChip tone="today">Energy: {colourState}</HabitCanvasObjectChip>
              <HabitCanvasObjectChip tone="neutral">Small win ready</HabitCanvasObjectChip>
            </>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <HabitCanvasSection
              stepLabel="Step 1"
              title="Must Do Today"
              description="Pick up to 3 tasks that matter most."
              meta={<HabitCanvasObjectChip tone="today">{tierA.length}/3</HabitCanvasObjectChip>}
            >
            <div className="space-y-3" data-testid="tier-a-tasks">
              {tierA.map(task => (
                <TaskFeelingRelaxationRow
                  key={task.id}
                  colour={getTaskFeelingColour(task.id)}
                  testId={`task-feeling-row-tier-a-${task.id}`}
                >
                  <div className="flex items-start gap-3 group">
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={(c) => toggleTierTask("A", task.id, !!c)}
                      className="mt-1"
                      data-testid={`checkbox-tier-a-${task.id}`}
                    />
                    <Input
                      value={task.text}
                      onChange={(e) => updateTierTaskText("A", task.id, e.target.value)}
                      onBlur={() => save({ tierA })}
                      placeholder="One must-do..."
                      className={`flex-1 border-transparent focus-visible:border-input bg-transparent ${task.completed ? "line-through text-muted-foreground" : ""}`}
                      data-testid={`input-tier-a-${task.id}`}
                    />
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeTierTask("A", task.id)} data-testid={`button-remove-tier-a-${task.id}`}>
                      <X className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pl-8">
                    <span className="text-xs font-medium text-muted-foreground">Task feeling</span>
                    <TaskFeelingColorControl
                      value={getTaskFeelingColour(task.id)}
                      onChange={(colour) => setTaskFeelingColour(task.id, colour)}
                      testIdPrefix={`button-task-feeling-tier-a-${task.id}`}
                    />
                  </div>
                </TaskFeelingRelaxationRow>
              ))}
              {tierA.length < 3 && (
                <Button variant="outline" size="sm" onClick={() => addTierTask("A")} data-testid="button-add-daily-must-do">
                  <Plus className="w-4 h-4 mr-2" /> Add must-do
                </Button>
              )}
            </div>
            </HabitCanvasSection>

            <HabitCanvasSection
              stepLabel="Step 2"
              title="Can Wait"
              description="Put extra tasks here so they are out of your head."
            >
            <div className="space-y-3" data-testid="tier-b-tasks">
              {tierB.map(task => (
                <TaskFeelingRelaxationRow
                  key={task.id}
                  colour={getTaskFeelingColour(task.id)}
                  testId={`task-feeling-row-tier-b-${task.id}`}
                >
                  <div className="flex items-start gap-3 group">
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={(c) => toggleTierTask("B", task.id, !!c)}
                      className="mt-1"
                      data-testid={`checkbox-tier-b-${task.id}`}
                    />
                    <Input
                      value={task.text}
                      onChange={(e) => updateTierTaskText("B", task.id, e.target.value)}
                      onBlur={() => save({ tierB })}
                      placeholder="One later task..."
                      className={`flex-1 border-transparent focus-visible:border-input bg-transparent ${task.completed ? "line-through text-muted-foreground" : ""}`}
                      data-testid={`input-tier-b-${task.id}`}
                    />
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeTierTask("B", task.id)} data-testid={`button-remove-tier-b-${task.id}`}>
                      <X className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pl-8">
                    <span className="text-xs font-medium text-muted-foreground">Task feeling</span>
                    <TaskFeelingColorControl
                      value={getTaskFeelingColour(task.id)}
                      onChange={(colour) => setTaskFeelingColour(task.id, colour)}
                      testIdPrefix={`button-task-feeling-tier-b-${task.id}`}
                    />
                  </div>
                </TaskFeelingRelaxationRow>
              ))}
              <Button variant="outline" size="sm" onClick={() => addTierTask("B")} data-testid="button-add-tier-b">
                <Plus className="w-4 h-4 mr-2" /> Add later task
              </Button>
            </div>
            </HabitCanvasSection>
          </div>

          <HabitCanvasSection
            stepLabel="Step 3"
            title="Time Shape"
            description="Add a time only if it helps."
            meta={
              <Button variant="outline" size="sm" onClick={addTimeBlock} data-testid="button-add-time-block">
                <Plus className="w-4 h-4 mr-2" /> Add time block
              </Button>
            }
          >
          <div className="space-y-3" data-testid="time-blocks-list">
            {timeBlocks.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No time blocks yet.</p>
            )}
            {timeBlocks.map(block => (
              <div key={block.id} className="flex items-center gap-3 group">
                <input
                  type="time"
                  value={block.startTime}
                  onChange={(e) => updateTimeBlockField(block.id, "startTime", e.target.value, true)}
                  className="w-28 bg-background border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  data-testid={`input-time-block-start-${block.id}`}
                />
                <Input
                  value={block.action}
                  onChange={(e) => updateTimeBlockField(block.id, "action", e.target.value)}
                  onBlur={() => save({ timeBlocks })}
                  placeholder="What happens then..."
                  className="flex-1 bg-transparent border-transparent focus-visible:border-input"
                  data-testid={`input-time-block-action-${block.id}`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeTimeBlock(block.id)}
                  data-testid={`button-remove-time-block-${block.id}`}
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
          </HabitCanvasSection>

          <HabitCanvasSection
            stepLabel="Step 4"
            title="Small Win"
            description="Write one small thing that went right."
          >
          <Textarea
            value={microWin}
            onChange={(e) => setMicroWin(e.target.value)}
            onBlur={() => save({ microWin })}
            placeholder="I did one small thing..."
            className="resize-none h-24"
            data-testid="textarea-micro-win"
          />
          </HabitCanvasSection>
        </HabitCanvasSurface>

        <BasicMoreSection
          title="Review AI drafts"
          description="AI can make a draft. You choose what to save."
          testId="more-ai-drafts-daily"
        >
          <AIDraftCanvasBlock count={aiDrafts?.length ?? 0} label="Daily draft review" />
          <AIDraftReviewPanel
            title={dailyAIDraftReview.title}
            emptyTitle={dailyAIDraftReview.emptyTitle}
            emptyDescription={dailyAIDraftReview.emptyDescription}
            drafts={aiDrafts}
            isLoading={isAIDraftsLoading}
            errorMessage={aiDraftsError instanceof Error ? aiDraftsError.message : null}
            actionErrorMessage={draftActionError}
            modeBadgeLabel="Review first"
            footerNote="Daily drafts can be approved, rejected, or applied to today. AI does not save changes by itself."
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
                      {applyingDraftId === draft.id ? "Saving..." : "Save to today"}
                    </Button>
                  </div>
                );
              }

              return null;
            }}
            data-testid="ai-draft-placeholder-daily"
          />
        </BasicMoreSection>

        <BasicMoreSection
          title="More help"
          description="Use these when the day needs extra support."
          testId="more-help-daily"
        >
          {!isSurfaceComplete("daily") && <SurfaceOnboardingCard surface="daily" />}

          {isFirstRunDaily ? (
            <section
              className="rounded-2xl border bg-card px-5 py-4 shadow-sm space-y-4"
              data-testid="daily-first-run-setup"
            >
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  First Daily Setup
                </p>
                <h2 className="text-lg font-semibold">Start today</h2>
                <p className="text-sm text-muted-foreground">
                  Today will save when you pick a color or add a task.
                </p>
              </div>
            </section>
          ) : null}

          {remainingSurfaces.length > 0 ? (
            <OnboardingChecklist
              surfaces={remainingSurfaces}
              completedCount={surfaces.filter((surface) => surface.isComplete).length}
              totalCount={surfaces.length}
            />
          ) : null}

          <SkipProtocol
            frameState={{
              colourState,
              tierA,
              tierB,
              timeBlocks,
              microWin: microWin || null,
              skipProtocolUsed: frame?.skipProtocolUsed ?? false,
              skipProtocolChoice: (frame?.skipProtocolChoice as "micro-win" | "intentional-recovery" | null) ?? null,
            }}
            onSaveSkip={saveSkipProtocol}
            isPending={upsert.isPending}
          />

          <SupportRail direction="row">
            <span className="text-xs text-muted-foreground">Must Do Today · Can Do Later · Time Plan · Small Win</span>
          </SupportRail>
        </BasicMoreSection>

        <BasicMoreSection
          title="Connected tools"
          description="Calendar, phone capture, and linked system items live here."
          testId="more-connected-tools-daily"
        >
          <BabyHeroConsequencesCard
            title="Linked items due soon"
            description="Linked assignments show here only when they affect today."
            items={babyHeroRollups?.daily ?? []}
            emptyMessage="No linked items are due soon."
            data-testid="baby-hero-consequences-daily"
          />

          <CalendarLinkStatusCard
            state={dailyCalendarPlaceholder.state}
            title={dailyCalendarPlaceholder.title}
            description={dailyCalendarPlaceholder.description}
            chips={dailyCalendarPlaceholder.chips}
            note={dailyCalendarPlaceholder.note}
            data-testid="calendar-placeholder-daily"
          />

          <DailyMobileQuickCaptureCard
            inputValue={mobileCaptureInput}
            onInputChange={setMobileCaptureInput}
            onCapture={(channel) => void handleMobileQuickCapture(channel)}
            captureState={mobileCaptureState}
            errorMessage={mobileCaptureError}
            lastCapture={lastMobileCapture}
          />
        </BasicMoreSection>

      </div>
    </Layout>
  );
}
