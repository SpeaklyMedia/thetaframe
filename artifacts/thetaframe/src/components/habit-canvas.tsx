import { Link } from "wouter";
import type { ReactNode } from "react";
import { ArrowRight, CheckCircle2, Circle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type HabitCanvasTone = "today" | "week" | "goals" | "ai" | "neutral";

export type HabitCanvasMapNode = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  actionLabel: string;
  status?: string;
  testId?: string;
  focusTestId?: string;
};

const toneClasses: Record<HabitCanvasTone, string> = {
  today: "border-emerald-300/60 bg-emerald-50/80 text-emerald-950 dark:border-emerald-500/40 dark:bg-emerald-950/20 dark:text-emerald-100",
  week: "border-sky-300/60 bg-sky-50/80 text-sky-950 dark:border-sky-500/40 dark:bg-sky-950/20 dark:text-sky-100",
  goals: "border-amber-300/70 bg-amber-50/80 text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/20 dark:text-amber-100",
  ai: "border-violet-300/60 bg-violet-50/80 text-violet-950 dark:border-violet-500/40 dark:bg-violet-950/20 dark:text-violet-100",
  neutral: "border-border bg-background text-foreground",
};

export function HabitCanvasObjectChip({
  children,
  tone = "neutral",
  testId,
}: {
  children: ReactNode;
  tone?: HabitCanvasTone;
  testId?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-md border px-2.5 py-1 text-xs font-medium",
        toneClasses[tone],
      )}
      data-testid={testId}
    >
      {children}
    </span>
  );
}

export function HabitCanvasSection({
  stepLabel,
  title,
  description,
  meta,
  testId,
  children,
  className,
}: {
  stepLabel?: string;
  title: string;
  description?: string;
  meta?: ReactNode;
  testId?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "habit-focus-card habit-focus-card-section space-y-4 rounded-lg border border-border/70 bg-background/75 p-4 shadow-sm",
        className,
      )}
      data-testid={testId}
      data-habit-focus-card=""
      data-habit-focus-kind="section"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          {stepLabel ? (
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{stepLabel}</p>
          ) : null}
          <h2 className="text-lg font-semibold">{title}</h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {meta ? <div className="shrink-0">{meta}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function HabitCanvasSurface({
  title,
  description,
  testId,
  children,
  aside,
  focusGroupTestId,
}: {
  title: string;
  description: string;
  testId: string;
  children: ReactNode;
  aside?: ReactNode;
  focusGroupTestId?: string;
}) {
  return (
    <section
      className="space-y-5 rounded-lg border border-border/70 bg-muted/20 p-4 shadow-sm md:p-5"
      data-testid={testId}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">LIFEos Habit Canvas</p>
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
        {aside ? <div className="flex flex-wrap gap-2">{aside}</div> : null}
      </div>
      <div
        className="habit-focus-group space-y-5"
        data-testid={focusGroupTestId}
        data-habit-focus-group=""
      >
        {children}
      </div>
    </section>
  );
}

export function HabitCanvasMap({
  nodes,
  colourLabel,
  draftCount,
}: {
  nodes: HabitCanvasMapNode[];
  colourLabel?: string;
  draftCount?: number;
}) {
  return (
    <div className="space-y-4" data-testid="habit-canvas-map">
      <div className="flex flex-wrap gap-2">
        <HabitCanvasObjectChip tone="today">Energy: {colourLabel ?? "not set"}</HabitCanvasObjectChip>
        <HabitCanvasObjectChip tone="ai">
          AI drafts: {draftCount && draftCount > 0 ? `${draftCount} to review` : "review first"}
        </HabitCanvasObjectChip>
      </div>

      <div
        className="habit-focus-group grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)]"
        data-testid="habit-focus-group-dashboard"
        data-habit-focus-group=""
      >
        {nodes.map((node, index) => (
          <div key={node.id} className="contents">
            <Link href={node.href} data-testid={node.testId} className="group block min-w-0">
              <div
                className="habit-focus-card habit-focus-card-map h-full rounded-lg border border-border/70 bg-background/85 p-4 shadow-sm group-hover:border-primary/50 group-hover:bg-accent/40 group-focus-visible:border-primary/60 group-focus-visible:bg-accent/40"
                data-testid={node.focusTestId}
                data-habit-focus-card=""
                data-habit-focus-kind="map"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                    {index + 1}
                  </div>
                  <div className="min-w-0 space-y-2">
                    <div>
                      <p className="text-sm font-semibold">{node.title}</p>
                      <p className="text-sm text-muted-foreground">{node.subtitle}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {node.status ? <HabitCanvasObjectChip>{node.status}</HabitCanvasObjectChip> : null}
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                        {node.actionLabel}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
            {index < nodes.length - 1 ? (
              <div className="hidden items-center justify-center text-muted-foreground md:flex" aria-hidden="true">
                <ArrowRight className="h-5 w-5" />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AIDraftCanvasBlock({
  count = 0,
  href,
  label = "Review AI drafts",
  testId = "ai-draft-canvas-block",
}: {
  count?: number;
  href?: string;
  label?: string;
  testId?: string;
}) {
  const hasDrafts = count > 0;

  return (
    <div
      className="habit-focus-card habit-focus-card-section rounded-lg border border-violet-300/50 bg-violet-50/70 p-4 text-violet-950 dark:border-violet-500/40 dark:bg-violet-950/20 dark:text-violet-100"
      data-testid={testId}
      data-habit-focus-card=""
      data-habit-focus-kind="ai"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0" />
            <p className="text-sm font-semibold">{label}</p>
          </div>
          <p className="text-sm opacity-85">
            AI drafts stay review-first and lane-scoped. You choose what to save.
          </p>
          <div className="flex flex-wrap gap-2">
            <HabitCanvasObjectChip tone="ai">{hasDrafts ? `${count} waiting` : "No waiting drafts"}</HabitCanvasObjectChip>
            <HabitCanvasObjectChip tone="neutral">
              {hasDrafts ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <Circle className="mr-1 h-3.5 w-3.5" />}
              User applies changes
            </HabitCanvasObjectChip>
          </div>
        </div>
        {href ? (
          <Button asChild type="button" size="sm" variant="outline">
            <Link href={href}>Open review</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
