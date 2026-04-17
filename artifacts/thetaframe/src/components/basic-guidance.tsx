import { Link } from "wouter";
import { CheckCircle2, ChevronDown, Lightbulb, Route } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { OnboardingSurfaceProgress } from "@/hooks/use-onboarding";
import {
  BASIC_AI_TIME_SAVERS,
  BASIC_LANE_ACTION_STEPS,
  BASIC_LANE_ORDER,
  BASIC_LANE_STEPS,
  type BasicLane,
} from "@/lib/basic-onboarding";

type SurfaceState = Pick<OnboardingSurfaceProgress, "surface" | "isComplete">;

function getSurfaceCompletion(surfaces: readonly SurfaceState[], lane: BasicLane): boolean {
  return surfaces.find((surface) => surface.surface === lane)?.isComplete ?? false;
}

export function BasicStartGuide({
  surfaces,
  onNavigate,
  focusedLane,
}: {
  surfaces: readonly SurfaceState[];
  onNavigate?: () => void;
  focusedLane?: BasicLane | null;
}) {
  const [selectedLane, setSelectedLane] = useState<BasicLane>(focusedLane ?? "daily");

  useEffect(() => {
    setSelectedLane(focusedLane ?? "daily");
  }, [focusedLane]);

  const selectedStep = BASIC_LANE_STEPS[selectedLane];
  const selectedIsComplete = getSurfaceCompletion(surfaces, selectedLane);
  const selectedActionSteps = BASIC_LANE_ACTION_STEPS[selectedLane];
  const selectedIndex = useMemo(
    () => BASIC_LANE_ORDER.findIndex((lane) => lane === selectedLane) + 1,
    [selectedLane],
  );

  return (
    <section className="space-y-4" data-testid="basic-start-guide">
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Start Here
        </p>
        <h2 className="text-lg font-semibold sm:text-xl">Use one small step at a time.</h2>
        <p className="text-sm text-muted-foreground">
          Start with Today, This Week, and Goals. You can come back here any time.
        </p>
      </div>

      <div
        className="grid gap-2 rounded-lg border bg-card/80 p-2 sm:grid-cols-3"
        role="tablist"
        aria-label="Start Here surfaces"
        data-testid="guide-surface-tabs"
      >
        {BASIC_LANE_ORDER.map((lane, index) => {
          const step = BASIC_LANE_STEPS[lane];
          const isSelected = selectedLane === lane;
          const isComplete = getSurfaceCompletion(surfaces, lane);
          return (
            <button
              key={lane}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`flex min-h-10 items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isSelected
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-background text-foreground hover:border-primary/50 hover:bg-accent"
              }`}
              onClick={() => setSelectedLane(lane)}
              data-testid={`guide-tab-${lane}`}
            >
              <span>Step {index + 1}: {step.plainLabel}</span>
              {isComplete ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : null}
            </button>
          );
        })}
      </div>

      <div
        className="rounded-lg border bg-background/90 p-3 shadow-sm sm:p-4"
        data-testid="guide-restart-current-surface"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Restart Here
            </p>
            <h3 className="text-lg font-semibold">
              Step {selectedIndex}: {selectedStep.plainLabel}
            </h3>
            <p className="text-sm font-medium">{selectedStep.headline}</p>
            <p className="text-sm text-muted-foreground">
              {selectedIsComplete ? selectedStep.resetStep : selectedStep.nextStep}
            </p>
          </div>
          <Button asChild type="button" className="shrink-0">
            <Link href={selectedStep.href} onClick={onNavigate}>
              {selectedStep.primaryAction}
            </Link>
          </Button>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {selectedActionSteps.map((step) => (
            <div key={step.stepNumber} className="flex gap-2.5 rounded-md border bg-card/70 p-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {step.stepNumber}
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold">{step.title}</p>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        {BASIC_LANE_ORDER.map((lane, index) => {
          const step = BASIC_LANE_STEPS[lane];
          const isComplete = getSurfaceCompletion(surfaces, lane);
          return (
            <div
              key={lane}
              className="rounded-lg border bg-card/80 px-3 py-3 shadow-sm"
              data-testid={`guide-step-${lane}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">Step {index + 1}: {step.plainLabel}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                  {isComplete ? <CheckCircle2 className="h-3 w-3" /> : <Route className="h-3 w-3" />}
                  {isComplete ? "Done once" : "Start"}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium">{step.headline}</p>
              <p className="mt-1 text-sm text-muted-foreground">{isComplete ? step.resetStep : step.nextStep}</p>
              <Button asChild type="button" size="sm" className="mt-3">
                <Link href={step.href} onClick={onNavigate}>
                  {step.primaryAction}
                </Link>
              </Button>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3" data-testid="basic-ai-review-note">
        <div className="flex items-start gap-3">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            AI can make a draft from messy notes. You choose what to save.
          </p>
        </div>
      </div>
    </section>
  );
}

export function BasicLaneNextStep({ lane, isComplete }: { lane: BasicLane; isComplete?: boolean }) {
  const step = BASIC_LANE_STEPS[lane];

  return (
    <section
      className="rounded-lg border bg-card/90 px-4 py-3 shadow-sm"
      data-testid={`next-step-${lane}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          What To Do Next
        </span>
        <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
          {isComplete ? "Saved before" : "Start small"}
        </span>
      </div>
      <p className="mt-2 text-sm font-semibold">{step.headline}</p>
      <p className="mt-1 text-sm text-muted-foreground">{isComplete ? step.resetStep : step.nextStep}</p>
    </section>
  );
}

export function BasicLaneStepOrder({ lane }: { lane: BasicLane }) {
  const steps = BASIC_LANE_ACTION_STEPS[lane];

  return (
    <section
      className="rounded-lg border bg-card/95 p-4 shadow-sm"
      data-testid={`step-order-${lane}`}
    >
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Order Of Steps
        </p>
        <h2 className="text-lg font-semibold">Do these in order.</h2>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {steps.map((step) => (
          <div key={step.stepNumber} className="flex gap-3 rounded-lg border bg-background/80 p-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {step.stepNumber}
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold">{step.title}</p>
              <p className="text-sm text-muted-foreground">{step.description}</p>
              <p className="text-xs font-medium text-muted-foreground">Look for: {step.actionLabel}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function BasicAITimeSaver({ lane }: { lane: BasicLane }) {
  const copy = BASIC_AI_TIME_SAVERS[lane];

  return (
    <section
      className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 shadow-sm"
      data-testid={`ai-time-saver-${lane}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          AI Draft Help
        </span>
        <span className="rounded-full bg-background/80 px-2 py-1 text-[11px] font-medium text-muted-foreground">
          Review first
        </span>
      </div>
      <p className="mt-2 text-sm font-semibold">{copy.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
      <p className="mt-2 text-xs text-muted-foreground">{copy.reviewPolicy}</p>
    </section>
  );
}

export function BasicMoreSection({
  title,
  description,
  children,
  testId,
  defaultOpen = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  testId?: string;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="group rounded-lg border bg-card/90 p-4 shadow-sm"
      data-testid={testId}
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
        <span className="space-y-1">
          <span className="block text-sm font-semibold">{title}</span>
          {description ? (
            <span className="block text-sm text-muted-foreground">{description}</span>
          ) : null}
        </span>
        <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-4 space-y-4">
        {children}
      </div>
    </details>
  );
}
