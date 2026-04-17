import type { ReactNode } from "react";
import type { AIDraft } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  getAIDraftApprovalBadgeCopy,
  getAIDraftCommitPolicyLabel,
  getAIDraftConfidenceModeLabel,
  getAIDraftKindLabel,
  getAIDraftPayloadSummary,
  getAIDraftReviewStateLabel,
  getAIDraftSourceRefChips,
  getAIDraftTargetSurfaceLabel,
} from "@/lib/ai-draft-review";

type AIDraftReviewPanelProps = {
  title: string;
  emptyTitle: string;
  emptyDescription: string;
  drafts?: AIDraft[];
  isLoading?: boolean;
  errorMessage?: string | null;
  actionErrorMessage?: string | null;
  modeBadgeLabel?: string;
  footerNote?: string;
  renderDraftActions?: (draft: AIDraft) => ReactNode;
  className?: string;
  "data-testid"?: string;
};

const STATE_BADGE_CLASSES: Record<AIDraft["reviewState"], string> = {
  draft: "bg-secondary text-secondary-foreground",
  needs_review: "bg-muted text-muted-foreground",
  approval_gated: "bg-primary/10 text-primary",
  approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  applied: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  rejected: "bg-destructive/10 text-destructive",
};

function DraftStateBadge({ reviewState }: { reviewState: AIDraft["reviewState"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium",
        STATE_BADGE_CLASSES[reviewState],
      )}
    >
      {getAIDraftReviewStateLabel({ reviewState } as AIDraft)}
    </span>
  );
}

export function AIDraftReviewPanel({
  title,
  emptyTitle,
  emptyDescription,
  drafts = [],
  isLoading = false,
  errorMessage,
  actionErrorMessage,
  modeBadgeLabel = "Read only",
  footerNote = "Stored drafts are visible here for review only. Apply and commit actions are not enabled in this slice.",
  renderDraftActions,
  className,
  "data-testid": testId,
}: AIDraftReviewPanelProps) {
  return (
    <section
      className={cn("rounded-2xl border bg-card p-5 shadow-sm space-y-4", className)}
      data-testid={testId ?? "ai-draft-review-panel"}
    >
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            AI Draft Review
          </span>
          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
            {modeBadgeLabel}
          </span>
        </div>
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : errorMessage ? (
        <div className="rounded-xl border bg-muted/20 p-4 space-y-1" data-testid="ai-draft-review-error">
          <p className="text-sm font-medium">Couldn't load stored drafts</p>
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
        </div>
      ) : drafts.length === 0 ? (
        <div className="rounded-xl border bg-muted/20 p-4 space-y-2" data-testid="ai-draft-review-empty">
          {actionErrorMessage ? (
            <p className="text-xs text-destructive" data-testid="ai-draft-review-action-error">
              {actionErrorMessage}
            </p>
          ) : null}
          <p className="text-sm font-medium">{emptyTitle}</p>
          <p className="text-sm text-muted-foreground">{emptyDescription}</p>
          <p className="text-xs text-muted-foreground">{footerNote}</p>
        </div>
      ) : (
        <div className="space-y-3" data-testid="ai-draft-review-list">
          {actionErrorMessage ? (
            <div
              className="rounded-xl border border-destructive/30 bg-destructive/5 p-3"
              data-testid="ai-draft-review-action-error"
            >
              <p className="text-sm text-destructive">{actionErrorMessage}</p>
            </div>
          ) : null}
          {drafts.map((draft) => (
            <article
              key={draft.id}
              className="rounded-xl border bg-background/40 p-4 space-y-3"
              data-testid={`ai-draft-review-item-${draft.id}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <DraftStateBadge reviewState={draft.reviewState} />
                    <span className="text-xs text-muted-foreground">{getAIDraftKindLabel(draft)}</span>
                  </div>
                  <p className="text-sm font-medium">{getAIDraftPayloadSummary(draft)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(draft.createdAt).toLocaleString()}
                  </p>
                </div>
                {renderDraftActions ? <div className="shrink-0">{renderDraftActions(draft)}</div> : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                  Target lane: {getAIDraftTargetSurfaceLabel(draft)}
                </span>
                <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                  {getAIDraftApprovalBadgeCopy(draft)}
                </span>
                <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                  Confidence: {getAIDraftConfidenceModeLabel(draft)}
                </span>
                <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                  {getAIDraftCommitPolicyLabel(draft)}
                </span>
                {getAIDraftSourceRefChips(draft).map((chip) => (
                  <span
                    key={`${draft.id}-${chip}`}
                    className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </article>
          ))}
          <p className="text-xs text-muted-foreground">{footerNote}</p>
        </div>
      )}
    </section>
  );
}
