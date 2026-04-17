import { cn } from "@/lib/utils";

interface LaneHeroProps {
  title: string;
  subtitle?: string;
  label?: string;
  compact?: boolean;
  className?: string;
  children?: React.ReactNode;
  headingTestId?: string;
}

export function LaneHero({
  title,
  subtitle,
  label,
  compact,
  className,
  children,
  headingTestId,
}: LaneHeroProps) {
  return (
    <header
      className={cn(
        "space-y-1",
        compact ? "space-y-0.5" : "space-y-1",
        className,
      )}
    >
      {label ? (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </p>
      ) : null}
      <h1
        className={cn(
          "font-bold tracking-tight",
          compact ? "text-2xl" : "text-3xl",
        )}
        data-testid={headingTestId}
      >
        {title}
      </h1>
      {subtitle ? (
        <p className={cn("text-muted-foreground", compact ? "text-sm" : "")}>
          {subtitle}
        </p>
      ) : null}
      {children}
    </header>
  );
}
