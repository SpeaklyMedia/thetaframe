import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, RefreshCw, Sparkles, Wand2, XCircle } from "lucide-react";
import {
  ApiError,
  type AIDraft,
  type CreateBasicBrainDumpDraftsResponse,
  getGetDailyFrameQueryKey,
  getGetVisionFrameQueryKey,
  getGetWeeklyFrameQueryKey,
  getListAiDraftsQueryKey,
  useApplyAiDraft,
  useCreateBasicBrainDumpDrafts,
  useUpdateAiDraftReviewState,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  dailyAIDraftListParams,
  getAIDraftPayloadSummary,
  getAIDraftReviewStateLabel,
  visionAIDraftListParams,
  weeklyAIDraftListParams,
} from "@/lib/ai-draft-review";
import { cn } from "@/lib/utils";

type BrainDumpLane = "daily" | "weekly" | "vision";

type BrainDumpBatch = {
  batchId: string;
  drafts: AIDraft[];
  createdAt: string;
};

const laneCopy: Record<BrainDumpLane, { label: string; href: string; testId: string }> = {
  daily: { label: "Today", href: "/daily", testId: "dashboard-brain-dump-draft-daily" },
  weekly: { label: "This Week", href: "/weekly", testId: "dashboard-brain-dump-draft-weekly" },
  vision: { label: "Goals", href: "/vision", testId: "dashboard-brain-dump-draft-vision" },
};

const listQueryKeys = [
  getListAiDraftsQueryKey(dailyAIDraftListParams),
  getListAiDraftsQueryKey(weeklyAIDraftListParams),
  getListAiDraftsQueryKey(visionAIDraftListParams),
];

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) return "Add a little more detail before asking AI to sort it.";
    if (error.status === 403) return "This setup lane is only available when Today, This Week, and Goals are available.";
    if (error.status === 503) return "AI setup is not available right now. Your text stayed here.";
    if (error.status === 502) return "AI could not return a usable draft. Try a smaller or clearer brain dump.";
    return `AI setup failed (HTTP ${error.status}). Your text stayed here.`;
  }

  if (error instanceof Error) return error.message;
  return "AI setup failed. Your text stayed here.";
}

function metadataBatchId(draft: AIDraft): string | null {
  const value = draft.metadata.brainDumpBatchId;
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function latestBrainDumpBatch(drafts: AIDraft[]): BrainDumpBatch | null {
  const groups = new Map<string, AIDraft[]>();
  for (const draft of drafts) {
    const batchId = metadataBatchId(draft);
    if (!batchId) continue;
    groups.set(batchId, [...(groups.get(batchId) ?? []), draft]);
  }

  let latest: BrainDumpBatch | null = null;
  for (const [batchId, batchDrafts] of groups) {
    const createdAt = batchDrafts
      .map((draft) => draft.createdAt)
      .sort()
      .at(-1);
    if (!createdAt) continue;
    if (!latest || createdAt > latest.createdAt) {
      latest = { batchId, drafts: batchDrafts, createdAt };
    }
  }

  return latest;
}

function draftLane(draft: AIDraft): BrainDumpLane | null {
  if (draft.draftKind === "daily_frame_draft") return "daily";
  if (draft.draftKind === "weekly_frame_draft") return "weekly";
  if (draft.draftKind === "vision_alignment_draft") return "vision";
  return null;
}

function DraftStateIcon({ draft }: { draft: AIDraft }) {
  if (draft.reviewState === "applied") return <CheckCircle2 className="h-4 w-4 text-sky-600" />;
  if (draft.reviewState === "approved") return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (draft.reviewState === "rejected") return <XCircle className="h-4 w-4 text-destructive" />;
  return <Circle className="h-4 w-4 text-muted-foreground" />;
}

export function DashboardBrainDumpSetup({
  dailyDrafts,
  weeklyDrafts,
  visionDrafts,
  date,
  weekStart,
  canUse,
}: {
  dailyDrafts?: AIDraft[];
  weeklyDrafts?: AIDraft[];
  visionDrafts?: AIDraft[];
  date: string;
  weekStart: string;
  canUse: boolean;
}) {
  const queryClient = useQueryClient();
  const createBrainDump = useCreateBasicBrainDumpDrafts();
  const updateReviewState = useUpdateAiDraftReviewState();
  const applyDraft = useApplyAiDraft();
  const [rawText, setRawText] = useState("");
  const [refinementInstruction, setRefinementInstruction] = useState("");
  const [localBatch, setLocalBatch] = useState<BrainDumpBatch | null>(null);
  const [busyDraftId, setBusyDraftId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const queryBatch = useMemo(
    () => latestBrainDumpBatch([...(dailyDrafts ?? []), ...(weeklyDrafts ?? []), ...(visionDrafts ?? [])]),
    [dailyDrafts, weeklyDrafts, visionDrafts],
  );
  const activeBatch = localBatch ?? queryBatch;
  const activeDrafts = activeBatch?.drafts ?? [];
  const draftsByLane = useMemo(() => {
    const result = new Map<BrainDumpLane, AIDraft>();
    for (const draft of activeDrafts) {
      const lane = draftLane(draft);
      if (lane) result.set(lane, draft);
    }
    return result;
  }, [activeDrafts]);
  const rawTextReady = rawText.trim().length >= 20;
  const isGenerating = createBrainDump.isPending;
  const isBusy = isGenerating || updateReviewState.isPending || applyDraft.isPending;

  const invalidateDraftQueries = async () => {
    await Promise.all(listQueryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  };

  const updateLocalDraft = (updatedDraft: AIDraft) => {
    setLocalBatch((current) => {
      if (!current) return current;
      return {
        ...current,
        drafts: current.drafts.map((draft) => (draft.id === updatedDraft.id ? updatedDraft : draft)),
      };
    });
  };

  const handleGeneratedBatch = async (batch: CreateBasicBrainDumpDraftsResponse) => {
    setLocalBatch(batch);
    setRefinementInstruction("");
    await invalidateDraftQueries();
  };

  const generate = async () => {
    setErrorMessage(null);
    try {
      const batch = await createBrainDump.mutateAsync({
        data: {
          rawText,
          date,
          weekStart,
        },
      });
      await handleGeneratedBatch(batch);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const refine = async () => {
    if (!activeBatch) return;
    setErrorMessage(null);
    try {
      const batch = await createBrainDump.mutateAsync({
        data: {
          rawText,
          date,
          weekStart,
          refinementInstruction,
          refineFromDraftIds: activeDrafts.map((draft) => draft.id),
        },
      });
      await handleGeneratedBatch(batch);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const review = async (draft: AIDraft, reviewState: "approved" | "rejected") => {
    setBusyDraftId(draft.id);
    setErrorMessage(null);
    try {
      const updatedDraft = await updateReviewState.mutateAsync({
        id: draft.id,
        data: { reviewState },
      });
      updateLocalDraft(updatedDraft);
      await invalidateDraftQueries();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusyDraftId(null);
    }
  };

  const apply = async (draft: AIDraft) => {
    const lane = draftLane(draft);
    if (!lane || draft.reviewState !== "approved") return;
    setBusyDraftId(draft.id);
    setErrorMessage(null);
    try {
      const response = await applyDraft.mutateAsync({
        id: draft.id,
        data: lane === "daily" ? { date } : lane === "weekly" ? { weekStart } : {},
      });
      updateLocalDraft(response.draft);
      await invalidateDraftQueries();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetDailyFrameQueryKey(date) }),
        queryClient.invalidateQueries({ queryKey: getGetWeeklyFrameQueryKey(weekStart) }),
        queryClient.invalidateQueries({ queryKey: getGetVisionFrameQueryKey() }),
      ]);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusyDraftId(null);
    }
  };

  return (
    <section
      className="rounded-lg border border-violet-300/50 bg-violet-50/60 p-4 shadow-sm dark:border-violet-500/40 dark:bg-violet-950/20 md:p-5"
      data-testid="dashboard-brain-dump-setup"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-800 dark:text-violet-200">
            <Sparkles className="h-4 w-4" />
            Brain Dump Setup
          </div>
          <h2 className="text-xl font-semibold">Drop the messy version here.</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            AI makes drafts for Today, This Week, and Goals. You choose what to save.
          </p>
        </div>
        <span className="inline-flex rounded-md border border-violet-300/60 bg-background/80 px-2.5 py-1 text-xs font-medium text-violet-900 dark:text-violet-100">
          Review first
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <Textarea
          value={rawText}
          onChange={(event) => setRawText(event.target.value)}
          placeholder="Paste the unorganized version: tasks, worries, ideas, appointments, goals, and anything taking up space."
          className="min-h-32 resize-y bg-background/90"
          data-testid="textarea-dashboard-brain-dump"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={cn("text-xs", rawTextReady ? "text-muted-foreground" : "text-destructive")}>
            {rawText.trim().length}/20 characters needed
          </p>
          <Button
            type="button"
            onClick={() => void generate()}
            disabled={!canUse || !rawTextReady || isBusy}
            data-testid="button-generate-brain-dump"
          >
            <Wand2 className="mr-2 h-4 w-4" />
            {isGenerating ? "Drafting..." : "Make setup drafts"}
          </Button>
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" data-testid="dashboard-brain-dump-error">
          {errorMessage}
        </div>
      ) : null}

      {!canUse ? (
        <div className="mt-4 rounded-lg border bg-background/70 px-3 py-2 text-sm text-muted-foreground">
          This setup lane needs Today, This Week, and Goals access.
        </div>
      ) : null}

      {activeBatch ? (
        <div className="mt-5 space-y-4" data-testid="dashboard-brain-dump-batch">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Latest setup draft batch</p>
              <p className="text-xs text-muted-foreground">Batch {activeBatch.batchId.slice(0, 8)} · {new Date(activeBatch.createdAt).toLocaleString()}</p>
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
              <Textarea
                value={refinementInstruction}
                onChange={(event) => setRefinementInstruction(event.target.value)}
                placeholder="Optional: ask AI to refine this batch..."
                className="min-h-10 max-h-24 min-w-52 flex-1 resize-y bg-background/90 text-sm"
                data-testid="textarea-dashboard-brain-dump-refine"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => void refine()}
                disabled={!rawTextReady || !refinementInstruction.trim() || isBusy}
                data-testid="button-refine-brain-dump"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refine
              </Button>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {(["daily", "weekly", "vision"] as const).map((lane) => {
              const draft = draftsByLane.get(lane);
              const copy = laneCopy[lane];
              return (
                <article
                  key={lane}
                  className="rounded-lg border bg-background/85 p-4 shadow-sm"
                  data-testid={copy.testId}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-semibold">{copy.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {draft ? getAIDraftReviewStateLabel(draft) : "No draft yet"}
                      </p>
                    </div>
                    {draft ? <DraftStateIcon draft={draft} /> : null}
                  </div>
                  <p className="mt-3 min-h-12 text-sm text-muted-foreground">
                    {draft ? getAIDraftPayloadSummary(draft) : "This lane will appear after AI creates the setup batch."}
                  </p>
                  {draft?.metadata.summary && typeof draft.metadata.summary === "string" ? (
                    <p className="mt-2 text-xs text-muted-foreground">{draft.metadata.summary}</p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {draft ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void review(draft, "approved")}
                          disabled={isBusy || draft.reviewState === "approved" || draft.reviewState === "applied"}
                          data-testid={`button-dashboard-approve-${lane}`}
                        >
                          {busyDraftId === draft.id && updateReviewState.isPending ? "Saving..." : "Approve"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void review(draft, "rejected")}
                          disabled={isBusy || draft.reviewState === "rejected" || draft.reviewState === "applied"}
                          data-testid={`button-dashboard-reject-${lane}`}
                        >
                          Reject
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void apply(draft)}
                          disabled={isBusy || draft.reviewState !== "approved"}
                          data-testid={`button-dashboard-apply-${lane}`}
                        >
                          {busyDraftId === draft.id && applyDraft.isPending ? "Saving..." : "Save"}
                        </Button>
                      </>
                    ) : null}
                    <Button asChild type="button" variant="ghost" size="sm">
                      <Link href={copy.href}>Open {copy.label}</Link>
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
