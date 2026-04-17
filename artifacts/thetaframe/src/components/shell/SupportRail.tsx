import { cn } from "@/lib/utils";

interface SupportRailProps {
  children: React.ReactNode;
  className?: string;
  direction?: "row" | "col";
}

export function SupportRail({
  children,
  className,
  direction = "col",
}: SupportRailProps) {
  return (
    <div
      className={cn(
        "flex gap-3",
        direction === "col" ? "flex-col" : "flex-row flex-wrap",
        className,
      )}
      data-testid="support-rail"
    >
      {children}
    </div>
  );
}
