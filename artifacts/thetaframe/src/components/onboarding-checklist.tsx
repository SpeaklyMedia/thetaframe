import { Link } from "wouter";
import type { OnboardingSurfaceProgress } from "@/hooks/use-onboarding";
import { SURFACE_ONBOARDING_COPY } from "@/components/surface-onboarding-card";

const SURFACE_HREFS: Record<string, string> = {
  daily: "/daily",
  weekly: "/weekly",
  vision: "/vision",
  bizdev: "/bizdev",
  "life-ledger": "/life-ledger",
  reach: "/reach",
  admin: "/admin",
};

export function OnboardingChecklist({
  surfaces,
  onNavigate,
}: {
  surfaces: OnboardingSurfaceProgress[];
  onNavigate?: () => void;
}) {
  if (surfaces.length === 0) return null;

  const completedCount = surfaces.filter((surface) => surface.isComplete).length;

  return (
    <section
      className="rounded-2xl border bg-card px-5 py-4 shadow-sm space-y-4"
      data-testid="onboarding-checklist"
    >
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Onboarding Progress
        </p>
        <h2 className="text-lg font-semibold">
          {completedCount} of {surfaces.length} spaces completed
        </h2>
        <p className="text-sm text-muted-foreground">
          Learn each surface by using it once through the normal workflow. The prompt disappears after real data is saved.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {surfaces.map((surface) => {
          const copy = SURFACE_ONBOARDING_COPY[surface.surface];
          return (
            <Link
              key={surface.surface}
              href={SURFACE_HREFS[surface.surface]}
              onClick={onNavigate}
              className="flex items-start justify-between gap-4 rounded-xl border px-4 py-3 hover:bg-accent/40 transition-colors"
              data-testid={`onboarding-link-${surface.surface}`}
            >
              <div className="space-y-1 min-w-0">
                <div className="text-sm font-medium">{copy.label}</div>
                <div className="text-xs text-muted-foreground">{copy.firstStep}</div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${
                  surface.isComplete
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {surface.isComplete ? "Done" : "Next"}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
