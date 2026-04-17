import type { UserModeColourState } from "@workspace/api-client-react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type WorkspaceMoodOption = {
  colourState: UserModeColourState;
  label: string;
  shortLabel: string;
  supportCopy: string;
  swatchClassName: string;
};

const WORKSPACE_MOOD_OPTIONS: readonly WorkspaceMoodOption[] = [
  {
    colourState: "green",
    label: "Green",
    shortLabel: "calm/ready",
    supportCopy: "Steady pace.",
    swatchClassName: "bg-emotion-green",
  },
  {
    colourState: "yellow",
    label: "Yellow",
    shortLabel: "anxious/scattered",
    supportCopy: "Reduce choices.",
    swatchClassName: "bg-emotion-yellow",
  },
  {
    colourState: "red",
    label: "Red",
    shortLabel: "overwhelmed",
    supportCopy: "Recovery first.",
    swatchClassName: "bg-emotion-red",
  },
  {
    colourState: "blue",
    label: "Blue",
    shortLabel: "low/flat",
    supportCopy: "Lower effort.",
    swatchClassName: "bg-emotion-blue",
  },
  {
    colourState: "purple",
    label: "Purple",
    shortLabel: "creative/energized",
    supportCopy: "Capture, then choose.",
    swatchClassName: "bg-emotion-purple",
  },
] as const;

export function getWorkspaceMoodOption(colourState?: UserModeColourState | null) {
  return WORKSPACE_MOOD_OPTIONS.find((option) => option.colourState === colourState) ?? WORKSPACE_MOOD_OPTIONS[0];
}

export function WorkspaceMoodPicker({
  colourState,
  onColourChange,
  isSaving = false,
  className,
}: {
  colourState: UserModeColourState;
  onColourChange: (colourState: UserModeColourState) => void;
  isSaving?: boolean;
  className?: string;
}) {
  const selected = getWorkspaceMoodOption(colourState);

  return (
    <section
      className={cn(
        "flex flex-col gap-3 py-2 md:flex-row md:items-center md:justify-between",
        className,
      )}
      aria-label="Workspace color"
      data-testid="workspace-mood-picker"
    >
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Workspace Color
        </p>
        <p className="text-sm text-muted-foreground" data-testid="workspace-mood-current-label">
          {selected.label} - {selected.shortLabel}. {selected.supportCopy}
        </p>
      </div>

      <div className="flex items-center gap-2" role="group" aria-label="Choose workspace color">
        {WORKSPACE_MOOD_OPTIONS.map((option) => {
          const isSelected = option.colourState === colourState;

          return (
            <button
              key={option.colourState}
              type="button"
              className={cn(
                "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-background shadow-sm transition-[box-shadow,transform,opacity] hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                option.swatchClassName,
                option.colourState === "yellow" ? "text-foreground" : "text-white",
                isSelected ? "ring-2 ring-foreground/70 ring-offset-2" : "opacity-80 hover:opacity-100",
              )}
              aria-label={`${option.label}: ${option.shortLabel}`}
              aria-pressed={isSelected}
              title={`${option.label}: ${option.shortLabel}`}
              disabled={isSaving}
              onClick={() => onColourChange(option.colourState)}
              data-testid={`button-workspace-colour-${option.colourState}`}
            >
              {isSelected ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
              <span className="sr-only">{option.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
