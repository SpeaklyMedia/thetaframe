import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Check } from "lucide-react";
import { workspaceColourRgb } from "@/lib/colors";
import { cn } from "@/lib/utils";

export type TaskFeelingColour = "green" | "yellow" | "red" | "blue" | "purple";

const FEELING_OPTIONS: readonly {
  colour: TaskFeelingColour;
  label: string;
  description: string;
}[] = [
  { colour: "green", label: "Calm", description: "This feels steady." },
  { colour: "yellow", label: "Scattered", description: "This needs fewer choices." },
  { colour: "red", label: "Stress", description: "This needs recovery first." },
  { colour: "blue", label: "Low", description: "This needs lower effort." },
  { colour: "purple", label: "Spark", description: "This needs capture before choosing." },
] as const;

export function TaskFeelingColorControl({
  value,
  onChange,
  testIdPrefix,
}: {
  value: TaskFeelingColour;
  onChange: (colour: TaskFeelingColour) => void;
  testIdPrefix: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Choose how this task feels">
      {FEELING_OPTIONS.map((option) => {
        const isSelected = option.colour === value;
        return (
          <button
            key={option.colour}
            type="button"
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full border border-background shadow-sm transition-[box-shadow,opacity,transform] hover:-translate-y-0.5 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isSelected ? "opacity-100 ring-1 ring-foreground/60 ring-offset-1" : "opacity-70",
            )}
            style={{ backgroundColor: `rgb(${workspaceColourRgb[option.colour]})` }}
            aria-label={`${option.label}: ${option.description}`}
            aria-pressed={isSelected}
            title={`${option.label}: ${option.description}`}
            onClick={() => onChange(option.colour)}
            data-testid={`${testIdPrefix}-${option.colour}`}
          >
            {isSelected ? (
              <Check className={option.colour === "yellow" ? "h-3.5 w-3.5 text-foreground" : "h-3.5 w-3.5 text-white"} />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function TaskFeelingRelaxationRow({
  colour,
  testId,
  children,
}: {
  colour: TaskFeelingColour;
  testId: string;
  children: ReactNode;
}) {
  const [isRelaxed, setIsRelaxed] = useState(false);

  useEffect(() => {
    setIsRelaxed(false);
    const frame = window.requestAnimationFrame(() => setIsRelaxed(true));
    return () => window.cancelAnimationFrame(frame);
  }, [colour]);

  const displayRgb = isRelaxed ? workspaceColourRgb.green : workspaceColourRgb[colour];
  const style = {
    "--task-feeling-rgb": displayRgb,
  } as CSSProperties;

  return (
    <div
      className="task-feeling-row rounded-lg border px-2.5 py-2"
      data-task-feeling={colour}
      data-task-relaxed={isRelaxed ? "true" : "false"}
      data-testid={testId}
      style={style}
    >
      {children}
    </div>
  );
}
