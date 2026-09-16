import { useEffect, useMemo, useState } from "react";
import type {
  DailyReflection,
  RoutineSession,
  TierTask,
  PatchDailyReflectionBody,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  HabitCanvasObjectChip,
  HabitCanvasSection,
  HabitCanvasSurface,
} from "@/components/habit-canvas";
import {
  DAILY_COMMITMENT_SLOTS,
  MORNING_STEPS,
  NIGHT_STEPS,
  ROUTINE_MODE_LABELS,
  canCompleteMorning,
  getCommitmentCompleted,
  getCommitmentValue,
  getCompletedStepKeys,
  getMorningRequiredStepKeys,
  getRoutineStatusLabel,
  toggleStepKey,
  type RoutineCompletionState,
  type RoutineMode,
  type RoutineStep,
} from "@/lib/daily-rhythm";
import { cn } from "@/lib/utils";

function RoutineStepStrip({
  steps,
  completedStepKeys,
  requiredStepKeys,
  onToggleStep,
  testId,
}: {
  steps: readonly RoutineStep[];
  completedStepKeys: readonly string[];
  requiredStepKeys?: readonly string[];
  onToggleStep: (stepKey: string) => void;
  testId: string;
}) {
  const completed = new Set(completedStepKeys);
  const required = new Set(requiredStepKeys ?? steps.map((step) => step.key));

  return (
    <div
      className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
      data-testid={testId}
    >
      {steps.map((step) => {
        const isComplete = completed.has(step.key);
        const isRequired = required.has(step.key);
        return (
          <button
            key={step.key}
            type="button"
            className={cn(
              "min-h-24 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isComplete
                ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                : "bg-background hover:border-primary/50 hover:bg-accent/40",
            )}
            aria-pressed={isComplete}
            aria-label={`${step.label}: ${isComplete ? "complete" : "not complete"}`}
            onClick={() => onToggleStep(step.key)}
            data-testid={`${testId}-step-${step.key}`}
          >
            <span className="flex items-start justify-between gap-3">
              <span className="text-2xl" aria-hidden="true">
                {step.icon}
              </span>
              <span className="rounded-full border bg-background/80 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                {isComplete ? "Done" : isRequired ? "Required" : "Optional"}
              </span>
            </span>
            <span className="mt-2 block text-sm font-semibold">
              {step.label}
            </span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              {step.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function RoutineModeSelector({
  value,
  onChange,
  disabled,
}: {
  value: RoutineMode;
  onChange: (mode: RoutineMode) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="grid gap-2 sm:grid-cols-3"
      data-testid="morning-routine-mode-selector"
    >
      {(Object.keys(ROUTINE_MODE_LABELS) as RoutineMode[]).map((mode) => {
        const option = ROUTINE_MODE_LABELS[mode];
        const active = mode === value;
        return (
          <button
            key={mode}
            type="button"
            className={cn(
              "rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background hover:border-primary/50 hover:bg-accent/40",
            )}
            onClick={() => onChange(mode)}
            disabled={disabled}
            aria-pressed={active}
            data-testid={`button-routine-mode-${mode}`}
          >
            <span className="block text-sm font-semibold">{option.label}</span>
            <span
              className={cn(
                "mt-1 block text-xs leading-5",
                active ? "text-primary-foreground/80" : "text-muted-foreground",
              )}
            >
              {option.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function MorningRhythmPanel({
  session,
  previousReflection,
  firstActionValue,
  commitments,
  onSessionSave,
  onFirstActionSave,
  onCommitmentChange,
  isSaving,
}: {
  session: RoutineSession | null;
  previousReflection: DailyReflection | null;
  firstActionValue: string;
  commitments: TierTask[];
  onSessionSave: (data: {
    mode: RoutineMode;
    completedStepKeys: string[];
    completionState: RoutineCompletionState;
  }) => void;
  onFirstActionSave: (value: string) => void;
  onCommitmentChange: (
    index: number,
    value: string,
    completed?: boolean,
    persist?: boolean,
  ) => void;
  isSaving?: boolean;
}) {
  const [firstActionDraft, setFirstActionDraft] = useState(firstActionValue);
  const mode = session?.mode ?? "full";
  const completedStepKeys = getCompletedStepKeys(session);
  const requiredStepKeys = getMorningRequiredStepKeys(mode);
  const canComplete = canCompleteMorning(mode, completedStepKeys);

  useEffect(() => {
    setFirstActionDraft(firstActionValue);
  }, [firstActionValue]);

  const saveSession = (next: {
    mode?: RoutineMode;
    completedStepKeys?: string[];
    completionState?: RoutineCompletionState;
  }) => {
    const nextMode = next.mode ?? mode;
    const nextCompletedStepKeys = next.completedStepKeys ?? completedStepKeys;
    const nextCompletionState =
      next.completionState ??
      (nextCompletedStepKeys.length > 0 ? "in_progress" : "not_started");
    onSessionSave({
      mode: nextMode,
      completedStepKeys: nextCompletedStepKeys,
      completionState: nextCompletionState,
    });
  };

  return (
    <HabitCanvasSurface
      title="Morning Rhythm"
      description="Take care of yourself, remember what matters, then choose the day before external inputs do. Short and Minimum are valid completions."
      testId="daily-rhythm-morning"
      focusGroupTestId="habit-focus-group-morning-rhythm"
      aside={
        <HabitCanvasObjectChip tone="today" testId="morning-routine-status">
          {getRoutineStatusLabel(session)}
        </HabitCanvasObjectChip>
      }
    >
      {previousReflection?.firstActionTomorrow ? (
        <div
          className="rounded-lg border border-amber-300/60 bg-amber-50/80 p-4 text-amber-950"
          data-testid="last-night-first-action"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em]">
            Last night you chose
          </p>
          <p className="mt-1 text-sm font-semibold">
            {previousReflection.firstActionTomorrow}
          </p>
          <p className="mt-1 text-xs opacity-80">
            Use it as your first move, or edit it if the day changed.
          </p>
        </div>
      ) : null}

      <HabitCanvasSection
        stepLabel="Start"
        title="Choose a valid morning"
        description="On difficult days, shrink the routine instead of abandoning the identity."
        testId="morning-routine-mode-section"
      >
        <RoutineModeSelector
          value={mode}
          onChange={(nextMode) =>
            saveSession({ mode: nextMode, completionState: "in_progress" })
          }
          disabled={isSaving}
        />
        <RoutineStepStrip
          steps={MORNING_STEPS}
          completedStepKeys={completedStepKeys}
          requiredStepKeys={requiredStepKeys}
          onToggleStep={(stepKey) =>
            saveSession({
              completedStepKeys: toggleStepKey(completedStepKeys, stepKey),
            })
          }
          testId="morning-routine-strip"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Required for {ROUTINE_MODE_LABELS[mode].label}:{" "}
            {requiredStepKeys.length} steps. Optional steps can still be
            checked.
          </p>
          <Button
            type="button"
            onClick={() =>
              saveSession({
                completedStepKeys: Array.from(
                  new Set([...completedStepKeys, ...requiredStepKeys]),
                ),
                completionState: "complete",
              })
            }
            disabled={isSaving || !canComplete}
            data-testid="button-complete-morning-routine"
          >
            Complete morning
          </Button>
        </div>
      </HabitCanvasSection>

      <HabitCanvasSection
        stepLabel="First move"
        title="Begin with context"
        description="Tonight can decide the likely first move. Tomorrow can edit it instead of starting from zero."
        testId="daily-rhythm-first-action"
      >
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            value={firstActionDraft}
            onChange={(event) => setFirstActionDraft(event.target.value)}
            onBlur={() => onFirstActionSave(firstActionDraft)}
            placeholder="What is the first real action?"
            aria-label="First meaningful action"
            data-testid="input-daily-rhythm-first-action"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => onFirstActionSave(firstActionDraft)}
            data-testid="button-save-first-action"
          >
            Save first move
          </Button>
        </div>
      </HabitCanvasSection>

      <HabitCanvasSection
        stepLabel="Three promises"
        title="Today's three wins"
        description="Keep the day small enough to remember: one family/home win, one wealth/security win, and one self win."
        testId="daily-rhythm-commitments"
      >
        <div className="grid gap-3 md:grid-cols-3">
          {DAILY_COMMITMENT_SLOTS.map((slot, index) => (
            <div
              key={slot.key}
              className="rounded-lg border bg-background/80 p-3"
              data-testid={`daily-rhythm-commitment-${slot.key}`}
            >
              <div className="flex items-start gap-2">
                <span className="text-xl" aria-hidden="true">
                  {slot.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{slot.label}</p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {slot.description}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-start gap-2">
                <Checkbox
                  checked={getCommitmentCompleted(commitments, index)}
                  onCheckedChange={(checked) =>
                    onCommitmentChange(
                      index,
                      getCommitmentValue(commitments, index),
                      Boolean(checked),
                    )
                  }
                  aria-label={`${slot.label} complete`}
                  data-testid={`checkbox-daily-rhythm-commitment-${slot.key}`}
                />
                <Input
                  value={getCommitmentValue(commitments, index)}
                  onChange={(event) =>
                    onCommitmentChange(
                      index,
                      event.target.value,
                      undefined,
                      false,
                    )
                  }
                  onBlur={(event) =>
                    onCommitmentChange(
                      index,
                      event.target.value,
                      undefined,
                      true,
                    )
                  }
                  placeholder={slot.label}
                  aria-label={slot.label}
                  data-testid={`input-daily-rhythm-commitment-${slot.key}`}
                />
              </div>
            </div>
          ))}
        </div>
      </HabitCanvasSection>
    </HabitCanvasSurface>
  );
}

export function NightResetPanel({
  session,
  reflection,
  microWinValue,
  onSessionSave,
  onReflectionSave,
  onMicroWinSave,
  onCapture,
  isSaving,
}: {
  session: RoutineSession | null;
  reflection: DailyReflection | null;
  microWinValue: string;
  onSessionSave: (data: {
    mode: RoutineMode;
    completedStepKeys: string[];
    completionState: RoutineCompletionState;
  }) => void;
  onReflectionSave: (data: PatchDailyReflectionBody) => void;
  onMicroWinSave: (value: string) => void;
  onCapture: (value: string) => void;
  isSaving?: boolean;
}) {
  const [captureDraft, setCaptureDraft] = useState("");
  const [microWinDraft, setMicroWinDraft] = useState(microWinValue);
  const [reflectionDraft, setReflectionDraft] =
    useState<PatchDailyReflectionBody>({
      slipped: "",
      learned: "",
      firstActionTomorrow: "",
      prepNote: "",
    });
  const completedStepKeys = getCompletedStepKeys(session);
  const nightPrerequisiteStepKeys = NIGHT_STEPS.filter(
    (step) => step.key !== "sleep",
  ).map((step) => step.key);
  const canCompleteNight = nightPrerequisiteStepKeys.every((stepKey) =>
    completedStepKeys.includes(stepKey),
  );

  useEffect(() => {
    setMicroWinDraft(microWinValue);
  }, [microWinValue]);

  useEffect(() => {
    setReflectionDraft({
      slipped: reflection?.slipped ?? "",
      learned: reflection?.learned ?? "",
      firstActionTomorrow: reflection?.firstActionTomorrow ?? "",
      prepNote: reflection?.prepNote ?? "",
    });
  }, [reflection]);

  const saveSession = (
    nextCompletedStepKeys: string[],
    completionState: RoutineCompletionState = nextCompletedStepKeys.length > 0
      ? "in_progress"
      : "not_started",
  ) => {
    onSessionSave({
      mode: "full",
      completedStepKeys: nextCompletedStepKeys,
      completionState,
    });
  };

  const updateReflection = (patch: PatchDailyReflectionBody) => {
    setReflectionDraft((current) => ({ ...current, ...patch }));
    onReflectionSave(patch);
  };

  return (
    <HabitCanvasSurface
      title="Night Reset"
      description="Clear the mind, learn from today, choose tomorrow, prepare one thing, then close the loop."
      testId="daily-rhythm-night"
      focusGroupTestId="habit-focus-group-night-reset"
      aside={
        <HabitCanvasObjectChip tone="neutral" testId="night-reset-status">
          {getRoutineStatusLabel(session)}
        </HabitCanvasObjectChip>
      }
    >
      <RoutineStepStrip
        steps={NIGHT_STEPS}
        completedStepKeys={completedStepKeys}
        onToggleStep={(stepKey) =>
          saveSession(toggleStepKey(completedStepKeys, stepKey))
        }
        testId="night-reset-strip"
      />

      <HabitCanvasSection
        stepLabel="Capture"
        title="Open loops"
        description="Move tasks and worries out of memory. They land in Can Wait."
        testId="night-reset-capture"
      >
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Textarea
            value={captureDraft}
            onChange={(event) => setCaptureDraft(event.target.value)}
            placeholder="What should not stay in your head overnight?"
            aria-label="Night capture"
            className="min-h-24 resize-none"
            data-testid="textarea-night-capture"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onCapture(captureDraft);
              setCaptureDraft("");
              saveSession(
                Array.from(new Set([...completedStepKeys, "capture"])),
              );
            }}
            disabled={isSaving || captureDraft.trim().length === 0}
            data-testid="button-night-capture"
          >
            Capture
          </Button>
        </div>
      </HabitCanvasSection>

      <HabitCanvasSection
        stepLabel="Review"
        title="Tiny reflection"
        description="Keep it brief: one win, one slip, one lesson."
        testId="night-reset-reflection"
      >
        <div className="grid gap-3 md:grid-cols-3">
          <Textarea
            value={microWinDraft}
            onChange={(event) => setMicroWinDraft(event.target.value)}
            onBlur={() => onMicroWinSave(microWinDraft)}
            placeholder="Today's win"
            aria-label="Today's win"
            className="min-h-24 resize-none"
            data-testid="textarea-reflection-win"
          />
          <Textarea
            value={reflectionDraft.slipped ?? ""}
            onChange={(event) =>
              setReflectionDraft((current) => ({
                ...current,
                slipped: event.target.value,
              }))
            }
            onBlur={() =>
              updateReflection({ slipped: reflectionDraft.slipped })
            }
            placeholder="What slipped"
            aria-label="What slipped"
            className="min-h-24 resize-none"
            data-testid="textarea-reflection-slipped"
          />
          <Textarea
            value={reflectionDraft.learned ?? ""}
            onChange={(event) =>
              setReflectionDraft((current) => ({
                ...current,
                learned: event.target.value,
              }))
            }
            onBlur={() =>
              updateReflection({ learned: reflectionDraft.learned })
            }
            placeholder="What I learned"
            aria-label="What I learned"
            className="min-h-24 resize-none"
            data-testid="textarea-reflection-learned"
          />
        </div>
      </HabitCanvasSection>

      <HabitCanvasSection
        stepLabel="Tomorrow"
        title="Choose and prepare"
        description="Tomorrow starts with context already intact."
        testId="night-reset-tomorrow"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Textarea
            value={reflectionDraft.firstActionTomorrow ?? ""}
            onChange={(event) =>
              setReflectionDraft((current) => ({
                ...current,
                firstActionTomorrow: event.target.value,
              }))
            }
            onBlur={() =>
              updateReflection({
                firstActionTomorrow: reflectionDraft.firstActionTomorrow,
              })
            }
            placeholder="First action tomorrow"
            aria-label="First action tomorrow"
            className="min-h-24 resize-none"
            data-testid="textarea-first-action-tomorrow"
          />
          <Textarea
            value={reflectionDraft.prepNote ?? ""}
            onChange={(event) =>
              setReflectionDraft((current) => ({
                ...current,
                prepNote: event.target.value,
              }))
            }
            onBlur={() =>
              updateReflection({ prepNote: reflectionDraft.prepNote })
            }
            placeholder="One thing to prepare tonight"
            aria-label="Prepare note"
            className="min-h-24 resize-none"
            data-testid="textarea-prep-note"
          />
        </div>
      </HabitCanvasSection>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background/75 p-4">
        <p className="text-sm text-muted-foreground">
          No streaks, no perfect-day score. A finished reset simply means
          tomorrow has a handoff.
        </p>
        <Button
          type="button"
          onClick={() =>
            saveSession(
              Array.from(
                new Set([
                  ...completedStepKeys,
                  ...nightPrerequisiteStepKeys,
                  "sleep",
                ]),
              ),
              "complete",
            )
          }
          disabled={isSaving || !canCompleteNight}
          data-testid="button-complete-night-reset"
        >
          Shutdown
        </Button>
      </div>
    </HabitCanvasSurface>
  );
}
