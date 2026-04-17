import { cn } from "@/lib/utils";

export type CalendarLinkStatusState = "import" | "export" | "linked" | "conflicted";

type CalendarLinkStatusCardProps = {
  state: CalendarLinkStatusState;
  title: string;
  description: string;
  chips?: readonly string[];
  note?: string;
  className?: string;
  "data-testid"?: string;
};

const STATE_LABELS: Record<CalendarLinkStatusState, string> = {
  import: "Import placeholder",
  export: "Export placeholder",
  linked: "Linked placeholder",
  conflicted: "Conflict placeholder",
};

const STATE_BADGE_CLASSES: Record<CalendarLinkStatusState, string> = {
  import: "bg-secondary text-secondary-foreground",
  export: "bg-primary/10 text-primary",
  linked: "bg-muted text-muted-foreground",
  conflicted: "bg-destructive/10 text-destructive",
};

export function CalendarLinkStatusCard({
  state,
  title,
  description,
  chips = [],
  note = "Google Calendar is not active here yet. This card only reserves the future linked-state surface.",
  className,
  "data-testid": testId,
}: CalendarLinkStatusCardProps) {
  return (
    <section
      className={cn("rounded-2xl border bg-card p-5 shadow-sm space-y-3", className)}
      data-testid={testId ?? "calendar-link-status-card"}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Calendar
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
