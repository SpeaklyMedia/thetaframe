import { useEffect, useRef, type ReactNode, type WheelEvent } from "react";
import { cn } from "@/lib/utils";

type HorizontalOverflowSelectorProps = {
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
  activeItemSelector?: string;
  "data-testid"?: string;
};

export function HorizontalOverflowSelector({
  children,
  className,
  viewportClassName,
  activeItemSelector,
  "data-testid": dataTestId,
}: HorizontalOverflowSelectorProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!activeItemSelector) return;

    const viewport = viewportRef.current;
    const activeItem = viewport?.querySelector<HTMLElement>(activeItemSelector);
    if (!viewport || !activeItem) return;

    activeItem.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }, [activeItemSelector, children]);

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const canScrollHorizontally = viewport.scrollWidth > viewport.clientWidth;
    if (!canScrollHorizontally || !event.shiftKey || event.deltaY === 0) return;

    viewport.scrollLeft += event.deltaY;
    event.preventDefault();
  };

  return (
    <div className={cn("relative", className)} data-testid={dataTestId}>
      <div
        ref={viewportRef}
        className={cn(
          "overflow-x-auto overflow-y-visible whitespace-nowrap [scrollbar-width:thin] [-ms-overflow-style:auto] [touch-action:pan-x] overscroll-x-contain",
          "[&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent",
          viewportClassName,
        )}
        onWheel={handleWheel}
      >
        <div className="inline-flex min-w-max items-stretch gap-1 px-1">
          {children}
        </div>
      </div>
    </div>
  );
}
