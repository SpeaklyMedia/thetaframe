import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type MobileIntegrationStatusMode =
  | "deep_link"
  | "quick_capture"
  | "notification"
  | "shortcut"
  | "widget";

type MobileIntegrationStatusCardProps = {
  mode: MobileIntegrationStatusMode;
  title: string;
  description: string;
  chips?: readonly string[];
  note?: string;
  statusLabel?: string;
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
};

const MODE_LABELS: Record<MobileIntegrationStatusMode, string> = {
  deep_link: "Deep-link placeholder",
  quick_capture: "Quick-capture placeholder",
  notification: "Notification placeholder",
  shortcut: "Shortcut placeholder",
  widget: "Widget placeholder",
};

const MODE_BADGE_CLASSES: Record<MobileIntegrationStatusMode, string> = {
  deep_link: "bg-primary/10 text-primary",
  quick_capture: "bg-secondary text-secondary-foreground",
  notification: "bg-muted text-muted-foreground",
  shortcut: "bg-accent/60 text-accent-foreground",
  widget: "bg-accent/60 text-accent-foreground",
};

export function MobileIntegrationStatusCard({
  mode,
  title,
  description,
  chips = [],
  note = "Mobile entry points are not active here yet. This card only reserves the future deep-link, quick-capture, and notification surface.",
  statusLabel,
  children,
  className,
  "data-testid": testId,
}: MobileIntegrationStatusCardProps) {
  return (
    <section
      className={cn("rounded-2xl border bg-card p-5 shadow-sm space-y-3", className)}
      data-testid={testId ?? "mobile-integration-status-card"}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Mobile
        </span>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium",
            MODE_BADGE_CLASSES[mode],
          )}
        >
          {statusLabel ?? MODE_LABELS[mode]}
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

      {children}
    </section>
  );
}
