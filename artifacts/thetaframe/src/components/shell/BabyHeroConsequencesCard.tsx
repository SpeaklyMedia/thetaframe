import { Link } from "wouter";

type BabyHeroConsequencesItem = {
  id: number;
  name: string;
  dueDate: string | null;
  completionState: string | null;
};

export function BabyHeroConsequencesCard({
  title,
  description,
  items,
  emptyMessage,
  dataTestId,
  "data-testid": testId,
}: {
  title: string;
  description: string;
  items: BabyHeroConsequencesItem[];
  emptyMessage: string;
  dataTestId?: string;
  "data-testid"?: string;
}) {
  return (
    <section className="bg-card border rounded-2xl p-5 shadow-sm space-y-3" data-testid={testId ?? dataTestId}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Link href="/life-ledger?tab=events">
          <a className="text-xs text-muted-foreground hover:text-foreground whitespace-nowrap">Open Events</a>
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 4).map((item) => (
            <div key={item.id} className="flex items-center gap-3 text-sm">
              <span className="font-mono text-xs text-muted-foreground w-24 shrink-0">{item.dueDate ?? "undated"}</span>
              <span className="truncate">{item.name}</span>
              {item.completionState ? (
                <span className="ml-auto shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground capitalize">
                  {item.completionState.replace(/_/g, " ")}
                </span>
              ) : null}
            </div>
          ))}
          {items.length > 4 ? (
            <div className="text-xs text-muted-foreground">+{items.length - 4} more baby-derived items in this window</div>
          ) : null}
        </div>
      )}
    </section>
  );
}
