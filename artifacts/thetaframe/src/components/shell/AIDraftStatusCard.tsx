import { cn } from "@/lib/utils";

export type AIDraftStatusState =
  | "draft"
  | "needs_review"
  | "approval_gated"
  | "approved"
  | "rejected"
  | "background_ready";

type AIDraftStatusCardProps = {
  state: AIDraftStatusState;
  title: string;
  description: string;
  chips?: readonly string[];
  note?: string;
  className?: string;
  "data-testid"?: string;
};

const STATE_LABELS: Record<AIDraftStatusState, string> = {
  draft: "Draft placeholder",
  needs_review: "Needs-review placeholder",
  approval_gated: "Approval-gated placeholder",
  approved: "Approved placeholder",
  rejected: "Rejected placeholder",
  background_ready: "Background-ready placeholder",
};

const STATE_BADGE_CLASSES: Record<AIDraftStatusState, string> = {
  draft: "bg-secondary text-secondary-foreground",
  needs_review: "bg-muted text-muted-foreground",
  approval_gated: "bg-primary/10 text-primary",
  approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  rejected: "bg-destructive/10 text-destructive",
  background_ready: "bg-accent/60 text-accent-foreground",
};

export function AIDraftStatusCard({
  state,
  title,
  description,
  chips = [],
  note = "AI drafting is not active here yet. This card only reserves the future draft, provenance, and approval surface.",
  className,
  "data-testid": testId,
}: AIDraftStatusCardProps) {
  return (
    <section
      className={cn("rounded-2xl border bg-card p-5 shadow-sm space-y-3", className)}
      data-testid={testId ?? "ai-draft-status-card"}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          AI Draft
        </span>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium",
            STATE_BADGE_CLASSES[state],
          )}
        >
          {STATE_LABELS[state]}
        </span>
      </div>

      <div className="space-y-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span
              key={chip}
              className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground"
            >
              {chip}
            </span>
          ))}
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">{note}</p>
    </section>
  );
}
