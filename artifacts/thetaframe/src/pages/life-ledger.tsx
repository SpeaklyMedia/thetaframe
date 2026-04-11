import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import {
  useListLifeLedgerEntries,
  useCreateLifeLedgerEntry,
  useUpdateLifeLedgerEntry,
  useDeleteLifeLedgerEntry,
  useGetNext90Days,
  useGetSubscriptionAudit,
  getListLifeLedgerEntriesQueryKey,
  getGetNext90DaysQueryKey,
  getGetSubscriptionAuditQueryKey,
  getGetDailyFrameQueryKey,
  getGetWeeklyFrameQueryKey,
  getGetVisionFrameQueryKey,
  LifeLedgerEntry,
  LifeLedgerEntryBody,
  LifeLedgerEntryBodyImpactLevel,
  LifeLedgerEntryBodyReviewWindow,
  LifeLedgerEntryBodyBillingCycle,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, X, ChevronDown, Pencil, Calendar, TrendingUp, ChevronRight } from "lucide-react";
import { ONBOARDING_QUERY_KEY, useOnboardingProgress } from "@/hooks/use-onboarding";
import { SurfaceOnboardingCard } from "@/components/surface-onboarding-card";
import { usePermissions } from "@/hooks/usePermissions";
import {
  BABY_KB_PROMOTIONS_QUERY_KEY,
  useParentPacketImports,
  useParentPacketMaterializations,
  useBabyKbPromotions,
  useCreateBabyKbPromotion,
  useBulkUpdateBabyKbEntries,
  type BabyKbPromotion,
  type ParentPacketMaterialization,
} from "@/hooks/use-parent-packet-imports";
import { useToast } from "@/hooks/use-toast";
import { getMondayOfCurrentWeek, getTodayDateString } from "@/lib/dates";

type Tab = "people" | "events" | "financial" | "subscriptions" | "travel" | "baby";
type BabyReviewFilter = "all" | "framework" | "planning" | "reference" | "must-verify" | "verified";
type BabyGroupBy = "source" | "phase" | "none";
type BabyOperationalState = "needs-review" | "ready-to-promote" | "in-motion" | "already-represented";

type BabyReviewEntry = LifeLedgerEntry & {
  isImported: boolean;
  isVerified: boolean;
  contentType: string | null;
  sourcePath: string | null;
  sourceLabel: string | null;
  phase: string | null;
  tagsList: string[];
};

const TABS: Array<{ key: Tab; label: string; adminOnly?: boolean }> = [
  { key: "people", label: "People" },
  { key: "events", label: "Events & Obligations" },
  { key: "financial", label: "Financial Obligations" },
  { key: "subscriptions", label: "Subscriptions" },
  { key: "travel", label: "Travel & Experiences" },
  { key: "baby", label: "Baby KB", adminOnly: true },
];

const IMPACT_LEVELS = ["low", "medium", "high"];
const REVIEW_WINDOWS = ["annual", "quarterly", "monthly", "situational"];
const BILLING_CYCLES = ["monthly", "annual"];
const BABY_PHASE_ORDER = ["prenatal", "delivery/newborn", "newborn", "postpartum", "infant", "admin"];
const BABY_REVIEW_FILTER_LABELS: Record<BabyReviewFilter, string> = {
  all: "All imported content",
  framework: "Framework",
  planning: "Planning",
  reference: "Reference",
  "must-verify": "Needs verification",
  verified: "Verified personal truth",
};
const BABY_GROUP_BY_LABELS: Record<BabyGroupBy, string> = {
  source: "Group by source file",
  phase: "Group by phase",
  none: "No grouping",
};
const BABY_PROMOTION_BADGE_LABELS: Record<BabyKbPromotion["targetSurface"], string> = {
  daily: "Promoted to Daily",
  weekly: "Promoted to Weekly",
  vision: "Promoted to Vision",
};
const BABY_PROMOTION_BUTTON_LABELS: Record<BabyKbPromotion["targetSurface"], string> = {
  daily: "Promote to Daily",
  weekly: "Promote to Weekly",
  vision: "Promote to Vision",
};
const BABY_OPERATIONAL_STATE_LABELS: Record<BabyOperationalState, string> = {
  "needs-review": "Needs review",
  "ready-to-promote": "Ready to promote",
  "in-motion": "In motion",
  "already-represented": "Already represented",
};
const BABY_OPERATIONAL_STATE_DESCRIPTIONS: Record<BabyOperationalState, string> = {
  "needs-review": "Framework items that still need a trust check before they should steer live planning.",
  "ready-to-promote": "Items that are ready to move into a real Daily, Weekly, or Vision lane.",
  "in-motion": "Items already linked into at least one live surface and active inside the system.",
  "already-represented": "Items already linked broadly enough that Baby KB is now source truth and review context.",
};

const TAB_TAG_SUGGESTIONS: Record<Tab, string[]> = {
  people: [
    "ll_type_family",
    "ll_type_friend",
    "ll_type_colleague",
    "ll_type_mentor",
    "ll_type_client",
    "ll_domain_work",
    "ll_domain_personal",
    "ll_qualifier_key",
    "ll_qualifier_occasional",
  ],
  events: [
    "ll_type_deadline",
    "ll_type_appointment",
    "ll_type_birthday",
    "ll_type_anniversary",
    "ll_type_recurring",
    "ll_domain_work",
    "ll_domain_personal",
    "ll_qualifier_blocking",
    "ll_qualifier_optional",
  ],
  financial: [
    "ll_type_debt",
    "ll_type_tax",
    "ll_type_insurance",
    "ll_type_loan",
    "ll_type_investment",
    "ll_domain_business",
    "ll_domain_personal",
    "ll_qualifier_urgent",
    "ll_qualifier_planned",
  ],
  subscriptions: [
    "ll_type_software",
    "ll_type_media",
    "ll_type_health",
    "ll_type_utility",
    "ll_type_membership",
    "ll_domain_work",
    "ll_domain_personal",
    "ll_qualifier_review",
    "ll_qualifier_keep",
  ],
  travel: [
    "ll_type_flight",
    "ll_type_hotel",
    "ll_type_car",
    "ll_type_experience",
    "ll_type_conference",
    "ll_domain_business",
    "ll_domain_personal",
    "ll_qualifier_booked",
    "ll_qualifier_planned",
  ],
  baby: [
    "milestone",
    "sleep",
    "feeding",
    "appointment",
    "concern",
    "routine",
    "admin",
    "follow-up",
  ],
};

const TAB_COPY: Record<Tab, { intro: string; empty: string; newLabel: string; formTitle: string }> = {
  people: {
    intro: "Track the relationships, follow-ups, and personal context that you do not want to drop.",
    empty: "No people entries yet. Add one relationship or follow-up to start building your ledger.",
    newLabel: "New Entry",
    formTitle: "New Entry",
  },
  events: {
    intro: "Keep time-sensitive obligations, appointments, and key dates visible before they become a scramble.",
    empty: "No event entries yet. Add one real date or obligation to start building your ledger.",
    newLabel: "New Entry",
    formTitle: "New Entry",
  },
  financial: {
    intro: "Capture the payments, debts, and financial commitments that need active attention.",
    empty: "No financial entries yet. Add one obligation to start tracking what needs attention.",
    newLabel: "New Entry",
    formTitle: "New Entry",
  },
  subscriptions: {
    intro: "Review recurring services in one place so you can keep what matters and cut what does not.",
    empty: "No subscriptions yet. Add one recurring service to start your audit trail.",
    newLabel: "New Entry",
    formTitle: "New Entry",
  },
  travel: {
    intro: "Keep trips, bookings, and travel planning details in one place you can revisit quickly.",
    empty: "No travel entries yet. Add one plan, booking, or reminder to start your ledger.",
    newLabel: "New Entry",
    formTitle: "New Entry",
  },
  baby: {
    intro: "Keep milestones, routines, observations, and follow-ups in one admin-only reference lane.",
    empty: "No Baby KB notes yet. Add one milestone, routine, or follow-up to start the knowledge base.",
    newLabel: "New Baby Note",
    formTitle: "New Baby Note",
  },
};

const EMPTY_FORM: LifeLedgerEntryBody = {
  name: "",
  tags: [],
  impactLevel: null,
  reviewWindow: null,
  dueDate: null,
  notes: null,
  amount: null,
  currency: null,
  isEssential: null,
  billingCycle: null,
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function metadataString(metadata: Record<string, unknown> | null, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function sourceLabelFromPath(sourcePath: string | null): string | null {
  if (!sourcePath) return null;
  const leaf = sourcePath.split("/").pop();
  return leaf ?? sourcePath;
}

function phaseLabel(phase: string | null): string | null {
  if (!phase) return null;
  return phase
    .split("/")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" / ");
}

function previewNotes(notes: string | null, maxLines = 6): string {
  if (!notes) return "";
  const lines = notes.split("\n");
  const clipped = lines.slice(0, maxLines).join("\n");
  return lines.length > maxLines ? `${clipped}\n…` : clipped;
}

function inferPhase(entry: LifeLedgerEntry, materialization?: ParentPacketMaterialization): string | null {
  const metadata = asRecord(materialization?.metadata);
  const fromMetadata = metadataString(metadata, "phase");
  if (fromMetadata) return fromMetadata;

  const notes = entry.notes ?? "";
  const match = notes.match(/^Phase:\s*(.+)$/im);
  if (match?.[1]) return match[1].trim().toLowerCase();

  const tags = (entry.tags as string[]) ?? [];
  return BABY_PHASE_ORDER.find((phase) => tags.includes(phase)) ?? null;
}

function buildBabyReviewEntry(
  entry: LifeLedgerEntry,
  materialization?: ParentPacketMaterialization,
): BabyReviewEntry {
  const tagsList = ((entry.tags as string[]) ?? []).slice();
  const metadata = asRecord(materialization?.metadata);
  const sourcePath = metadataString(metadata, "sourcePath");
  const contentType = materialization?.contentType ?? metadataString(metadata, "contentType");
  const phase = inferPhase(entry, materialization);

  return {
    ...entry,
    isImported: Boolean(materialization),
    isVerified: tagsList.includes("Verified personal truth"),
    contentType: contentType ?? null,
    sourcePath,
    sourceLabel: sourceLabelFromPath(sourcePath),
    phase,
    tagsList,
  };
}

function matchesBabyFilter(entry: BabyReviewEntry, filter: BabyReviewFilter) {
  switch (filter) {
    case "all":
      return true;
    case "verified":
      return entry.isVerified;
    case "must-verify":
      return entry.contentType === "must-verify" || entry.tagsList.includes("Needs verification");
    default:
      return entry.contentType === filter;
  }
}

function groupBabyEntries(entries: BabyReviewEntry[], groupBy: BabyGroupBy) {
  if (groupBy === "none") {
    return [{ key: "all", label: "All Baby KB items", entries }];
  }

  const grouped = new Map<string, BabyReviewEntry[]>();

  for (const entry of entries) {
    const label =
      groupBy === "source"
        ? entry.sourceLabel ?? "Manual Baby KB entries"
        : entry.phase
          ? phaseLabel(entry.phase) ?? entry.phase
          : entry.isImported
            ? "No phase attached"
            : "Manual Baby KB entries";
    const key = `${groupBy}:${label}`;
    grouped.set(key, [...(grouped.get(key) ?? []), entry]);
  }

  const groups = Array.from(grouped.entries()).map(([key, groupedEntries]) => ({
    key,
    label: key.split(":").slice(1).join(":"),
    entries: groupedEntries.sort((a, b) => a.name.localeCompare(b.name)),
  }));

  if (groupBy === "phase") {
    groups.sort((a, b) => {
      const aIndex = BABY_PHASE_ORDER.indexOf(a.label.toLowerCase().replace(/\s+\/\s+/g, "/"));
      const bIndex = BABY_PHASE_ORDER.indexOf(b.label.toLowerCase().replace(/\s+\/\s+/g, "/"));
      const normalizedA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
      const normalizedB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
      return normalizedA - normalizedB || a.label.localeCompare(b.label);
    });
  } else {
    groups.sort((a, b) => a.label.localeCompare(b.label));
  }

  return groups;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function getPromotionTargetHref(surface: BabyKbPromotion["targetSurface"]) {
  if (surface === "daily") return "/daily";
  if (surface === "weekly") return "/weekly";
  return "/vision";
}

function getPromotionTargetLabel(surface: BabyKbPromotion["targetSurface"]) {
  if (surface === "daily") return "Open Daily";
  if (surface === "weekly") return "Open Weekly";
  return "Open Vision";
}

function getBabyOperationalState(entry: BabyReviewEntry, promotions: BabyKbPromotion[]): BabyOperationalState {
  const needsReview = entry.contentType === "must-verify" || entry.tagsList.includes("Needs verification");

  if (needsReview) return "needs-review";
  if (promotions.length === 0) return "ready-to-promote";
  if (promotions.length >= 3) return "already-represented";
  return "in-motion";
}

function getBabyActionSummary(entry: BabyReviewEntry, promotions: BabyKbPromotion[]) {
  const state = getBabyOperationalState(entry, promotions);
  const source = entry.sourceLabel ? `from ${entry.sourceLabel}` : "from Baby KB";

  if (state === "needs-review") {
    return `${source}. Review this framework item before it starts shaping a live Daily, Weekly, or Vision lane.`;
  }

  if (state === "ready-to-promote") {
    return `${source}. This item is not represented in a live operating surface yet, so it is a candidate for Daily, Weekly, or Vision.`;
  }

  if (state === "already-represented") {
    return `${source}. This item is already linked across Daily, Weekly, and Vision, so Baby KB is now the provenance and review layer.`;
  }

  const linkedSurfaces = promotions
    .map((promotion) => BABY_PROMOTION_BADGE_LABELS[promotion.targetSurface].replace("Promoted to ", ""))
    .join(", ");
  return `${source}. This item is already active in ${linkedSurfaces} and can still be reviewed here without overwriting those live copies.`;
}

function BabyOperationalQueue({
  entries,
  promotionsByEntryId,
}: {
  entries: BabyReviewEntry[];
  promotionsByEntryId: Map<number, BabyKbPromotion[]>;
}) {
  const groups = new Map<BabyOperationalState, BabyReviewEntry[]>(
    (Object.keys(BABY_OPERATIONAL_STATE_LABELS) as BabyOperationalState[]).map((state) => [state, []]),
  );

  for (const entry of entries) {
    const state = getBabyOperationalState(entry, promotionsByEntryId.get(entry.id) ?? []);
    groups.set(state, [...(groups.get(state) ?? []), entry]);
  }

  return (
    <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4" data-testid="baby-kb-operational-queue">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">Items in Motion</h2>
        <p className="text-sm text-muted-foreground">
          Use Baby KB as the parenting review and source-truth lane, then move the right items into Daily, Weekly, and Vision where real behavior change happens.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        {(Object.keys(BABY_OPERATIONAL_STATE_LABELS) as BabyOperationalState[]).map((state) => {
          const stateEntries = (groups.get(state) ?? []).sort((a, b) => a.name.localeCompare(b.name));

          return (
            <section key={state} className="rounded-xl border bg-muted/20 p-4 space-y-3" data-testid={`baby-kb-queue-${state}`}>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">{BABY_OPERATIONAL_STATE_LABELS[state]}</h3>
                  <span className="rounded-full bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
                    {stateEntries.length}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{BABY_OPERATIONAL_STATE_DESCRIPTIONS[state]}</p>
              </div>

              {stateEntries.length === 0 ? (
                <div className="text-xs text-muted-foreground">No items currently in this state.</div>
              ) : (
                <div className="space-y-2">
                  {stateEntries.slice(0, 4).map((entry) => {
                    const promotions = promotionsByEntryId.get(entry.id) ?? [];
                    return (
                      <div key={entry.id} className="rounded-lg border bg-background/80 p-3 space-y-2">
                        <div className="text-sm font-medium">{entry.name || "Untitled imported note"}</div>
                        <p className="text-xs text-muted-foreground">{getBabyActionSummary(entry, promotions)}</p>
                        {promotions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {promotions.map((promotion) => (
                              <Link key={`${promotion.targetSurface}-${promotion.targetContainerKey}`} href={getPromotionTargetHref(promotion.targetSurface)}>
                                <a
                                  className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                                  data-testid={`link-baby-kb-queue-target-${entry.id}-${promotion.targetSurface}`}
                                >
                                  {getPromotionTargetLabel(promotion.targetSurface)}
                                </a>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {stateEntries.length > 4 && (
                    <div className="text-xs text-muted-foreground">
                      {stateEntries.length - 4} more items are currently in this state.
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function EntryForm({
  tab,
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  tab: Tab;
  initial: LifeLedgerEntryBody;
  onSave: (data: LifeLedgerEntryBody) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<LifeLedgerEntryBody>(initial);
  const [tagInput, setTagInput] = useState("");
  const suggestions = TAB_TAG_SUGGESTIONS[tab].filter((s) => !form.tags.includes(s));

  const set = <K extends keyof LifeLedgerEntryBody>(k: K, v: LifeLedgerEntryBody[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      set("tags", [...form.tags, t]);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => set("tags", form.tags.filter((t) => t !== tag));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  };

  const showFinancial = tab === "financial" || tab === "subscriptions";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Name *</label>
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Entry name"
            required
            data-testid="input-entry-name"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Due Date</label>
          <Input
            type="date"
            value={form.dueDate ?? ""}
            onChange={(e) => set("dueDate", e.target.value || null)}
            data-testid="input-due-date"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Impact Level</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between" data-testid="select-impact-level">
                <span className="capitalize">{form.impactLevel ?? "None"}</span>
                <ChevronDown className="w-4 h-4 ml-2 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => set("impactLevel", null)}>None</DropdownMenuItem>
              {IMPACT_LEVELS.map((l) => (
                <DropdownMenuItem key={l} onClick={() => set("impactLevel", l as LifeLedgerEntryBodyImpactLevel)} className="capitalize" data-testid={`impact-option-${l}`}>
                  {l}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Review Window</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between" data-testid="select-review-window">
                <span className="capitalize">{form.reviewWindow ?? "None"}</span>
                <ChevronDown className="w-4 h-4 ml-2 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => set("reviewWindow", null)}>None</DropdownMenuItem>
              {REVIEW_WINDOWS.map((r) => (
                <DropdownMenuItem key={r} onClick={() => set("reviewWindow", r as LifeLedgerEntryBodyReviewWindow)} className="capitalize" data-testid={`review-option-${r}`}>
                  {r}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {showFinancial && (
          <>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Amount</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.amount ?? ""}
                onChange={(e) => set("amount", e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="0.00"
                data-testid="input-amount"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Currency</label>
              <Input
                value={form.currency ?? ""}
                onChange={(e) => set("currency", e.target.value || null)}
                placeholder="USD"
                maxLength={3}
                data-testid="input-currency"
              />
            </div>
          </>
        )}

        {tab === "subscriptions" && (
          <>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Billing Cycle</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between" data-testid="select-billing-cycle">
                    <span className="capitalize">{form.billingCycle ?? "None"}</span>
                    <ChevronDown className="w-4 h-4 ml-2 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => set("billingCycle", null)}>None</DropdownMenuItem>
                  {BILLING_CYCLES.map((b) => (
                    <DropdownMenuItem key={b} onClick={() => set("billingCycle", b as LifeLedgerEntryBodyBillingCycle)} className="capitalize" data-testid={`billing-option-${b}`}>
                      {b}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Checkbox
                id="is-essential"
                checked={form.isEssential ?? false}
                onCheckedChange={(c) => set("isEssential", c === true ? true : false)}
                data-testid="checkbox-is-essential"
              />
              <label htmlFor="is-essential" className="text-sm font-medium cursor-pointer">
                Essential subscription
              </label>
            </div>
          </>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Tags</label>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            placeholder="Custom tag or select below..."
            data-testid="input-tag"
          />
          <Button type="button" variant="outline" size="sm" onClick={addTag} data-testid="button-add-tag">
            Add
          </Button>
        </div>
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set("tags", [...form.tags, s])}
                className="inline-flex items-center bg-accent/50 hover:bg-accent px-2 py-0.5 rounded-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                data-testid={`button-suggest-tag-${s}`}
              >
                + {s}
              </button>
            ))}
          </div>
        )}
        {form.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {form.tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full text-xs">
                {tag}
                <button type="button" onClick={() => removeTag(tag)} className="text-muted-foreground hover:text-foreground" data-testid={`button-remove-tag-${tag}`}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Notes</label>
        <Textarea
          value={form.notes ?? ""}
          onChange={(e) => set("notes", e.target.value || null)}
          placeholder="Any notes..."
          className="resize-none h-20"
          data-testid="textarea-notes"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSaving || !form.name.trim()} data-testid="button-save-entry">
          {isSaving ? "Saving..." : "Save Entry"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-entry">
          Cancel
        </Button>
      </div>
    </form>
  );
}

function TabTable({
  tab,
  entries,
  editingId,
  onEdit,
  onDelete,
}: {
  tab: Tab;
  entries: LifeLedgerEntry[];
  editingId: number | null;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const showFinancial = tab === "financial" || tab === "subscriptions";
  const showSubscription = tab === "subscriptions";

  return (
    <div className="overflow-x-auto rounded-2xl border shadow-sm bg-card" data-testid="entries-table">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tags</th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Impact</th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Review</th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Due Date</th>
            {showFinancial && (
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
            )}
            {showSubscription && (
              <>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Billing</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Essential</th>
              </>
            )}
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            if (editingId === entry.id) return null;
            return (
              <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors" data-testid={`entry-row-${entry.id}`}>
                <td className="px-3 py-3 font-medium whitespace-nowrap">{entry.name}</td>
                <td className="px-3 py-3 max-w-[160px]">
                  <div className="flex flex-wrap gap-1">
                    {(entry.tags as string[]).map((tag) => (
                      <span key={tag} className="bg-secondary text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap">{tag}</span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-3 text-muted-foreground capitalize whitespace-nowrap">{entry.impactLevel ?? ""}</td>
                <td className="px-3 py-3 text-muted-foreground capitalize whitespace-nowrap">{entry.reviewWindow ?? ""}</td>
                <td className="px-3 py-3 font-mono text-xs whitespace-nowrap">{entry.dueDate ?? ""}</td>
                {showFinancial && (
                  <td className="px-3 py-3 font-mono text-xs whitespace-nowrap">
                    {entry.amount != null ? `${entry.currency ? entry.currency + " " : ""}${entry.amount.toLocaleString()}` : ""}
                  </td>
                )}
                {showSubscription && (
                  <>
                    <td className="px-3 py-3 text-muted-foreground capitalize whitespace-nowrap">{entry.billingCycle ?? ""}</td>
                    <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                      {entry.isEssential != null ? (entry.isEssential ? "Yes" : "No") : ""}
                    </td>
                  </>
                )}
                <td className="px-3 py-3 text-muted-foreground max-w-[180px] truncate" title={entry.notes ?? ""}>{entry.notes ?? ""}</td>
                <td className="px-3 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(entry.id)} aria-label="Edit" data-testid={`button-edit-entry-${entry.id}`}>
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(entry.id)} aria-label="Delete" data-testid={`button-delete-entry-${entry.id}`}>
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BabyReviewBoard({
  entries,
  filter,
  groupBy,
  search,
  editingId,
  selectedEntryIds,
  collapsedGroupKeys,
  bulkTagInput,
  promotionsByEntryId,
  promotingKey,
  onFilterChange,
  onGroupByChange,
  onSearchChange,
  onToggleSelectAllVisible,
  onToggleEntrySelected,
  onToggleGroupCollapsed,
  onBulkTagInputChange,
  onBulkVerify,
  onBulkAddTag,
  onBulkRemoveTag,
  onEdit,
  onDelete,
  onPromoteToSurface,
}: {
  entries: BabyReviewEntry[];
  filter: BabyReviewFilter;
  groupBy: BabyGroupBy;
  search: string;
  editingId: number | null;
  selectedEntryIds: number[];
  collapsedGroupKeys: string[];
  bulkTagInput: string;
  promotionsByEntryId: Map<number, BabyKbPromotion[]>;
  promotingKey: string | null;
  onFilterChange: (filter: BabyReviewFilter) => void;
  onGroupByChange: (groupBy: BabyGroupBy) => void;
  onSearchChange: (value: string) => void;
  onToggleSelectAllVisible: () => void;
  onToggleEntrySelected: (entryId: number) => void;
  onToggleGroupCollapsed: (groupKey: string) => void;
  onBulkTagInputChange: (value: string) => void;
  onBulkVerify: () => void;
  onBulkAddTag: () => void;
  onBulkRemoveTag: () => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onPromoteToSurface: (entry: BabyReviewEntry, surface: BabyKbPromotion["targetSurface"]) => void;
}) {
  const visibleEntries = entries.filter((entry) => entry.id !== editingId);
  const groups = groupBabyEntries(visibleEntries, groupBy);
  const selectedSet = new Set(selectedEntryIds);
  const collapsedSet = new Set(collapsedGroupKeys);
  const visibleEntryIds = visibleEntries.map((entry) => entry.id);
  const selectedVisibleCount = visibleEntryIds.filter((entryId) => selectedSet.has(entryId)).length;
  const allVisibleSelected = visibleEntryIds.length > 0 && selectedVisibleCount === visibleEntryIds.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;
  const importedCount = entries.filter((entry) => entry.isImported).length;
  const verifiedCount = entries.filter((entry) => entry.isVerified).length;
  const needsVerificationCount = entries.filter((entry) => entry.tagsList.includes("Needs verification")).length;

  return (
    <div className="space-y-4">
      <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4" data-testid="baby-kb-review-controls">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">Review imported Baby KB content</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Filter imported framework content, group it by source or phase, and move the right items into verified truth or live planning surfaces without losing the original packet link.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-muted px-2.5 py-1">{importedCount} imported</span>
            <span className="rounded-full bg-muted px-2.5 py-1">{needsVerificationCount} need verification</span>
            <span className="rounded-full bg-muted px-2.5 py-1">{verifiedCount} verified</span>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px]">
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search notes, source files, phases, or tags..."
            data-testid="input-baby-kb-search"
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between" data-testid="select-baby-filter">
                <span>{BABY_REVIEW_FILTER_LABELS[filter]}</span>
                <ChevronDown className="w-4 h-4 ml-2 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {(Object.keys(BABY_REVIEW_FILTER_LABELS) as BabyReviewFilter[]).map((value) => (
                <DropdownMenuItem key={value} onClick={() => onFilterChange(value)}>
                  {BABY_REVIEW_FILTER_LABELS[value]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between" data-testid="select-baby-group-by">
                <span>{BABY_GROUP_BY_LABELS[groupBy]}</span>
                <ChevronDown className="w-4 h-4 ml-2 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {(Object.keys(BABY_GROUP_BY_LABELS) as BabyGroupBy[]).map((value) => (
                <DropdownMenuItem key={value} onClick={() => onGroupByChange(value)}>
                  {BABY_GROUP_BY_LABELS[value]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="rounded-xl border bg-muted/30 p-4 space-y-3" data-testid="baby-kb-bulk-actions">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                onCheckedChange={() => onToggleSelectAllVisible()}
                data-testid="checkbox-select-all-visible-baby-kb"
              />
              <div>
                <div className="text-sm font-medium">{selectedVisibleCount} selected in view</div>
                <div className="text-xs text-muted-foreground">
                  Bulk actions only touch Baby KB entry tags. Import provenance stays unchanged.
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={selectedEntryIds.length === 0}
                onClick={onBulkVerify}
                data-testid="button-bulk-verify-baby-kb"
              >
                Mark verified
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row">
            <Input
              value={bulkTagInput}
              onChange={(event) => onBulkTagInputChange(event.target.value)}
              placeholder="Tag to add or remove across the selected entries..."
              data-testid="input-bulk-tag-baby-kb"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={selectedEntryIds.length === 0 || !bulkTagInput.trim()}
                onClick={onBulkAddTag}
                data-testid="button-bulk-add-tag-baby-kb"
              >
                Add tag
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={selectedEntryIds.length === 0 || !bulkTagInput.trim()}
                onClick={onBulkRemoveTag}
                data-testid="button-bulk-remove-tag-baby-kb"
              >
                Remove tag
              </Button>
            </div>
          </div>
        </div>
      </div>

      {visibleEntries.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No Baby KB entries match the current review filters.
        </div>
      ) : (
        <div className="space-y-5" data-testid="baby-kb-review-board">
          {groups.map((group) => (
            <section key={group.key} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">{group.label}</h3>
                  <p className="text-xs text-muted-foreground">{group.entries.length} entries</p>
                </div>
                {groupBy !== "none" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleGroupCollapsed(group.key)}
                    data-testid={`button-toggle-baby-group-${group.key}`}
                  >
                    {collapsedSet.has(group.key) ? (
                      <>
                        <ChevronRight className="mr-2 h-4 w-4" /> Expand
                      </>
                    ) : (
                      <>
                        <ChevronDown className="mr-2 h-4 w-4" /> Collapse
                      </>
                    )}
                  </Button>
                )}
              </div>
              {!collapsedSet.has(group.key) && <div className="grid gap-3">
                {group.entries.map((entry) => {
                  const notePreview = previewNotes(entry.notes ?? "");
                  const promotions = promotionsByEntryId.get(entry.id) ?? [];
                  const promotedSurfaces = new Set(promotions.map((promotion) => promotion.targetSurface));
                  return (
                    <article
                      key={entry.id}
                      className="rounded-2xl border bg-card p-4 shadow-sm space-y-3"
                      data-testid={`baby-kb-card-${entry.id}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Checkbox
                              checked={selectedSet.has(entry.id)}
                              onCheckedChange={() => onToggleEntrySelected(entry.id)}
                              data-testid={`checkbox-select-baby-entry-${entry.id}`}
                            />
                            <h4 className="text-sm font-semibold">{entry.name || "Untitled imported note"}</h4>
                            {entry.isImported && (
                              <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">Imported from packet</span>
                            )}
                            {entry.contentType && (
                              <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] capitalize">
                                {entry.contentType === "must-verify" ? "Needs verification" : entry.contentType}
                              </span>
                            )}
                            {entry.isVerified && (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                                Verified personal truth
                              </span>
                            )}
                            {promotions.map((promotion) => (
                              <span
                                key={`${promotion.targetSurface}-${promotion.targetContainerKey}`}
                                className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                              >
                                {BABY_PROMOTION_BADGE_LABELS[promotion.targetSurface]}
                              </span>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            {entry.sourceLabel && <span>Source: {entry.sourceLabel}</span>}
                            {entry.phase && <span>Phase: {phaseLabel(entry.phase)}</span>}
                          </div>
                          <p className="max-w-2xl text-xs text-muted-foreground">
                            {getBabyActionSummary(entry, promotions)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(["daily", "weekly", "vision"] as BabyKbPromotion["targetSurface"][]).map((surface) => {
                            const promotionKey = `${entry.id}:${surface}`;
                            const isPromoting = promotingKey === promotionKey;
                            const alreadyPromoted = promotedSurfaces.has(surface);
                            return (
                              <Button
                                key={surface}
                                variant="outline"
                                size="sm"
                                onClick={() => onPromoteToSurface(entry, surface)}
                                disabled={isPromoting || alreadyPromoted}
                                data-testid={`button-promote-baby-entry-${entry.id}-${surface}`}
                              >
                                {isPromoting
                                  ? "Linking..."
                                  : alreadyPromoted
                                    ? BABY_PROMOTION_BADGE_LABELS[surface]
                                    : BABY_PROMOTION_BUTTON_LABELS[surface]}
                              </Button>
                            );
                          })}
                          <Button variant="outline" size="sm" onClick={() => onEdit(entry.id)} data-testid={`button-edit-baby-entry-${entry.id}`}>
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => onDelete(entry.id)} data-testid={`button-delete-baby-entry-${entry.id}`}>
                            Delete
                          </Button>
                        </div>
                      </div>

                      {entry.tagsList.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {entry.tagsList.map((tag) => (
                            <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {promotions.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {promotions.map((promotion) => (
                            <Link key={`${promotion.targetSurface}-${promotion.targetContainerKey}`} href={getPromotionTargetHref(promotion.targetSurface)}>
                              <a
                                className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                                data-testid={`link-baby-kb-target-${entry.id}-${promotion.targetSurface}`}
                              >
                                {getPromotionTargetLabel(promotion.targetSurface)}
                              </a>
                            </Link>
                          ))}
                        </div>
                      )}

                      {notePreview && (
                        <pre className="whitespace-pre-wrap break-words rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground font-sans">
                          {notePreview}
                        </pre>
                      )}
                    </article>
                  );
                })}
              </div>}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Next90DaysPanel() {
  const { data } = useGetNext90Days({ query: { queryKey: getGetNext90DaysQueryKey(), refetchOnWindowFocus: false } });

  if (!data || data.entries.length === 0) return null;

  return (
    <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-3" data-testid="next-90-days-panel">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Next 90 Days</h2>
        <span className="text-xs text-muted-foreground ml-auto">through {data.windowEnd}</span>
      </div>
      <div className="space-y-2">
        {data.entries.map((e) => (
          <div key={`${e.tab}-${e.id}`} className="flex items-center gap-3 text-sm" data-testid={`next-90-item-${e.tab}-${e.id}`}>
            <span className="font-medium font-mono text-xs w-24 shrink-0">{e.dueDate}</span>
            <span className="capitalize text-xs text-muted-foreground w-20 shrink-0">{e.tab}</span>
            <span className="truncate">{e.name}</span>
            {e.impactLevel && (
              <span className="text-xs capitalize text-muted-foreground shrink-0">{e.impactLevel}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SubscriptionAuditPanel() {
  const { data } = useGetSubscriptionAudit({ query: { queryKey: getGetSubscriptionAuditQueryKey(), refetchOnWindowFocus: false } });

  if (!data || data.items.length === 0) return null;

  return (
    <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4" data-testid="subscription-audit-panel">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Subscription Audit</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="bg-muted rounded-xl p-3">
          <div className="text-base font-bold">${data.totalMonthly.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Total/mo</div>
          <div className="text-xs text-muted-foreground font-mono">${(data.totalMonthly * 12).toFixed(2)}/yr</div>
        </div>
        <div className="bg-muted rounded-xl p-3">
          <div className="text-base font-bold">${data.totalMonthlyEssential.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Essential/mo</div>
          <div className="text-xs text-muted-foreground font-mono">${(data.totalMonthlyEssential * 12).toFixed(2)}/yr</div>
        </div>
      </div>
      <div className="space-y-1">
        {data.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0" data-testid={`audit-item-${item.id}`}>
            <span>{item.name}</span>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {item.isEssential != null && (
                <span>{item.isEssential ? "Essential" : "Optional"}</span>
              )}
              {item.billingCycle && (
                <span className="capitalize">{item.billingCycle}</span>
              )}
              {item.monthlyEquivalent != null && (
                <span className="font-mono">${item.monthlyEquivalent.toFixed(2)}/mo</span>
              )}
              {item.annualEquivalent != null && (
                <span className="font-mono">${item.annualEquivalent.toFixed(2)}/yr</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LifeLedgerPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("people");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [babyFilter, setBabyFilter] = useState<BabyReviewFilter>("all");
  const [babyGroupBy, setBabyGroupBy] = useState<BabyGroupBy>("source");
  const [babySearch, setBabySearch] = useState("");
  const [selectedBabyEntryIds, setSelectedBabyEntryIds] = useState<number[]>([]);
  const [collapsedBabyGroups, setCollapsedBabyGroups] = useState<string[]>([]);
  const [bulkTagInput, setBulkTagInput] = useState("");
  const [promotingKey, setPromotingKey] = useState<string | null>(null);
  const { isAdmin } = usePermissions();
  const { data: parentPacketImports } = useParentPacketImports(isAdmin);
  const { data: parentPacketMaterializations } = useParentPacketMaterializations(isAdmin);
  const { data: babyKbPromotions } = useBabyKbPromotions(isAdmin);
  const visibleTabs = TABS.filter((tab) => !tab.adminOnly || isAdmin);
  const activeTabCopy = TAB_COPY[activeTab];
  const latestParentPacketImport = parentPacketImports?.[0];
  const todayDate = getTodayDateString();
  const currentWeekStart = getMondayOfCurrentWeek();

  const { data: entries, isLoading } = useListLifeLedgerEntries(activeTab, {
    query: {
      queryKey: getListLifeLedgerEntriesQueryKey(activeTab),
    },
  });

  const createMutation = useCreateLifeLedgerEntry();
  const updateMutation = useUpdateLifeLedgerEntry();
  const deleteMutation = useDeleteLifeLedgerEntry();
  const bulkUpdateBabyKbMutation = useBulkUpdateBabyKbEntries();
  const createBabyKbPromotionMutation = useCreateBabyKbPromotion();
  const { isSurfaceComplete } = useOnboardingProgress();

  useEffect(() => {
    if (activeTab === "baby" && !isAdmin) {
      setActiveTab("people");
      setShowForm(false);
      setEditingId(null);
    }
  }, [activeTab, isAdmin]);

  useEffect(() => {
    if (activeTab !== "baby") {
      setSelectedBabyEntryIds([]);
      setCollapsedBabyGroups([]);
      setBulkTagInput("");
    }
  }, [activeTab]);

  const invalidateTab = (tab: Tab) => {
    queryClient.invalidateQueries({ queryKey: getListLifeLedgerEntriesQueryKey(tab) });
    queryClient.invalidateQueries({ queryKey: getGetNext90DaysQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetSubscriptionAuditQueryKey() });
    queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY });
  };

  const babyEntries = useMemo(() => {
    if (activeTab !== "baby" || !entries) return [] as BabyReviewEntry[];

    const materializationMap = new Map<number, ParentPacketMaterialization>();
    for (const materialization of parentPacketMaterializations ?? []) {
      materializationMap.set(materialization.targetEntryId, materialization);
    }

    return entries.map((entry) => buildBabyReviewEntry(entry, materializationMap.get(entry.id)));
  }, [activeTab, entries, parentPacketMaterializations]);

  const filteredBabyEntries = useMemo(() => {
    const normalizedQuery = babySearch.trim().toLowerCase();

    return babyEntries.filter((entry) => {
      if (!matchesBabyFilter(entry, babyFilter)) return false;
      if (!normalizedQuery) return true;

      const haystack = [
        entry.name,
        entry.notes ?? "",
        entry.sourcePath ?? "",
        entry.sourceLabel ?? "",
        entry.phase ?? "",
        ...entry.tagsList,
      ]
        .join("\n")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [babyEntries, babyFilter, babySearch]);

  const babyPromotionsByEntryId = useMemo(() => {
    const grouped = new Map<number, BabyKbPromotion[]>();
    for (const promotion of babyKbPromotions ?? []) {
      grouped.set(promotion.sourceEntryId, [...(grouped.get(promotion.sourceEntryId) ?? []), promotion]);
    }
    return grouped;
  }, [babyKbPromotions]);

  const handleCreate = (data: LifeLedgerEntryBody) => {
    createMutation.mutate({ tab: activeTab, data }, {
      onSuccess: () => {
        setShowForm(false);
        invalidateTab(activeTab);
      },
    });
  };

  const handleUpdate = (id: number, data: LifeLedgerEntryBody) => {
    updateMutation.mutate({ tab: activeTab, id, data }, {
      onSuccess: () => {
        setEditingId(null);
        invalidateTab(activeTab);
      },
    });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ tab: activeTab, id }, { onSuccess: () => invalidateTab(activeTab) });
  };

  const invalidateBabyKbState = () => {
    invalidateTab("baby");
    queryClient.invalidateQueries({ queryKey: BABY_KB_PROMOTIONS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY });
  };

  const handleBulkBabyUpdate = (operation: "mark-verified" | "add-tag" | "remove-tag", tag?: string) => {
    if (selectedBabyEntryIds.length === 0) return;

    bulkUpdateBabyKbMutation.mutate(
      {
        entryIds: selectedBabyEntryIds,
        operation,
        tag: tag?.trim() || undefined,
      },
      {
        onSuccess: (result) => {
          invalidateBabyKbState();
          if (operation !== "mark-verified") {
            setBulkTagInput("");
          }
          toast({
            title: "Baby KB updated",
            description:
              operation === "mark-verified"
                ? `${result.updatedCount} entries marked as verified.`
                : `${result.updatedCount} entries updated.`,
          });
        },
        onError: (error) => {
          toast({
            title: "Baby KB update failed",
            description: getErrorMessage(error, "The selected entries could not be updated."),
            variant: "destructive",
          });
        },
      },
    );
  };

  const handlePromoteToSurface = (entry: BabyReviewEntry, surface: BabyKbPromotion["targetSurface"]) => {
    const targetContainerKey =
      surface === "daily" ? todayDate : surface === "weekly" ? currentWeekStart : "me";
    const mutationKey = `${entry.id}:${surface}`;
    setPromotingKey(mutationKey);

    createBabyKbPromotionMutation.mutate(
      {
        sourceEntryId: entry.id,
        targetSurface: surface,
        targetContainerKey,
      },
      {
        onSuccess: (promotion) => {
          invalidateBabyKbState();
          if (surface === "daily") {
            queryClient.invalidateQueries({ queryKey: getGetDailyFrameQueryKey(todayDate) });
          }
          if (surface === "weekly") {
            queryClient.invalidateQueries({ queryKey: getGetWeeklyFrameQueryKey(currentWeekStart) });
          }
          if (surface === "vision") {
            queryClient.invalidateQueries({ queryKey: getGetVisionFrameQueryKey() });
          }
          toast({
            title: promotion.existing ? "Already linked" : "Baby KB item promoted",
            description: promotion.existing
              ? `${entry.name} was already linked to ${surface}.`
              : `${entry.name} is now linked to ${surface}.`,
          });
        },
        onError: (error) => {
          toast({
            title: "Promotion failed",
            description: getErrorMessage(error, "This Baby KB item could not be linked."),
            variant: "destructive",
          });
        },
        onSettled: () => setPromotingKey(null),
      },
    );
  };

  const editingEntry = entries?.find((e) => e.id === editingId);

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-life-ledger-title">Life Ledger</h1>
            <p className="text-muted-foreground mt-1">{activeTabCopy.intro}</p>
          </div>
          {!showForm && editingId === null && (
            <Button onClick={() => setShowForm(true)} data-testid="button-new-entry">
              <Plus className="w-4 h-4 mr-2" /> {activeTabCopy.newLabel}
            </Button>
          )}
        </header>

        {!isSurfaceComplete("life-ledger") && <SurfaceOnboardingCard surface="life-ledger" />}

        <Next90DaysPanel />

        {activeTab === "subscriptions" && <SubscriptionAuditPanel />}

        {activeTab === "baby" && (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
              <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-2" data-testid="baby-kb-intro">
                <h2 className="text-sm font-semibold">Baby KB</h2>
                <p className="text-sm text-muted-foreground">
                  Use this admin-only lane to turn parenting framework content into better daily pacing, weekly alignment, and longer-range visibility without losing the source material.
                </p>
                <p className="text-xs text-muted-foreground">
                  Baby KB is a supporting review and planning lane. Daily, Weekly, and Vision remain the live operating surfaces for action.
                </p>
              </div>
              <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-3" data-testid="baby-kb-import-summary">
                <div>
                  <h2 className="text-sm font-semibold">Parent Packet Source</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    The raw archive lives in REACH. Materialized Baby KB notes stay linked to that source so they can be reworked without becoming default app data.
                  </p>
                </div>
                {latestParentPacketImport ? (
                  <div className="space-y-2 text-sm">
                    <div>
                      <div className="font-medium">{latestParentPacketImport.sourceReachFileName}</div>
                      <div className="text-xs text-muted-foreground">
                        Imported {new Date(latestParentPacketImport.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-muted p-2">
                        <div className="text-base font-semibold">{latestParentPacketImport.summary.materializedEntryCount}</div>
                        <div className="text-[11px] text-muted-foreground">materialized</div>
                      </div>
                      <div className="rounded-xl bg-muted p-2">
                        <div className="text-base font-semibold">{latestParentPacketImport.summary.createdCount}</div>
                        <div className="text-[11px] text-muted-foreground">created</div>
                      </div>
                      <div className="rounded-xl bg-muted p-2">
                        <div className="text-base font-semibold">{latestParentPacketImport.summary.updatedCount}</div>
                        <div className="text-[11px] text-muted-foreground">updated</div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {latestParentPacketImport.summary.files.slice(0, 5).map((fileSummary) => (
                        <div key={fileSummary.sourcePath} className="flex items-center justify-between text-xs">
                          <span className="truncate pr-3">{fileSummary.sourcePath}</span>
                          <span className="text-muted-foreground">{fileSummary.entryCount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No parent packet imported yet. Upload the source zip in REACH, then run the admin import from that file.
                  </p>
                )}
              </div>
            </div>

            <BabyOperationalQueue entries={babyEntries} promotionsByEntryId={babyPromotionsByEntryId} />
          </div>
        )}

        <div className="flex gap-1 border-b" data-testid="tab-bar">
          {visibleTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setActiveTab(t.key);
                setShowForm(false);
                setEditingId(null);
              }}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`tab-${t.key}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {(showForm || editingId !== null) && (
          <div className="bg-card border rounded-2xl p-6 shadow-sm" data-testid="entry-form-panel">
            <h2 className="text-lg font-semibold mb-5">
              {editingId !== null ? (activeTab === "baby" ? "Edit Baby Note" : "Edit Entry") : activeTabCopy.formTitle}
            </h2>
            <EntryForm
              tab={activeTab}
              initial={
                editingEntry
                  ? {
                      name: editingEntry.name,
                      tags: (editingEntry.tags as string[]) ?? [],
                      impactLevel: editingEntry.impactLevel ?? null,
                      reviewWindow: editingEntry.reviewWindow ?? null,
                      dueDate: editingEntry.dueDate ?? null,
                      notes: editingEntry.notes ?? null,
                      amount: editingEntry.amount ?? null,
                      currency: editingEntry.currency ?? null,
                      isEssential: editingEntry.isEssential ?? null,
                      billingCycle: editingEntry.billingCycle ?? null,
                    }
                  : EMPTY_FORM
              }
              onSave={(data) => {
                if (editingId !== null) handleUpdate(editingId, data);
                else handleCreate(data);
              }}
              onCancel={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              isSaving={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : activeTab === "baby" && entries && entries.length > 0 ? (
          <BabyReviewBoard
            entries={filteredBabyEntries}
            filter={babyFilter}
            groupBy={babyGroupBy}
            search={babySearch}
            editingId={editingId}
            selectedEntryIds={selectedBabyEntryIds}
            collapsedGroupKeys={collapsedBabyGroups}
            bulkTagInput={bulkTagInput}
            promotionsByEntryId={babyPromotionsByEntryId}
            promotingKey={promotingKey}
            onFilterChange={setBabyFilter}
            onGroupByChange={setBabyGroupBy}
            onSearchChange={setBabySearch}
            onToggleSelectAllVisible={() => {
              const visibleIds = filteredBabyEntries
                .filter((entry) => entry.id !== editingId)
                .map((entry) => entry.id);
              const allSelected =
                visibleIds.length > 0 && visibleIds.every((entryId) => selectedBabyEntryIds.includes(entryId));
              setSelectedBabyEntryIds((current) =>
                allSelected
                  ? current.filter((entryId) => !visibleIds.includes(entryId))
                  : Array.from(new Set([...current, ...visibleIds])),
              );
            }}
            onToggleEntrySelected={(entryId) =>
              setSelectedBabyEntryIds((current) =>
                current.includes(entryId) ? current.filter((value) => value !== entryId) : [...current, entryId],
              )
            }
            onToggleGroupCollapsed={(groupKey) =>
              setCollapsedBabyGroups((current) =>
                current.includes(groupKey) ? current.filter((value) => value !== groupKey) : [...current, groupKey],
              )
            }
            onBulkTagInputChange={setBulkTagInput}
            onBulkVerify={() => handleBulkBabyUpdate("mark-verified")}
            onBulkAddTag={() => handleBulkBabyUpdate("add-tag", bulkTagInput)}
            onBulkRemoveTag={() => handleBulkBabyUpdate("remove-tag", bulkTagInput)}
            onEdit={(id) => { setShowForm(false); setEditingId(id); }}
            onDelete={handleDelete}
            onPromoteToSurface={handlePromoteToSurface}
          />
        ) : entries && entries.length > 0 ? (
          <TabTable
            tab={activeTab}
            entries={entries}
            editingId={editingId}
            onEdit={(id) => { setShowForm(false); setEditingId(id); }}
            onDelete={handleDelete}
          />
        ) : !showForm ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground">{activeTabCopy.empty}</p>
            <Button variant="outline" className="mt-4" onClick={() => setShowForm(true)} data-testid="button-empty-new-entry">
              <Plus className="w-4 h-4 mr-2" /> {activeTab === "baby" ? "Add first note" : "Add first entry"}
            </Button>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
