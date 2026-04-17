import { cn } from "@/lib/utils";

interface PrimaryActionIslandProps {
  children: React.ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function PrimaryActionIsland({
  children,
  className,
  "data-testid": testId,
}: PrimaryActionIslandProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-5 shadow-sm space-y-4",
        className,
      )}
      data-testid={testId ?? "primary-action-island"}
    >
      {children}
    </div>
  );
}
