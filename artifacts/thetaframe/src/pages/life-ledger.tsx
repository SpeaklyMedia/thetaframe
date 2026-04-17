import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { AIDraftReviewPanel } from "@/components/shell/AIDraftReviewPanel";
import { LaneHero } from "@/components/shell/LaneHero";
import { CalendarLinkStatusCard } from "@/components/shell/CalendarLinkStatusCard";
import { MobileIntegrationStatusCard } from "@/components/shell/MobileIntegrationStatusCard";
import { SupportRail } from "@/components/shell/SupportRail";
import {
  type AIDraft,
  ApiError,
  useListAiDrafts,
  useApplyAiDraft,
  useListLifeLedgerEntries,
  useCreateLifeLedgerEntry,
  useUpdateLifeLedgerEntry,
  useDeleteLifeLedgerEntry,
  useUpdateLifeLedgerEventExecutionState,
  useUpdateLifeLedgerEventReminderPolicy,
  useUpdateAiDraftReviewState,
  useGetNext90Days,
  useGetLifeLedgerEventReminderQueue,
  useGetMobileDevices,
  useGetMobileNotificationsOutbox,
  useRegisterMobileDevice,
  useDeactivateMobileDevice,
  useSimulateDispatchMobileNotificationOutboxItem,
  useGetSubscriptionAudit,
  getListLifeLedgerEntriesQueryKey,
  getGetNext90DaysQueryKey,
  getGetLifeLedgerEventReminderQueueQueryKey,
  getGetMobileDevicesQueryKey,
  getGetMobileNotificationsOutboxQueryKey,
  getGetSubscriptionAuditQueryKey,
  getGetDailyFrameQueryKey,
  getListAiDraftsQueryKey,
  getGetWeeklyFrameQueryKey,
  getGetVisionFrameQueryKey,
  LifeLedgerEntry,
  LifeLedgerEntryBody,
  LifeLedgerEntryBodyImpactLevel,
  LifeLedgerEntryBodyReviewWindow,
  LifeLedgerEntryBodyBillingCycle,
  useListAdminUsers,
  type AdminUser,
  type LifeLedgerEventReminderQueueItem,
  type MobileDevice,
  type MobileNotificationOutboxItem,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { HorizontalOverflowSelector } from "@/components/ui/horizontal-overflow-selector";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  BABY_KB_ASSIGNMENTS_QUERY_KEY,
  BABY_KB_HERO_ROLLUPS_QUERY_KEY,
  useParentPacketImports,
  useParentPacketMaterializations,
  useBabyKbPromotions,
  useBabyKbAssignments,
  useCreateBabyKbPromotion,
  useCreateBabyKbAssignment,
  useCreateBabyKbAssignmentSuggestion,
  useBulkUpdateBabyKbEntries,
  useUpdateBabyKbAssignment,
  useBabyKbHeroRollups,
  type BabyKbPromotion,
  type BabyKbAssignment,
  type BabyKbAssignmentCadence,
  type BabyKbAssignmentLifecycleState,
  type BabyKbAssignmentProjectionPolicy,
  type ParentPacketMaterialization,
} from "@/hooks/use-parent-packet-imports";
import { useToast } from "@/hooks/use-toast";
import {
  babyAssignmentAIDraftListParams,
  getBabyAssignmentAIDraftReviewPanelCopy,
  getLifeLedgerAIDraftListParams,
  getLifeLedgerAIDraftReviewPanelCopy,
  type LifeLedgerDraftSurfaceKey,
} from "@/lib/ai-draft-review";
import { getMondayOfCurrentWeek, getTodayDateString } from "@/lib/dates";
import { lifeLedgerEventsCalendarPlaceholder } from "@/lib/calendar-placeholders";
import { lifeLedgerEventsMobilePlaceholder } from "@/lib/mobile-placeholders";
import { BabyHeroConsequencesCard } from "@/components/shell/BabyHeroConsequencesCard";

type Tab = "people" | "events" | "financial" | "subscriptions" | "travel" | "baby";
type BabyReviewFilter = "all" | "framework" | "planning" | "reference" | "must-verify" | "verified";
type BabyGroupBy = "source" | "phase" | "none";
type BabyOperationalState = "needs-review" | "ready-to-assign" | "scheduled" | "due-soon" | "in-motion";
type BabyTimelineBucket = "today" | "next-7-days" | "next-30-days" | "later";
type BabyManualPromotionSurface = "daily" | "weekly" | "vision";
type EventExecutionGroupKey = "due_soon" | "scheduled" | "in_motion" | "completed";
type EventExecutionAction = "mark_scheduled" | "mark_in_motion" | "mark_completed" | "mark_superseded";

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
  events: "Projected to Events",
};
const BABY_PROMOTION_BUTTON_LABELS: Record<BabyKbPromotion["targetSurface"], string> = {
  daily: "Promote to Daily",
  weekly: "Promote to Weekly",
  vision: "Promote to Vision",
  events: "Projected to Events",
};
const EVENT_GROUP_LABELS: Record<EventExecutionGroupKey, string> = {
  due_soon: "Due Soon",
  scheduled: "Scheduled",
  in_motion: "In Motion",
  completed: "Completed / Superseded",
};
const EVENT_GROUP_DESCRIPTIONS: Record<EventExecutionGroupKey, string> = {
  due_soon: "Active event work that needs attention now or in the next 48 hours.",
  scheduled: "Future dated obligations and commitments that are already projected into Events.",
  in_motion: "Event work already underway and still visible in the execution lane.",
  completed: "Finished or superseded event work kept for durable traceability.",
};
const EVENT_REMINDER_PRESETS: Array<{ label: string; leadDays: number[]; testIdSuffix: string }> = [
  { label: "7 / 2 / 0", leadDays: [7, 2, 0], testIdSuffix: "720" },
  { label: "2 / 0", leadDays: [2, 0], testIdSuffix: "20" },
  { label: "Day of", leadDays: [0], testIdSuffix: "0" },
];
const MOBILE_SIMULATOR_INSTALLATION_STORAGE_KEYS: Record<Extract<MobileDevice["platform"], "ios" | "android">, string> = {
  ios: "thetaframe-mobile-simulator-installation-id-ios",
  android: "thetaframe-mobile-simulator-installation-id-android",
};
const BABY_OPERATIONAL_STATE_LABELS: Record<BabyOperationalState, string> = {
  "needs-review": "Needs review",
  "ready-to-assign": "Ready to assign",
  scheduled: "Scheduled",
  "due-soon": "Due soon",
  "in-motion": "In motion",
};
const BABY_OPERATIONAL_STATE_DESCRIPTIONS: Record<BabyOperationalState, string> = {
  "needs-review": "Framework items that still need a trust check before they should steer live planning.",
  "ready-to-assign": "Items that are verified enough to assign to a real account and rolling timeline.",
  scheduled: "Items assigned with a dated event, but not yet close enough to require immediate attention.",
  "due-soon": "Assigned items with a due date inside the immediate planning window.",
  "in-motion": "Items already underway for the assigned account and active inside the system.",
};
const BABY_TIMELINE_BUCKET_LABELS: Record<BabyTimelineBucket, string> = {
  today: "Today",
  "next-7-days": "Next 7 Days",
  "next-30-days": "Next 30 Days",
  later: "Later",
};
const BABY_ASSIGNMENT_LIFECYCLE_LABELS: Record<BabyKbAssignmentLifecycleState, string> = {
  captured: "Captured",
  verified: "Verified",
  assigned: "Assigned",
  scheduled: "Scheduled",
  due_soon: "Due soon",
  in_motion: "In motion",
  completed: "Completed",
  superseded: "Superseded",
};
const BABY_ASSIGNMENT_CADENCE_OPTIONS: Array<{ value: BabyKbAssignmentCadence; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];
const BABY_ASSIGNMENT_PROJECTION_OPTIONS: Array<{ value: BabyKbAssignmentProjectionPolicy; label: string }> = [
  { value: "hold", label: "Hold in Baby KB only" },
  { value: "event_only", label: "Project to Events" },
  { value: "event_and_heroes", label: "Project to Events + hero consequences" },
];

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

function humanizeToken(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;
  return cleaned.replace(/\b\w/g, (match) => match.toUpperCase());
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

function deriveBabyEntryTitle(entry: LifeLedgerEntry, materialization?: ParentPacketMaterialization): string {
  if (entry.name.trim()) {
    return humanizeToken(entry.name.trim()) ?? entry.name.trim();
  }

  const metadata = asRecord(materialization?.metadata);
  const sourceRecordKey = metadataString(metadata, "sourceRecordKey");
  const sourceRecordLeaf = sourceRecordKey?.split("::").reverse().find((segment) => segment.trim());
  const fromMetadata =
    humanizeToken(sourceRecordLeaf) ??
    humanizeToken(metadataString(metadata, "category")) ??
    humanizeToken(metadataString(metadata, "module")) ??
    humanizeToken(metadataString(metadata, "milestoneType")) ??
    humanizeToken(metadataString(metadata, "timingWindow")) ??
    humanizeToken(metadataString(metadata, "phase"));

  if (fromMetadata) {
    return fromMetadata;
  }

  const firstMeaningfulLine = (entry.notes ?? "")
    .split("\n")
    .map((line) => line.trim())
    .find((line) => {
      const match = line.match(/^[A-Za-z /-]+:\s*(.+)$/);
      return Boolean(match?.[1]?.trim());
    });

  const fromNotes = humanizeToken(firstMeaningfulLine?.replace(/^[A-Za-z /-]+:\s*/, ""));
  return fromNotes ?? "Untitled imported note";
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
    name: deriveBabyEntryTitle(entry, materialization),
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

function getInitialLifeLedgerTab(): Tab {
  if (typeof window === "undefined") return "people";
  const rawTab = new URLSearchParams(window.location.search).get("tab");
  return TABS.some((tab) => tab.key === rawTab) ? (rawTab as Tab) : "people";
}

function syncLifeLedgerTabToUrl(tab: Tab) {
  if (typeof window === "undefined") return;
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("tab", tab);
  window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
}

function formatAdminUserLabel(user: AdminUser | null | undefined) {
  if (!user) return "Unknown account";
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
}

function getPromotionTargetHref(surface: BabyKbPromotion["targetSurface"]) {
  if (surface === "daily") return "/daily";
  if (surface === "weekly") return "/weekly";
  if (surface === "vision") return "/vision";
  return "/life-ledger?tab=events";
}

function getPromotionTargetLabel(surface: BabyKbPromotion["targetSurface"]) {
  if (surface === "daily") return "Open Daily";
  if (surface === "weekly") return "Open Weekly";
  if (surface === "vision") return "Open Vision";
  return "Open Events";
}

function getBabyOperationalState(
  entry: BabyReviewEntry,
  promotions: BabyKbPromotion[],
  assignments: BabyKbAssignment[],
): BabyOperationalState {
  const needsReview = entry.contentType === "must-verify" || entry.tagsList.includes("Needs verification");

  if (needsReview) return "needs-review";
  const activeAssignments = assignments.filter((assignment) => assignment.effectiveLifecycleState !== "completed" && assignment.effectiveLifecycleState !== "superseded");
  if (activeAssignments.some((assignment) => assignment.effectiveLifecycleState === "in_motion")) return "in-motion";
  if (activeAssignments.some((assignment) => assignment.effectiveLifecycleState === "due_soon")) return "due-soon";
  if (activeAssignments.some((assignment) => assignment.effectiveLifecycleState === "scheduled")) return "scheduled";
  if (activeAssignments.length === 0 && promotions.some((promotion) => promotion.targetSurface === "events")) return "scheduled";
  if (activeAssignments.length === 0 && promotions.length === 0) return "ready-to-assign";
  return "in-motion";
}

function getBabyActionSummary(entry: BabyReviewEntry, promotions: BabyKbPromotion[], assignments: BabyKbAssignment[]) {
  const state = getBabyOperationalState(entry, promotions, assignments);
  const source = entry.sourceLabel ? `from ${entry.sourceLabel}` : "from Baby KB";

  if (state === "needs-review") {
    return `${source}. Review this framework item before it starts shaping a live Daily, Weekly, or Vision lane.`;
  }

  if (state === "ready-to-assign") {
    return `${source}. This item is verified enough to assign to a real account and schedule into Life Ledger Events.`;
  }

  if (state === "scheduled") {
    return `${source}. This item has an assigned rolling event and is now staged for future planning surfaces.`;
  }

  if (state === "due-soon") {
    return `${source}. This item is within the immediate planning window and should show up in Events plus Daily or Weekly hero consequences.`;
  }

  const linkedSurfaces = Array.from(new Set(promotions.map((promotion) => BABY_PROMOTION_BADGE_LABELS[promotion.targetSurface].replace(/^(Promoted|Projected) to /, ""))));
  const linkedSummary = linkedSurfaces.length > 0 ? linkedSurfaces.join(", ") : "the assigned account";
  return `${source}. This item is already active in ${linkedSummary} and can still be reviewed here without overwriting those live copies.`;
}

function BabyOperationalQueue({
  entries,
  promotionsByEntryId,
  assignmentsByEntryId,
  usersById,
}: {
  entries: BabyReviewEntry[];
  promotionsByEntryId: Map<number, BabyKbPromotion[]>;
  assignmentsByEntryId: Map<number, BabyKbAssignment[]>;
  usersById: Map<string, AdminUser>;
}) {
  const groups = new Map<BabyOperationalState, BabyReviewEntry[]>(
    (Object.keys(BABY_OPERATIONAL_STATE_LABELS) as BabyOperationalState[]).map((state) => [state, []]),
  );

  for (const entry of entries) {
    const state = getBabyOperationalState(entry, promotionsByEntryId.get(entry.id) ?? [], assignmentsByEntryId.get(entry.id) ?? []);
    groups.set(state, [...(groups.get(state) ?? []), entry]);
  }

  const assignments = Array.from(assignmentsByEntryId.values()).flat();
  const timelineGroups = new Map<BabyTimelineBucket, BabyKbAssignment[]>(
    (Object.keys(BABY_TIMELINE_BUCKET_LABELS) as BabyTimelineBucket[]).map((bucket) => [bucket, []]),
  );

  for (const assignment of assignments) {
    if (!assignment.dueDate || assignment.effectiveLifecycleState === "completed" || assignment.effectiveLifecycleState === "superseded") continue;
    const today = new Date().toISOString().slice(0, 10);
    const nextSeven = (() => {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() + 7);
      return date.toISOString().slice(0, 10);
    })();
    const nextThirty = (() => {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() + 30);
      return date.toISOString().slice(0, 10);
    })();

    const bucket: BabyTimelineBucket =
      assignment.dueDate <= today
        ? "today"
        : assignment.dueDate <= nextSeven
          ? "next-7-days"
          : assignment.dueDate <= nextThirty
            ? "next-30-days"
            : "later";
    timelineGroups.set(bucket, [...(timelineGroups.get(bucket) ?? []), assignment]);
  }

  return (
    <div className="space-y-4" data-testid="baby-kb-operational-queue">
      <div className="grid gap-4 md:grid-cols-5">
        {(Object.keys(BABY_OPERATIONAL_STATE_LABELS) as BabyOperationalState[]).map((state) => {
          const count = (groups.get(state) ?? []).length;
          return (
            <div key={state} className="rounded-2xl border bg-card p-4 shadow-sm space-y-1" data-testid={`baby-kb-summary-${state}`}>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{BABY_OPERATIONAL_STATE_LABELS[state]}</div>
              <div className="text-2xl font-semibold">{count}</div>
              <p className="text-xs text-muted-foreground">{BABY_OPERATIONAL_STATE_DESCRIPTIONS[state]}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4" data-testid="baby-kb-rolling-timeline">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">Rolling timeline</h2>
          <p className="text-sm text-muted-foreground">
            Assigned Baby KB items stay here as an admin timeline, then project into Events and hero consequence surfaces for the assignee.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          {(Object.keys(BABY_TIMELINE_BUCKET_LABELS) as BabyTimelineBucket[]).map((bucket) => {
            const bucketAssignments = (timelineGroups.get(bucket) ?? []).sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));

            return (
              <section key={bucket} className="rounded-xl border bg-muted/20 p-4 space-y-3" data-testid={`baby-kb-timeline-${bucket}`}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">{BABY_TIMELINE_BUCKET_LABELS[bucket]}</h3>
                  <span className="rounded-full bg-background px-2 py-0.5 text-[11px] text-muted-foreground">{bucketAssignments.length}</span>
                </div>

                {bucketAssignments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No assigned items in this window.</p>
                ) : (
                  <div className="space-y-2">
                    {bucketAssignments.slice(0, 4).map((assignment) => (
                      <div key={assignment.id} className="rounded-lg border bg-background/80 p-3 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium truncate">{assignment.sourceEntryName ?? "Baby KB item"}</div>
                          <span className="font-mono text-[11px] text-muted-foreground">{assignment.dueDate}</span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{formatAdminUserLabel(usersById.get(assignment.assigneeUserId))}</div>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                            {BABY_ASSIGNMENT_LIFECYCLE_LABELS[assignment.effectiveLifecycleState]}
                          </span>
                          {assignment.cadence ? (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground capitalize">
                              {assignment.cadence}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                    {bucketAssignments.length > 4 ? (
                      <div className="text-xs text-muted-foreground">+{bucketAssignments.length - 4} more assigned items</div>
                    ) : null}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>

      <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">Items in Motion</h2>
        <p className="text-sm text-muted-foreground">
          Use Baby KB as the parenting review and source-truth lane, then assign the right items to real accounts and project them into Events plus hero consequence surfaces.
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
                    const assignmentsForEntry = assignmentsByEntryId.get(entry.id) ?? [];
                    return (
                      <div key={entry.id} className="rounded-lg border bg-background/80 p-3 space-y-2">
                        <div className="text-sm font-medium">{entry.name || "Untitled imported note"}</div>
                        <p className="text-xs text-muted-foreground">{getBabyActionSummary(entry, promotions, assignmentsForEntry)}</p>
                        {assignmentsForEntry.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {assignmentsForEntry.slice(0, 2).map((assignment) => (
                              <span key={assignment.id} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                {formatAdminUserLabel(usersById.get(assignment.assigneeUserId))} · {BABY_ASSIGNMENT_LIFECYCLE_LABELS[assignment.effectiveLifecycleState]}
                              </span>
                            ))}
                          </div>
                        ) : null}
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

function getEventExecutionDate(entry: LifeLedgerEntry): string | null {
  return entry.nextDueDate ?? entry.dueDate ?? null;
}

function getDateDaysFromTodayLocal(offsetDays: number): string {
  const next = new Date();
  next.setUTCDate(next.getUTCDate() + offsetDays);
  return next.toISOString().slice(0, 10);
}

function getEventExecutionGroup(entry: LifeLedgerEntry): EventExecutionGroupKey {
  if (entry.completionState === "completed" || entry.completionState === "superseded") {
    return "completed";
  }

  if (entry.completionState === "in_motion") {
    return "in_motion";
  }

  const executionDate = getEventExecutionDate(entry);
  if (executionDate && executionDate <= getDateDaysFromTodayLocal(2)) {
    return "due_soon";
  }

  return "scheduled";
}

function formatEventStateLabel(entry: LifeLedgerEntry): string {
  const explicit = entry.completionState;
  if (explicit === "completed" || explicit === "superseded" || explicit === "in_motion") {
    return explicit.replace(/_/g, " ");
  }
  return getEventExecutionGroup(entry) === "due_soon" ? "due soon" : "scheduled";
}

function formatReminderTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function isReminderDueNow(value: string): boolean {
  const reminderAt = new Date(value).getTime();
  if (Number.isNaN(reminderAt)) return false;
  return reminderAt <= Date.now() + 24 * 60 * 60 * 1000;
}

function getMobileSimulatorInstallationId(platform: Extract<MobileDevice["platform"], "ios" | "android">): string {
  const storageKey = MOBILE_SIMULATOR_INSTALLATION_STORAGE_KEYS[platform];

  if (typeof window === "undefined") {
    return `${platform}-simulator-server-fallback`;
  }

  const existingValue = window.localStorage.getItem(storageKey);
  if (existingValue) {
    return existingValue;
  }

  const generatedValue =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${platform}-${Date.now()}`;
  window.localStorage.setItem(storageKey, generatedValue);
  return generatedValue;
}

function areReminderLeadDaysEqual(left: number[], right: number[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function getEventReminderSummary(entry: LifeLedgerEntry): string {
  if (!entry.reminderEnabled) {
    return "Reminders off";
  }

  const leadSummary = entry.reminderLeadDays.length > 0
    ? `${entry.reminderLeadDays.join(" / ")} day lead`
    : "Reminder on";
  const nextReminder = formatReminderTimestamp(entry.nextReminderAt);
  const stateLabel = entry.reminderState.replace(/_/g, " ");

  return nextReminder ? `${leadSummary} · ${stateLabel} · Next ${nextReminder}` : `${leadSummary} · ${stateLabel}`;
}

function EventExecutionBoard({
  entries,
  editingId,
  onEdit,
  onDelete,
  onRunExecutionAction,
  onUpdateReminderPolicy,
  actionState,
  reminderState,
  actionErrorMessage,
  reminderErrorMessage,
}: {
  entries: LifeLedgerEntry[];
  editingId: number | null;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onRunExecutionAction: (id: number, action: EventExecutionAction) => void;
  onUpdateReminderPolicy: (id: number, leadDays: number[] | null) => void;
  actionState: { id: number; action: EventExecutionAction } | null;
  reminderState: { id: number; leadDays: number[] | null } | null;
  actionErrorMessage?: string | null;
  reminderErrorMessage?: string | null;
}) {
  const grouped = entries.reduce<Record<EventExecutionGroupKey, LifeLedgerEntry[]>>(
    (acc, entry) => {
      acc[getEventExecutionGroup(entry)].push(entry);
      return acc;
    },
    {
      due_soon: [],
      scheduled: [],
      in_motion: [],
      completed: [],
    },
  );

  const orderedGroups: EventExecutionGroupKey[] = ["due_soon", "scheduled", "in_motion", "completed"];

  return (
    <div className="space-y-4" data-testid="events-execution-board">
      {actionErrorMessage ? (
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-3"
          data-testid="events-execution-action-error"
        >
          <p className="text-sm text-destructive">{actionErrorMessage}</p>
        </div>
      ) : null}
      {reminderErrorMessage ? (
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-3"
          data-testid="events-reminder-action-error"
        >
          <p className="text-sm text-destructive">{reminderErrorMessage}</p>
        </div>
      ) : null}
      {orderedGroups.map((group) => {
        const groupEntries = grouped[group];
        if (groupEntries.length === 0) {
          return null;
        }

        return (
          <section key={group} className="space-y-3" data-testid={`events-group-${group}`}>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">{EVENT_GROUP_LABELS[group]}</h2>
                <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                  {groupEntries.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{EVENT_GROUP_DESCRIPTIONS[group]}</p>
            </div>

            <div className="grid gap-3">
              {groupEntries.map((entry) => {
                if (editingId === entry.id) return null;

                const executionDate = getEventExecutionDate(entry);
                const isBabyDerived = entry.sourceType === "baby_kb_assignment";
                const currentState = entry.completionState;
                const isActionPendingForEntry = actionState?.id === entry.id;
                const isReminderPendingForEntry = reminderState?.id === entry.id;
                const canResetToScheduled =
                  currentState === "completed" ||
                  currentState === "superseded" ||
                  currentState === "in_motion";
                const hasExecutionDate = Boolean(executionDate);
                const nextReminderLabel = formatReminderTimestamp(entry.nextReminderAt);

                return (
                  <article
                    key={entry.id}
                    className="rounded-2xl border bg-card p-4 shadow-sm space-y-3"
                    data-testid={`entry-row-${entry.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold truncate">{entry.name}</h3>
                          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground capitalize">
                            {formatEventStateLabel(entry)}
                          </span>
                          {isBabyDerived ? (
                            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] text-primary">
                              Baby-derived
                            </span>
                          ) : (
                            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                              Manual event
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {executionDate ? (
                            <span className="font-mono">Next due: {executionDate}</span>
                          ) : (
                            <span className="font-mono">Next due: undated</span>
                          )}
                          {entry.snoozedUntil ? <span className="font-mono">Snoozed until {entry.snoozedUntil}</span> : null}
                          {entry.sourceAssignmentId ? <span>Assignment #{entry.sourceAssignmentId}</span> : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => onEdit(entry.id)} aria-label="Edit" data-testid={`button-edit-entry-${entry.id}`}>
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDelete(entry.id)} aria-label="Delete" data-testid={`button-delete-entry-${entry.id}`}>
                          <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {entry.tags.map((tag) => (
                        <span key={`${entry.id}-${tag}`} className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                          {tag}
                        </span>
                      ))}
                      {entry.impactLevel ? (
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground capitalize">
                          {entry.impactLevel} impact
                        </span>
                      ) : null}
                      {entry.reviewWindow ? (
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground capitalize">
                          {entry.reviewWindow}
                        </span>
                      ) : null}
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                        {getEventReminderSummary(entry)}
                      </span>
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground capitalize">
                        Reminder {entry.reminderState}
                      </span>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {entry.reminderEnabled ? "Reminders on" : "Reminders off"}
                        </span>
                        {nextReminderLabel ? <span>Next reminder {nextReminderLabel}</span> : null}
                        {!hasExecutionDate ? <span>Add a due date to enable reminders.</span> : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {EVENT_REMINDER_PRESETS.map((preset) => {
                          const isActive = entry.reminderEnabled && areReminderLeadDaysEqual(entry.reminderLeadDays, preset.leadDays);
                          return (
                            <Button
                              key={`${entry.id}-${preset.testIdSuffix}`}
                              variant={isActive ? "default" : "outline"}
                              size="sm"
                              disabled={!hasExecutionDate || isReminderPendingForEntry}
                              onClick={() => onUpdateReminderPolicy(entry.id, preset.leadDays)}
                              data-testid={`button-event-reminder-${preset.testIdSuffix}-${entry.id}`}
                            >
                              {isReminderPendingForEntry && areReminderLeadDaysEqual(reminderState?.leadDays ?? [], preset.leadDays)
                                ? "Saving..."
                                : preset.label}
                            </Button>
                          );
                        })}
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isReminderPendingForEntry || !entry.reminderEnabled}
                          onClick={() => onUpdateReminderPolicy(entry.id, null)}
                          data-testid={`button-event-reminder-clear-${entry.id}`}
                        >
                          {isReminderPendingForEntry && reminderState?.leadDays === null ? "Clearing..." : "Clear"}
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {canResetToScheduled ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isActionPendingForEntry}
                          onClick={() => onRunExecutionAction(entry.id, "mark_scheduled")}
                          data-testid={`button-event-mark-scheduled-${entry.id}`}
                        >
                          {actionState?.action === "mark_scheduled" && isActionPendingForEntry ? "Saving..." : "Back to scheduled"}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isActionPendingForEntry}
                          onClick={() => onRunExecutionAction(entry.id, "mark_in_motion")}
                          data-testid={`button-event-mark-in-motion-${entry.id}`}
                        >
                          {actionState?.action === "mark_in_motion" && isActionPendingForEntry ? "Saving..." : "Mark in motion"}
                        </Button>
                      )}
                      {currentState !== "completed" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isActionPendingForEntry}
                          onClick={() => onRunExecutionAction(entry.id, "mark_completed")}
                          data-testid={`button-event-mark-completed-${entry.id}`}
                        >
                          {actionState?.action === "mark_completed" && isActionPendingForEntry ? "Saving..." : "Complete"}
                        </Button>
                      ) : null}
                      {currentState !== "superseded" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isActionPendingForEntry}
                          onClick={() => onRunExecutionAction(entry.id, "mark_superseded")}
                          data-testid={`button-event-mark-superseded-${entry.id}`}
                        >
                          {actionState?.action === "mark_superseded" && isActionPendingForEntry ? "Saving..." : "Supersede"}
                        </Button>
                      ) : null}
                    </div>

                    {entry.notes ? (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                        {entry.notes}
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
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
  assignmentsByEntryId,
  usersById,
  promotingKey,
  generatingSuggestionEntryId,
  pendingSuggestionEntryIds,
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
  onAssignToAccount,
  onGenerateAssignmentSuggestion,
  onEditAssignment,
  onUpdateAssignmentState,
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
  assignmentsByEntryId: Map<number, BabyKbAssignment[]>;
  usersById: Map<string, AdminUser>;
  promotingKey: string | null;
  generatingSuggestionEntryId: number | null;
  pendingSuggestionEntryIds: Set<number>;
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
  onPromoteToSurface: (entry: BabyReviewEntry, surface: BabyManualPromotionSurface) => void;
  onAssignToAccount: (entry: BabyReviewEntry) => void;
  onGenerateAssignmentSuggestion: (entry: BabyReviewEntry) => void;
  onEditAssignment: (entry: BabyReviewEntry, assignment: BabyKbAssignment) => void;
  onUpdateAssignmentState: (assignment: BabyKbAssignment, lifecycleState: BabyKbAssignmentLifecycleState) => void;
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
                  const assignments = assignmentsByEntryId.get(entry.id) ?? [];
                  const promotedSurfaces = new Set(promotions.map((promotion) => promotion.targetSurface));
                  const hasActiveAssignment = assignments.some(
                    (assignment) => assignment.effectiveLifecycleState !== "completed" && assignment.effectiveLifecycleState !== "superseded",
                  );
                  const canGenerateSuggestion =
                    entry.isVerified
                    && !entry.tagsList.includes("Needs verification")
                    && !hasActiveAssignment
                    && !pendingSuggestionEntryIds.has(entry.id);
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
                            {getBabyActionSummary(entry, promotions, assignments)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {canGenerateSuggestion ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onGenerateAssignmentSuggestion(entry)}
                              disabled={generatingSuggestionEntryId === entry.id}
                              data-testid={`button-generate-baby-assignment-suggestion-${entry.id}`}
                            >
                              {generatingSuggestionEntryId === entry.id ? "Generating..." : "Generate AI assignment suggestion"}
                            </Button>
                          ) : null}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onAssignToAccount(entry)}
                            data-testid={`button-assign-baby-entry-${entry.id}`}
                          >
                            Assign to account
                          </Button>
                          {(["daily", "weekly", "vision"] as BabyManualPromotionSurface[]).map((surface) => {
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

                      {assignments.length > 0 && (
                        <div className="rounded-xl border bg-muted/20 p-3 space-y-3" data-testid={`baby-kb-assignments-${entry.id}`}>
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Assignments</div>
                          <div className="space-y-3">
                            {assignments.map((assignment) => (
                              <div key={assignment.id} className="rounded-lg border bg-background/80 p-3 space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="space-y-1">
                                    <div className="text-sm font-medium">{formatAdminUserLabel(usersById.get(assignment.assigneeUserId))}</div>
                                    <div className="text-xs text-muted-foreground">
                                      Effective {assignment.effectiveDate}
                                      {assignment.dueDate ? ` · due ${assignment.dueDate}` : ""}
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                      {BABY_ASSIGNMENT_LIFECYCLE_LABELS[assignment.effectiveLifecycleState]}
                                    </span>
                                    {assignment.cadence ? (
                                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground capitalize">
                                        {assignment.cadence}
                                      </span>
                                    ) : null}
                                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                      {assignment.projectionPolicy.replace(/_/g, " ")}
                                    </span>
                                  </div>
                                </div>

                                {assignment.assignmentNotes ? (
                                  <p className="text-xs text-muted-foreground">{assignment.assignmentNotes}</p>
                                ) : null}

                                <div className="flex flex-wrap gap-2">
                                  <Button variant="outline" size="sm" onClick={() => onEditAssignment(entry, assignment)}>
                                    Edit
                                  </Button>
                                  {(assignment.effectiveLifecycleState === "assigned" || assignment.effectiveLifecycleState === "scheduled" || assignment.effectiveLifecycleState === "due_soon") ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => onUpdateAssignmentState(assignment, "in_motion")}
                                      data-testid={`button-mark-in-motion-${assignment.id}`}
                                    >
                                      Mark in motion
                                    </Button>
                                  ) : null}
                                  {assignment.effectiveLifecycleState === "assigned" ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => onUpdateAssignmentState(assignment, "scheduled")}
                                      data-testid={`button-schedule-baby-assignment-${assignment.id}`}
                                    >
                                      Schedule event
                                    </Button>
                                  ) : null}
                                  {(assignment.effectiveLifecycleState === "scheduled" || assignment.effectiveLifecycleState === "due_soon" || assignment.effectiveLifecycleState === "in_motion") ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => onUpdateAssignmentState(assignment, "completed")}
                                      data-testid={`button-complete-baby-assignment-${assignment.id}`}
                                    >
                                      Complete
                                    </Button>
                                  ) : null}
                                  {(assignment.effectiveLifecycleState === "assigned" || assignment.effectiveLifecycleState === "scheduled" || assignment.effectiveLifecycleState === "due_soon" || assignment.effectiveLifecycleState === "in_motion") ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onUpdateAssignmentState(assignment, "superseded")}
                                      data-testid={`button-supersede-baby-assignment-${assignment.id}`}
                                    >
                                      Supersede
                                    </Button>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
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

function EventReminderReturnCard({
  items,
  entries,
  onRunExecutionAction,
  actionState,
}: {
  items: LifeLedgerEventReminderQueueItem[];
  entries: LifeLedgerEntry[];
  onRunExecutionAction: (id: number, action: EventExecutionAction) => void;
  actionState: { id: number; action: EventExecutionAction } | null;
}) {
  const entryById = new Map(entries.map((entry) => [entry.id, entry]));
  const nextReminderLabel = items[0]?.nextReminderAt ? formatReminderTimestamp(items[0].nextReminderAt) : null;
  const dueNowItems = items.filter((item) => isReminderDueNow(item.nextReminderAt));
  const comingUpItems = items.filter((item) => !isReminderDueNow(item.nextReminderAt));
  const statusLabel = items.length > 0 ? "Reminder queue active" : "Reminder queue ready";
  const dynamicChips = [
    ...lifeLedgerEventsMobilePlaceholder.chips,
    `Active reminders: ${items.length}`,
    `Due now: ${dueNowItems.length}`,
    `Coming up: ${comingUpItems.length}`,
    nextReminderLabel ? `Next reminder: ${nextReminderLabel}` : "Next reminder: none",
  ];

  const renderQueueRow = (item: LifeLedgerEventReminderQueueItem) => {
    const linkedEntry = entryById.get(item.id);
    const currentState = linkedEntry?.completionState;
    const canResetToScheduled =
      currentState === "completed" ||
      currentState === "superseded" ||
      currentState === "in_motion";
    const isActionPendingForEntry = actionState?.id === item.id;

    return (
      <div
        key={item.id}
        className="rounded-lg border border-border/50 bg-background/80 px-3 py-3 text-sm space-y-3"
        data-testid={`mobile-reminder-preview-${item.id}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-medium">{item.name}</p>
              <span className="rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground capitalize">
                {item.reminderState.replace(/_/g, " ")}
              </span>
              <span className="rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                {item.sourceType === "baby_kb_assignment" ? "Baby-derived" : "Manual event"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {item.reminderLeadDays.join(" / ")} day lead · next {formatReminderTimestamp(item.nextReminderAt) ?? item.nextReminderAt}
            </p>
            <p className="text-xs text-muted-foreground">
              Executes {item.executionDate}
              {linkedEntry ? ` · state ${formatEventStateLabel(linkedEntry)}` : " · route-ready item"}
            </p>
          </div>
          <Link href={item.route} className="inline-flex items-center gap-1 text-xs font-medium text-primary shrink-0">
            Open Events
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {linkedEntry ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isActionPendingForEntry}
              onClick={() => onRunExecutionAction(item.id, canResetToScheduled ? "mark_scheduled" : "mark_in_motion")}
              data-testid={`button-reminder-queue-toggle-state-${item.id}`}
            >
              {isActionPendingForEntry && actionState?.action === (canResetToScheduled ? "mark_scheduled" : "mark_in_motion")
                ? "Saving..."
                : canResetToScheduled
                  ? "Back to scheduled"
                  : "Mark in motion"}
            </Button>
            {currentState !== "completed" ? (
              <Button
                variant="outline"
                size="sm"
                disabled={isActionPendingForEntry}
                onClick={() => onRunExecutionAction(item.id, "mark_completed")}
                data-testid={`button-reminder-queue-complete-${item.id}`}
              >
                {isActionPendingForEntry && actionState?.action === "mark_completed" ? "Saving..." : "Complete"}
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            This reminder item is route-ready, but its matching event row is not loaded for inline actions right now.
          </div>
        )}
      </div>
    );
  };

  return (
    <MobileIntegrationStatusCard
      mode={lifeLedgerEventsMobilePlaceholder.mode}
      statusLabel={statusLabel}
      title={lifeLedgerEventsMobilePlaceholder.title}
      description={lifeLedgerEventsMobilePlaceholder.description}
      chips={dynamicChips}
      note={lifeLedgerEventsMobilePlaceholder.note}
      data-testid="mobile-placeholder-life-ledger-events"
    >
      <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">Reminder-return queue</p>
            <p className="text-xs text-muted-foreground">
              {items.length > 0
                ? `The next reminder-active event will surface here at ${nextReminderLabel ?? "the scheduled reminder time"}, and you can act on it without leaving Events.`
                : "No reminder-active events are waiting to return right now."}
            </p>
          </div>
          <Link href="/life-ledger?tab=events" className="inline-flex items-center gap-1 text-xs font-medium text-primary">
            Open Events
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {items.length > 0 ? (
          <div className="space-y-4" data-testid="events-reminder-queue-surface">
            <section className="space-y-2" data-testid="events-reminder-queue-due-now">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Due Now</p>
                  <p className="text-xs text-muted-foreground">Overdue or due to remind within the next 24 hours.</p>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">{dueNowItems.length}</span>
              </div>
              {dueNowItems.length > 0 ? (
                <div className="space-y-2">
                  {dueNowItems.map(renderQueueRow)}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-xs text-muted-foreground">
                  Nothing is due now. The next reminder-active items are staged below.
                </div>
              )}
            </section>

            <section className="space-y-2" data-testid="events-reminder-queue-coming-up">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Coming Up</p>
                  <p className="text-xs text-muted-foreground">Reminder-active items scheduled beyond the next 24 hours.</p>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">{comingUpItems.length}</span>
              </div>
              {comingUpItems.length > 0 ? (
                <div className="space-y-2">
                  {comingUpItems.map(renderQueueRow)}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-xs text-muted-foreground">
                  No additional reminder-active items are queued after the due-now window.
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-xs text-muted-foreground">
            Add or enable reminders on Events to populate the mobile return queue.
          </div>
        )}
      </div>
    </MobileIntegrationStatusCard>
  );
}

function EventReminderDeliveryStatusBlock({
  queueItems,
  outboxItems,
  devices,
  onRegisterDevice,
  onDeactivateDevice,
  onDispatchNextQueuedReminder,
  registrationPlatform,
  deactivatingDeviceId,
  dispatchingOutboxId,
  errorMessage,
}: {
  queueItems: LifeLedgerEventReminderQueueItem[];
  outboxItems: MobileNotificationOutboxItem[];
  devices: MobileDevice[];
  onRegisterDevice: (platform: Extract<MobileDevice["platform"], "ios" | "android">) => void;
  onDeactivateDevice: (deviceId: number) => void;
  onDispatchNextQueuedReminder: (outboxId: number) => void;
  registrationPlatform: Extract<MobileDevice["platform"], "ios" | "android"> | null;
  deactivatingDeviceId: number | null;
  dispatchingOutboxId: number | null;
  errorMessage: string | null;
}) {
  const queuedItems = outboxItems.filter((item) => item.deliveryStatus === "queued");
  const dueNowItems = queueItems.filter((item) => isReminderDueNow(item.nextReminderAt));
  const queuedDueNowIds = new Set(queuedItems.map((item) => item.sourceEventId));
  const dueNowQueuedCount = dueNowItems.filter((item) => queuedDueNowIds.has(item.id)).length;
  const dueNowLocalOnlyCount = Math.max(0, dueNowItems.length - dueNowQueuedCount);
  const activeDevices = devices.filter((device) => device.isActive);
  const mostRecentActiveDevice = activeDevices[0];
  const nextQueuedItem = queuedItems[0] ?? null;
  const mostRecentSent = [...outboxItems]
    .filter((item) => item.sentAt)
    .sort((left, right) => (right.sentAt ?? "").localeCompare(left.sentAt ?? ""))[0];
  const mostRecentDispatchedItem = [...outboxItems]
    .filter((item) => item.sentAt && item.deliveredDeviceLabel)
    .sort((left, right) => (right.sentAt ?? "").localeCompare(left.sentAt ?? ""))[0];

  return (
    <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-3" data-testid="events-delivery-status-block">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">Reminder delivery status</h2>
          <p className="text-xs text-muted-foreground">
            ThetaFrame is now keeping a durable delivery outbox for `life_ledger_due` reminders before native mobile transport exists.
          </p>
        </div>
        <Link href="/life-ledger?tab=events" className="inline-flex items-center gap-1 text-xs font-medium text-primary">
          Open Events
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
          Queued deliveries: {queuedItems.length}
        </span>
        <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
          Due-now queued: {dueNowQueuedCount}
        </span>
        <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
          Due-now local only: {dueNowLocalOnlyCount}
        </span>
        <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
          Active devices: {activeDevices.length}
        </span>
        <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
          Most recent sent: {mostRecentSent?.sentAt ? formatReminderTimestamp(mostRecentSent.sentAt) ?? mostRecentSent.sentAt : "none"}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Queued</p>
          <p className="mt-1 text-xl font-semibold">{queuedItems.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Reminder deliveries waiting for transport or simulation.</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Due-now coverage</p>
          <p className="mt-1 text-xl font-semibold">{dueNowQueuedCount}/{dueNowItems.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Due-now reminders that already have queued delivery rows.</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Most recent sent</p>
          <p className="mt-1 text-sm font-medium truncate">{mostRecentSent?.eventName ?? "No sent deliveries yet"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {mostRecentSent?.sentAt ? `Sent ${formatReminderTimestamp(mostRecentSent.sentAt) ?? mostRecentSent.sentAt}` : "Sent state will appear here once a queued delivery is marked sent."}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3" data-testid="events-mobile-delivery-simulator">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">Mobile Delivery Simulator</p>
            <p className="text-xs text-muted-foreground">
              Register a simulated iPhone or Android endpoint, then dispatch the next queued reminder through the current outbox.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={registrationPlatform !== null}
              onClick={() => onRegisterDevice("ios")}
              data-testid="button-register-mobile-device-ios"
            >
              {registrationPlatform === "ios" ? "Registering..." : "Register iPhone"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={registrationPlatform !== null}
              onClick={() => onRegisterDevice("android")}
              data-testid="button-register-mobile-device-android"
            >
              {registrationPlatform === "android" ? "Registering..." : "Register Android"}
            </Button>
            <Button
              size="sm"
              disabled={!nextQueuedItem || dispatchingOutboxId !== null}
              onClick={() => nextQueuedItem && onDispatchNextQueuedReminder(nextQueuedItem.id)}
              data-testid="button-dispatch-next-queued-reminder"
            >
              {dispatchingOutboxId === nextQueuedItem?.id ? "Dispatching..." : "Dispatch next queued reminder"}
            </Button>
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive" data-testid="events-mobile-delivery-simulator-error">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-background/80 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Registered devices</p>
            <p className="mt-1 text-xl font-semibold">{activeDevices.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {mostRecentActiveDevice
                ? `${mostRecentActiveDevice.deviceLabel} · seen ${formatReminderTimestamp(mostRecentActiveDevice.lastSeenAt) ?? mostRecentActiveDevice.lastSeenAt}`
                : "No active device registered yet."}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/80 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Queued dispatchable</p>
            <p className="mt-1 text-xl font-semibold">{queuedItems.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {nextQueuedItem
                ? `${nextQueuedItem.eventName} · ${formatReminderTimestamp(nextQueuedItem.scheduledFor) ?? nextQueuedItem.scheduledFor}`
                : "No queued reminder is waiting for dispatch right now."}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/80 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Most recent dispatched device</p>
            <p className="mt-1 text-sm font-medium truncate">{mostRecentDispatchedItem?.deliveredDeviceLabel ?? "No simulated dispatch yet"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {mostRecentDispatchedItem?.sentAt
                ? `${mostRecentDispatchedItem.deliveryProvider ?? "provider unknown"} · ${formatReminderTimestamp(mostRecentDispatchedItem.sentAt) ?? mostRecentDispatchedItem.sentAt}`
                : "Once a queued reminder is dispatched, the target device/provider will appear here."}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Active endpoints</p>
          {devices.length > 0 ? (
            <div className="space-y-2">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/80 px-3 py-3 text-sm"
                  data-testid={`mobile-device-row-${device.id}`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{device.deviceLabel}</span>
                      <span className="rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground uppercase">
                        {device.platform}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                        {device.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {device.deliveryProvider} · last seen {formatReminderTimestamp(device.lastSeenAt) ?? device.lastSeenAt}
                    </p>
                  </div>
                  {device.isActive ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={deactivatingDeviceId === device.id}
                      onClick={() => onDeactivateDevice(device.id)}
                      data-testid={`button-deactivate-mobile-device-${device.id}`}
                    >
                      {deactivatingDeviceId === device.id ? "Deactivating..." : "Deactivate"}
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-xs text-muted-foreground">
              Register a simulated device to prove dispatch against the queued reminder outbox.
            </div>
          )}
        </div>
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

function BabyAssignmentDialog({
  open,
  onOpenChange,
  users,
  sourceEntry,
  initialAssignment,
  onSubmit,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: AdminUser[];
  sourceEntry: BabyReviewEntry | null;
  initialAssignment: BabyKbAssignment | null;
  onSubmit: (data: {
    sourceEntryId: number;
    assigneeUserId: string;
    effectiveDate: string;
    dueDate: string | null;
    cadence: BabyKbAssignmentCadence | null;
    projectionPolicy: BabyKbAssignmentProjectionPolicy;
    lifecycleState: BabyKbAssignmentLifecycleState;
    assignmentNotes: string | null;
  }) => void;
  isSaving: boolean;
}) {
  const today = getTodayDateString();
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(today);
  const [dueDate, setDueDate] = useState("");
  const [cadence, setCadence] = useState<BabyKbAssignmentCadence | "">("");
  const [projectionPolicy, setProjectionPolicy] = useState<BabyKbAssignmentProjectionPolicy>("event_and_heroes");
  const [lifecycleState, setLifecycleState] = useState<BabyKbAssignmentLifecycleState>("assigned");
  const [assignmentNotes, setAssignmentNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setAssigneeUserId(initialAssignment?.assigneeUserId ?? "");
    setEffectiveDate(initialAssignment?.effectiveDate ?? today);
    setDueDate(initialAssignment?.dueDate ?? "");
    setCadence(initialAssignment?.cadence ?? "");
    setProjectionPolicy(initialAssignment?.projectionPolicy ?? "event_and_heroes");
    setLifecycleState(initialAssignment?.lifecycleState ?? "assigned");
    setAssignmentNotes(initialAssignment?.assignmentNotes ?? "");
  }, [initialAssignment, open, today]);

  const handleSubmit = () => {
    if (!sourceEntry || !assigneeUserId || !effectiveDate) return;
    onSubmit({
      sourceEntryId: sourceEntry.id,
      assigneeUserId,
      effectiveDate,
      dueDate: dueDate || null,
      cadence: cadence || null,
      projectionPolicy,
      lifecycleState,
      assignmentNotes: assignmentNotes.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="baby-kb-assignment-dialog">
        <DialogHeader>
          <DialogTitle>{initialAssignment ? "Edit Baby KB assignment" : "Assign Baby KB item"}</DialogTitle>
          <DialogDescription>
            {sourceEntry
              ? `Apply "${sourceEntry.name || "Untitled imported note"}" to a real account without breaking Baby KB provenance.`
              : "Choose an account, dates, cadence, and projection behavior for this Baby KB item."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Assignee account</label>
              <select
                value={assigneeUserId}
                onChange={(event) => setAssigneeUserId(event.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                data-testid="select-baby-assignee"
              >
                <option value="">Select an account…</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {formatAdminUserLabel(user)} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Lifecycle state</label>
              <select
                value={lifecycleState}
                onChange={(event) => setLifecycleState(event.target.value as BabyKbAssignmentLifecycleState)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                data-testid="select-baby-lifecycle-state"
              >
                {(["assigned", "scheduled", "in_motion", "completed", "superseded"] as BabyKbAssignmentLifecycleState[]).map((state) => (
                  <option key={state} value={state}>
                    {BABY_ASSIGNMENT_LIFECYCLE_LABELS[state]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Effective date</label>
              <Input type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} data-testid="input-baby-effective-date" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Due date</label>
              <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} data-testid="input-baby-due-date" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Cadence</label>
              <select
                value={cadence}
                onChange={(event) => setCadence(event.target.value as BabyKbAssignmentCadence | "")}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                data-testid="select-baby-cadence"
              >
                <option value="">No recurrence</option>
                {BABY_ASSIGNMENT_CADENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Projection behavior</label>
              <select
                value={projectionPolicy}
                onChange={(event) => setProjectionPolicy(event.target.value as BabyKbAssignmentProjectionPolicy)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                data-testid="select-baby-projection-policy"
              >
                {BABY_ASSIGNMENT_PROJECTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Admin assignment note</label>
            <Textarea
              value={assignmentNotes}
              onChange={(event) => setAssignmentNotes(event.target.value)}
              className="resize-none h-24"
              placeholder="Why is this being assigned now?"
              data-testid="textarea-baby-assignment-notes"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || !sourceEntry || !assigneeUserId || !effectiveDate} data-testid="button-save-baby-assignment">
            {isSaving ? "Saving..." : initialAssignment ? "Update assignment" : "Assign to account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function LifeLedgerPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>(() => getInitialLifeLedgerTab());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [babyFilter, setBabyFilter] = useState<BabyReviewFilter>("all");
  const [babyGroupBy, setBabyGroupBy] = useState<BabyGroupBy>("source");
  const [babySearch, setBabySearch] = useState("");
  const [selectedBabyEntryIds, setSelectedBabyEntryIds] = useState<number[]>([]);
  const [collapsedBabyGroups, setCollapsedBabyGroups] = useState<string[]>([]);
  const [bulkTagInput, setBulkTagInput] = useState("");
  const [promotingKey, setPromotingKey] = useState<string | null>(null);
  const [assignmentEntryId, setAssignmentEntryId] = useState<number | null>(null);
  const [editingAssignmentId, setEditingAssignmentId] = useState<number | null>(null);
  const { isAdmin } = usePermissions();
  const { data: parentPacketImports } = useParentPacketImports(isAdmin);
  const { data: parentPacketMaterializations } = useParentPacketMaterializations(isAdmin);
  const { data: babyKbPromotions } = useBabyKbPromotions(isAdmin);
  const { data: babyKbAssignments } = useBabyKbAssignments(isAdmin);
  const { data: adminUsers } = useListAdminUsers({
    query: { enabled: isAdmin, queryKey: ["admin-users", "baby-kb-assignment"], refetchOnWindowFocus: false },
  });
  const { data: babyHeroRollups } = useBabyKbHeroRollups(true);
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
  const { data: eventReminderQueue } = useGetLifeLedgerEventReminderQueue({
    query: {
      enabled: activeTab === "events",
      queryKey: getGetLifeLedgerEventReminderQueueQueryKey(),
      refetchOnWindowFocus: false,
    },
  });
  const { data: mobileDevices } = useGetMobileDevices({
    query: {
      enabled: activeTab === "events",
      queryKey: getGetMobileDevicesQueryKey(),
      refetchOnWindowFocus: false,
    },
  });
  const { data: mobileNotificationOutbox } = useGetMobileNotificationsOutbox({
    query: {
      enabled: activeTab === "events",
      queryKey: getGetMobileNotificationsOutboxQueryKey(),
      refetchOnWindowFocus: false,
    },
  });

  const createMutation = useCreateLifeLedgerEntry();
  const updateMutation = useUpdateLifeLedgerEntry();
  const deleteMutation = useDeleteLifeLedgerEntry();
  const updateEventExecutionState = useUpdateLifeLedgerEventExecutionState();
  const updateEventReminderPolicy = useUpdateLifeLedgerEventReminderPolicy();
  const registerMobileDeviceMutation = useRegisterMobileDevice();
  const deactivateMobileDeviceMutation = useDeactivateMobileDevice();
  const simulateDispatchMobileNotificationMutation = useSimulateDispatchMobileNotificationOutboxItem();
  const applyAiDraft = useApplyAiDraft();
  const updateAiDraftReviewState = useUpdateAiDraftReviewState();
  const bulkUpdateBabyKbMutation = useBulkUpdateBabyKbEntries();
  const createBabyKbPromotionMutation = useCreateBabyKbPromotion();
  const createBabyKbAssignmentMutation = useCreateBabyKbAssignment();
  const createBabyKbAssignmentSuggestionMutation = useCreateBabyKbAssignmentSuggestion();
  const updateBabyKbAssignmentMutation = useUpdateBabyKbAssignment();
  const { isSurfaceComplete } = useOnboardingProgress();
  const [applyingDraftId, setApplyingDraftId] = useState<number | null>(null);
  const [reviewingDraftId, setReviewingDraftId] = useState<number | null>(null);
  const [draftActionError, setDraftActionError] = useState<string | null>(null);
  const [eventActionState, setEventActionState] = useState<{ id: number; action: EventExecutionAction } | null>(null);
  const [eventActionError, setEventActionError] = useState<string | null>(null);
  const [eventReminderState, setEventReminderState] = useState<{ id: number; leadDays: number[] | null } | null>(null);
  const [eventReminderError, setEventReminderError] = useState<string | null>(null);
  const [mobileSimulatorState, setMobileSimulatorState] = useState<{
    registrationPlatform: Extract<MobileDevice["platform"], "ios" | "android"> | null;
    deactivatingDeviceId: number | null;
    dispatchingOutboxId: number | null;
  }>({
    registrationPlatform: null,
    deactivatingDeviceId: null,
    dispatchingOutboxId: null,
  });
  const [mobileSimulatorError, setMobileSimulatorError] = useState<string | null>(null);
  const [generatingBabySuggestionEntryId, setGeneratingBabySuggestionEntryId] = useState<number | null>(null);

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

  useEffect(() => {
    if (activeTab !== "events") {
      setEventActionState(null);
      setEventActionError(null);
      setEventReminderState(null);
      setEventReminderError(null);
      setMobileSimulatorState({
        registrationPlatform: null,
        deactivatingDeviceId: null,
        dispatchingOutboxId: null,
      });
      setMobileSimulatorError(null);
    }
  }, [activeTab]);

  useEffect(() => {
    syncLifeLedgerTabToUrl(activeTab);
  }, [activeTab]);

  const invalidateTab = (tab: Tab) => {
    queryClient.invalidateQueries({ queryKey: getListLifeLedgerEntriesQueryKey(tab) });
    queryClient.invalidateQueries({ queryKey: getGetNext90DaysQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetLifeLedgerEventReminderQueueQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetMobileDevicesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetMobileNotificationsOutboxQueryKey() });
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

  const babyAssignmentsByEntryId = useMemo(() => {
    const grouped = new Map<number, BabyKbAssignment[]>();
    for (const assignment of babyKbAssignments ?? []) {
      grouped.set(assignment.sourceEntryId, [...(grouped.get(assignment.sourceEntryId) ?? []), assignment]);
    }
    for (const assignments of grouped.values()) {
      assignments.sort((a, b) => (a.dueDate ?? "9999-99-99").localeCompare(b.dueDate ?? "9999-99-99") || b.id - a.id);
    }
    return grouped;
  }, [babyKbAssignments]);

  const adminUsersById = useMemo(() => {
    const next = new Map<string, AdminUser>();
    for (const user of adminUsers ?? []) {
      next.set(user.id, user);
    }
    return next;
  }, [adminUsers]);

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

  const handleEventExecutionAction = async (id: number, action: EventExecutionAction) => {
    setEventActionState({ id, action });
    setEventActionError(null);

    try {
      const updatedEntry = await updateEventExecutionState.mutateAsync({
        id,
        data: { action },
      });

      queryClient.setQueryData(getListLifeLedgerEntriesQueryKey("events"), (current: LifeLedgerEntry[] | undefined) =>
        current?.map((entry) => (entry.id === updatedEntry.id ? updatedEntry : entry)) ?? current,
      );
      queryClient.invalidateQueries({ queryKey: getListLifeLedgerEntriesQueryKey("events") });
      queryClient.invalidateQueries({ queryKey: getGetNext90DaysQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetLifeLedgerEventReminderQueueQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetMobileNotificationsOutboxQueryKey() });
      queryClient.invalidateQueries({ queryKey: BABY_KB_HERO_ROLLUPS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 404) {
          setEventActionError("This event no longer exists. Refresh the events lane and try again.");
        } else if (error.status === 400) {
          setEventActionError("This execution-state update was invalid for the selected event.");
        } else {
          setEventActionError(`Failed to update the event state (HTTP ${error.status}).`);
        }
      } else if (error instanceof Error) {
        setEventActionError(error.message);
      } else {
        setEventActionError("Failed to update the event state.");
      }
    } finally {
      setEventActionState(null);
    }
  };

  const handleEventReminderPolicyUpdate = async (id: number, leadDays: number[] | null) => {
    setEventReminderState({ id, leadDays });
    setEventReminderError(null);

    try {
      const updatedEntry = await updateEventReminderPolicy.mutateAsync({
        id,
        data: {
          enabled: Array.isArray(leadDays) && leadDays.length > 0,
          leadDays: leadDays ?? undefined,
        },
      });

      queryClient.setQueryData(getListLifeLedgerEntriesQueryKey("events"), (current: LifeLedgerEntry[] | undefined) =>
        current?.map((entry) => (entry.id === updatedEntry.id ? updatedEntry : entry)) ?? current,
      );
      queryClient.invalidateQueries({ queryKey: getListLifeLedgerEntriesQueryKey("events") });
      queryClient.invalidateQueries({ queryKey: getGetNext90DaysQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetLifeLedgerEventReminderQueueQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetMobileNotificationsOutboxQueryKey() });
      queryClient.invalidateQueries({ queryKey: BABY_KB_HERO_ROLLUPS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 404) {
          setEventReminderError("This event no longer exists. Refresh the events lane and try again.");
        } else if (error.status === 409) {
          setEventReminderError("Add or restore a due date before enabling reminders for this event.");
        } else if (error.status === 400) {
          setEventReminderError("This reminder update was invalid for the selected event.");
        } else {
          setEventReminderError(`Failed to update the reminder policy (HTTP ${error.status}).`);
        }
      } else if (error instanceof Error) {
        setEventReminderError(error.message);
      } else {
        setEventReminderError("Failed to update the reminder policy.");
      }
    } finally {
      setEventReminderState(null);
    }
  };

  const handleRegisterMobileDevice = async (platform: Extract<MobileDevice["platform"], "ios" | "android">) => {
    setMobileSimulatorState((current) => ({
      ...current,
      registrationPlatform: platform,
    }));
    setMobileSimulatorError(null);

    try {
      await registerMobileDeviceMutation.mutateAsync({
        data: {
          installationId: getMobileSimulatorInstallationId(platform),
          deviceLabel: platform === "ios" ? "Simulated iPhone" : "Simulated Android",
          platform,
        },
      });

      queryClient.invalidateQueries({ queryKey: getGetMobileDevicesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetMobileNotificationsOutboxQueryKey() });
    } catch (error) {
      if (error instanceof ApiError) {
        setMobileSimulatorError(`Failed to register the simulated ${platform} device (HTTP ${error.status}).`);
      } else if (error instanceof Error) {
        setMobileSimulatorError(error.message);
      } else {
        setMobileSimulatorError("Failed to register the simulated mobile device.");
      }
    } finally {
      setMobileSimulatorState((current) => ({
        ...current,
        registrationPlatform: null,
      }));
    }
  };

  const handleDeactivateMobileDevice = async (deviceId: number) => {
    setMobileSimulatorState((current) => ({
      ...current,
      deactivatingDeviceId: deviceId,
    }));
    setMobileSimulatorError(null);

    try {
      await deactivateMobileDeviceMutation.mutateAsync({ id: deviceId });
      queryClient.invalidateQueries({ queryKey: getGetMobileDevicesQueryKey() });
    } catch (error) {
      if (error instanceof ApiError) {
        setMobileSimulatorError(`Failed to deactivate the mobile device (HTTP ${error.status}).`);
      } else if (error instanceof Error) {
        setMobileSimulatorError(error.message);
      } else {
        setMobileSimulatorError("Failed to deactivate the mobile device.");
      }
    } finally {
      setMobileSimulatorState((current) => ({
        ...current,
        deactivatingDeviceId: null,
      }));
    }
  };

  const handleDispatchNextQueuedReminder = async (outboxId: number) => {
    setMobileSimulatorState((current) => ({
      ...current,
      dispatchingOutboxId: outboxId,
    }));
    setMobileSimulatorError(null);

    try {
      await simulateDispatchMobileNotificationMutation.mutateAsync({
        id: outboxId,
        data: {},
      });
      queryClient.invalidateQueries({ queryKey: getGetMobileNotificationsOutboxQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetMobileDevicesQueryKey() });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 409) {
          setMobileSimulatorError("No active mobile device is available for dispatch, or the selected reminder is no longer queued.");
        } else if (error.status === 404) {
          setMobileSimulatorError("That queued reminder no longer exists. Refresh the Events lane and try again.");
        } else {
          setMobileSimulatorError(`Failed to dispatch the queued reminder (HTTP ${error.status}).`);
        }
      } else if (error instanceof Error) {
        setMobileSimulatorError(error.message);
      } else {
        setMobileSimulatorError("Failed to dispatch the queued reminder.");
      }
    } finally {
      setMobileSimulatorState((current) => ({
        ...current,
        dispatchingOutboxId: null,
      }));
    }
  };

  const invalidateBabyKbState = () => {
    invalidateTab("baby");
    queryClient.invalidateQueries({ queryKey: BABY_KB_PROMOTIONS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: BABY_KB_ASSIGNMENTS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: BABY_KB_HERO_ROLLUPS_QUERY_KEY });
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

  const handlePromoteToSurface = (entry: BabyReviewEntry, surface: BabyManualPromotionSurface) => {
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

  const selectedAssignmentEntry = assignmentEntryId === null
    ? null
    : babyEntries.find((entry) => entry.id === assignmentEntryId) ?? null;
  const editingAssignment = editingAssignmentId === null
    ? null
    : (babyKbAssignments ?? []).find((assignment) => assignment.id === editingAssignmentId) ?? null;

  const handleSubmitBabyAssignment = (data: {
    sourceEntryId: number;
    assigneeUserId: string;
    effectiveDate: string;
    dueDate: string | null;
    cadence: BabyKbAssignmentCadence | null;
    projectionPolicy: BabyKbAssignmentProjectionPolicy;
    lifecycleState: BabyKbAssignmentLifecycleState;
    assignmentNotes: string | null;
  }) => {
    const onSuccess = () => {
      invalidateBabyKbState();
      setAssignmentEntryId(null);
      setEditingAssignmentId(null);
      toast({
        title: editingAssignment ? "Assignment updated" : "Baby KB assigned",
        description: editingAssignment
          ? "The Baby KB assignment was updated."
          : "The Baby KB item is now assigned to an account and can roll through Events and hero surfaces.",
      });
    };

    const onError = (error: unknown) => {
      toast({
        title: "Assignment failed",
        description: getErrorMessage(error, "The Baby KB assignment could not be saved."),
        variant: "destructive",
      });
    };

    if (editingAssignment) {
      updateBabyKbAssignmentMutation.mutate(
        {
          id: editingAssignment.id,
          data: {
            assigneeUserId: data.assigneeUserId,
            effectiveDate: data.effectiveDate,
            dueDate: data.dueDate,
            cadence: data.cadence,
            projectionPolicy: data.projectionPolicy,
            lifecycleState: data.lifecycleState,
            assignmentNotes: data.assignmentNotes,
          },
        },
        { onSuccess, onError },
      );
      return;
    }

    createBabyKbAssignmentMutation.mutate(data, { onSuccess, onError });
  };

  const handleUpdateAssignmentState = (assignment: BabyKbAssignment, lifecycleState: BabyKbAssignmentLifecycleState) => {
    updateBabyKbAssignmentMutation.mutate(
      {
        id: assignment.id,
        data: { lifecycleState },
      },
      {
        onSuccess: () => {
          invalidateBabyKbState();
          toast({
            title: "Assignment updated",
            description: `${assignment.sourceEntryName ?? "Baby KB item"} is now ${BABY_ASSIGNMENT_LIFECYCLE_LABELS[lifecycleState].toLowerCase()}.`,
          });
        },
        onError: (error) => {
          toast({
            title: "Assignment update failed",
            description: getErrorMessage(error, "The Baby KB assignment could not be updated."),
            variant: "destructive",
          });
        },
      },
    );
  };

  const editingEntry = entries?.find((e) => e.id === editingId);
  const activeDraftSurfaceKey = activeTab === "baby" ? null : (activeTab as LifeLedgerDraftSurfaceKey);
  const aiDraftListParams = activeTab === "baby"
    ? babyAssignmentAIDraftListParams
    : activeDraftSurfaceKey
      ? getLifeLedgerAIDraftListParams(activeDraftSurfaceKey)
      : undefined;
  const currentAIDraftQueryKey = aiDraftListParams
    ? getListAiDraftsQueryKey(aiDraftListParams)
    : ["life-ledger-ai-drafts-disabled"];
  const {
    data: aiDrafts,
    isLoading: isAIDraftsLoading,
    error: aiDraftsError,
  } = useListAiDrafts(aiDraftListParams, {
    query: {
      enabled: Boolean(aiDraftListParams),
      queryKey: currentAIDraftQueryKey,
      refetchOnWindowFocus: false,
    },
  });
  const lifeLedgerAIDraftReview = activeTab === "baby"
    ? getBabyAssignmentAIDraftReviewPanelCopy()
    : activeDraftSurfaceKey
      ? getLifeLedgerAIDraftReviewPanelCopy(activeDraftSurfaceKey)
      : null;
  const pendingBabySuggestionEntryIds = useMemo(() => {
    if (activeTab !== "baby" || !aiDrafts) return new Set<number>();
    return new Set(
      aiDrafts
        .filter((draft) => draft.reviewState !== "applied" && draft.reviewState !== "rejected")
        .map((draft) => Number((draft.proposedPayload as Record<string, unknown>)?.sourceEntryId))
        .filter((value) => Number.isFinite(value) && value > 0),
    );
  }, [activeTab, aiDrafts]);

  const handleApplyDraft = async (draftId: number) => {
    setApplyingDraftId(draftId);
    setDraftActionError(null);

    try {
      const response = await applyAiDraft.mutateAsync({
        id: draftId,
        data: {},
      });

      if (activeTab === "baby") {
        if (!response.babyAssignment) {
          throw new Error("Baby draft apply response did not include a Baby assignment.");
        }
        queryClient.setQueryData(currentAIDraftQueryKey, (current: AIDraft[] | undefined) =>
          current?.map((draft) => (draft.id === response.draft.id ? response.draft : draft)) ?? current,
        );
        invalidateBabyKbState();
        queryClient.invalidateQueries({ queryKey: currentAIDraftQueryKey });
        toast({
          title: "AI assignment applied",
          description: `${response.babyAssignment.sourceEntryName ?? "Baby KB item"} is now assigned and will project through the existing Baby flow.`,
        });
        return;
      }

      if (!response.lifeLedgerEntry) {
        throw new Error("Life Ledger apply response did not include a durable Life Ledger entry.");
      }

      queryClient.setQueryData(currentAIDraftQueryKey, (current: AIDraft[] | undefined) =>
        current?.map((draft) => (draft.id === response.draft.id ? response.draft : draft)) ?? current,
      );
      invalidateTab(activeTab);
      queryClient.invalidateQueries({ queryKey: currentAIDraftQueryKey });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 409) {
          setDraftActionError("This draft can no longer be applied. Refresh the review panel and try another draft.");
        } else if (error.status === 422) {
          setDraftActionError(
            activeTab === "baby"
              ? "This stored Baby assignment draft no longer matches the assignment contract and could not be applied."
              : activeTab === "people"
              ? "This stored draft payload no longer matches the Life Ledger people contract and could not be applied."
              : activeTab === "financial"
                ? "This stored draft payload no longer matches the Life Ledger financial contract and could not be applied."
                : activeTab === "subscriptions"
                  ? "This stored draft payload no longer matches the Life Ledger subscriptions contract and could not be applied."
                  : activeTab === "travel"
                    ? "This stored draft payload no longer matches the Life Ledger travel contract and could not be applied."
                : "This stored draft payload no longer matches the Life Ledger events contract and could not be applied.",
          );
        } else {
          setDraftActionError(`Failed to apply the draft (HTTP ${error.status}).`);
        }
      } else if (error instanceof Error) {
        setDraftActionError(error.message);
      } else {
        setDraftActionError("Failed to apply the draft.");
      }
    } finally {
      setApplyingDraftId(null);
    }
  };

  const handleReviewStateChange = async (draftId: number, reviewState: "approved" | "rejected") => {
    setReviewingDraftId(draftId);
    setDraftActionError(null);

    try {
      const updatedDraft = await updateAiDraftReviewState.mutateAsync({
        id: draftId,
        data: { reviewState },
      });

      queryClient.setQueryData(currentAIDraftQueryKey, (current: AIDraft[] | undefined) =>
        current?.map((draft) => (draft.id === updatedDraft.id ? updatedDraft : draft)) ?? current,
      );
      queryClient.invalidateQueries({ queryKey: currentAIDraftQueryKey });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 409) {
          setDraftActionError("This draft can no longer be reviewed from the current state.");
        } else {
          setDraftActionError(`Failed to update the draft review state (HTTP ${error.status}).`);
        }
      } else if (error instanceof Error) {
        setDraftActionError(error.message);
      } else {
        setDraftActionError("Failed to update the draft review state.");
      }
    } finally {
      setReviewingDraftId(null);
    }
  };

  const handleGenerateBabyAssignmentSuggestion = (entry: BabyReviewEntry) => {
    setGeneratingBabySuggestionEntryId(entry.id);
    setDraftActionError(null);

    createBabyKbAssignmentSuggestionMutation.mutate(
      { sourceEntryId: entry.id },
      {
        onSuccess: (draft) => {
          queryClient.invalidateQueries({ queryKey: currentAIDraftQueryKey });
          toast({
            title: "AI suggestion drafted",
            description: `${entry.name || "This Baby KB item"} now has an approval-gated assignment suggestion ready for review.`,
          });
          queryClient.setQueryData(currentAIDraftQueryKey, (current: AIDraft[] | undefined) =>
            current ? [draft, ...current.filter((item) => item.id !== draft.id)] : [draft],
          );
        },
        onError: (error) => {
          setDraftActionError(getErrorMessage(error, "The AI assignment suggestion could not be generated."));
        },
        onSettled: () => setGeneratingBabySuggestionEntryId(null),
      },
    );
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-8">
        <div className="flex items-start justify-between gap-4">
          <LaneHero
            label="Life Ledger"
            title="Structured obligations and plans"
            subtitle={activeTabCopy.intro}
            headingTestId="text-life-ledger-title"
          />
          {!showForm && editingId === null && (
            <Button onClick={() => setShowForm(true)} data-testid="button-new-entry">
              <Plus className="w-4 h-4 mr-2" /> {activeTabCopy.newLabel}
            </Button>
          )}
        </div>

        <SupportRail direction="row">
          <span className="text-xs text-muted-foreground">
            {activeTab === "baby" ? "Baby KB · Review · Assignment · Projection" : "People · Events · Financial · Subscriptions · Travel"}
          </span>
        </SupportRail>

        {lifeLedgerAIDraftReview && (
          <AIDraftReviewPanel
            title={lifeLedgerAIDraftReview.title}
            emptyTitle={lifeLedgerAIDraftReview.emptyTitle}
            emptyDescription={lifeLedgerAIDraftReview.emptyDescription}
            drafts={aiDrafts}
            isLoading={isAIDraftsLoading}
            errorMessage={aiDraftsError instanceof Error ? aiDraftsError.message : null}
            actionErrorMessage={draftActionError}
            modeBadgeLabel={
              activeTab === "baby"
              || activeTab === "events"
              || activeTab === "people"
              || activeTab === "financial"
              || activeTab === "subscriptions"
              || activeTab === "travel"
                ? "Apply enabled"
                : "Read only"
            }
            footerNote={
              activeTab === "baby"
                ? "Stored Baby assignment suggestions can be approved, rejected, and explicitly applied into the admin-only Baby assignment flow. No silent account assignment exists in this slice."
                : activeTab === "events"
                ? "Stored event drafts can be approved, rejected, and applied into Life Ledger events. Other Life Ledger tabs remain review-only in this slice."
                : activeTab === "people"
                  ? "Stored people drafts can be approved, rejected, and applied into new Life Ledger people entries. Other Life Ledger tabs remain review-only in this slice."
                  : activeTab === "financial"
                    ? "Stored financial drafts can be approved, rejected, and applied into new Life Ledger financial entries. Other Life Ledger tabs remain review-only in this slice."
                    : activeTab === "subscriptions"
                      ? "Stored subscription drafts can be approved, rejected, and applied into new Life Ledger subscription entries. Other Life Ledger tabs remain review-only in this slice."
                      : activeTab === "travel"
                        ? "Stored travel drafts can be approved, rejected, and applied into new Life Ledger travel entries. Baby remains non-applicable in this slice."
                  : "Stored drafts are visible here for review only. Apply actions are not enabled for this Life Ledger tab in this slice."
            }
            renderDraftActions={
              activeTab === "baby"
              || activeTab === "events"
              || activeTab === "people"
              || activeTab === "financial"
              || activeTab === "subscriptions"
              || activeTab === "travel"
                ? (draft) => {
                    const canReview =
                      draft.reviewState === "needs_review" || draft.reviewState === "approval_gated";
                    const canApply =
                      draft.reviewState === "needs_review" || draft.reviewState === "approved";
                    const isApplying = applyingDraftId === draft.id;
                    const isReviewing = reviewingDraftId === draft.id;

                    return (
                      <div className="flex flex-wrap justify-end gap-2">
                        {canReview ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isApplying || isReviewing}
                            onClick={() => void handleReviewStateChange(draft.id, "approved")}
                            data-testid={`button-approve-ai-draft-${draft.id}`}
                          >
                            {isReviewing ? "Saving..." : "Approve"}
                          </Button>
                        ) : null}
                        {draft.reviewState !== "rejected" && draft.reviewState !== "applied" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isApplying || isReviewing}
                            onClick={() => void handleReviewStateChange(draft.id, "rejected")}
                            data-testid={`button-reject-ai-draft-${draft.id}`}
                          >
                            {isReviewing ? "Saving..." : "Reject"}
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          disabled={!canApply || isApplying || isReviewing}
                          onClick={() => void handleApplyDraft(draft.id)}
                          data-testid={`button-apply-ai-draft-${draft.id}`}
                        >
                          {draft.reviewState === "applied"
                            ? "Applied"
                            : isApplying
                              ? "Applying..."
                              : activeTab === "people"
                                ? "Apply to people"
                                : activeTab === "financial"
                                  ? "Apply to financial"
                                  : activeTab === "subscriptions"
                                    ? "Apply to subscriptions"
                                    : activeTab === "travel"
                                      ? "Apply to travel"
                                      : activeTab === "baby"
                                        ? "Apply suggested assignment"
                                        : "Apply to events"}
                        </Button>
                      </div>
                    );
                  }
                : undefined
            }
            data-testid={`ai-draft-placeholder-life-ledger-${activeTab}`}
          />
        )}

        {activeTab === "events" && (
          <>
            <CalendarLinkStatusCard
              state={lifeLedgerEventsCalendarPlaceholder.state}
              title={lifeLedgerEventsCalendarPlaceholder.title}
              description={lifeLedgerEventsCalendarPlaceholder.description}
              chips={lifeLedgerEventsCalendarPlaceholder.chips}
              note={lifeLedgerEventsCalendarPlaceholder.note}
              data-testid="calendar-placeholder-life-ledger-events"
            />
            <EventReminderDeliveryStatusBlock
              queueItems={eventReminderQueue?.items ?? []}
              outboxItems={mobileNotificationOutbox?.items ?? []}
              devices={mobileDevices?.items ?? []}
              onRegisterDevice={handleRegisterMobileDevice}
              onDeactivateDevice={handleDeactivateMobileDevice}
              onDispatchNextQueuedReminder={handleDispatchNextQueuedReminder}
              registrationPlatform={mobileSimulatorState.registrationPlatform}
              deactivatingDeviceId={mobileSimulatorState.deactivatingDeviceId}
              dispatchingOutboxId={mobileSimulatorState.dispatchingOutboxId}
              errorMessage={mobileSimulatorError}
            />
            <EventReminderReturnCard
              items={eventReminderQueue?.items ?? []}
              entries={entries ?? []}
              onRunExecutionAction={handleEventExecutionAction}
              actionState={eventActionState}
            />
          </>
        )}

        {!isSurfaceComplete("life-ledger") && <SurfaceOnboardingCard surface="life-ledger" />}

        <Next90DaysPanel />

        {activeTab === "subscriptions" && <SubscriptionAuditPanel />}

        {activeTab === "baby" && (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1.6fr_0.9fr]">
              <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-2" data-testid="baby-kb-intro">
                <h2 className="text-sm font-semibold">Baby KB</h2>
                <p className="text-sm text-muted-foreground">
                  Use this admin-only lane to turn parenting framework content into account-level rolling assignments, dated events, and hero consequence surfaces without losing the source material.
                </p>
                <p className="text-xs text-muted-foreground">
                  Baby KB remains the provenance and governance lane. Life Ledger Events becomes the dated execution surface, while Daily, Weekly, and Vision only show the currently relevant consequences.
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

            <BabyOperationalQueue
              entries={babyEntries}
              promotionsByEntryId={babyPromotionsByEntryId}
              assignmentsByEntryId={babyAssignmentsByEntryId}
              usersById={adminUsersById}
            />
          </div>
        )}

        <HorizontalOverflowSelector
          className="border-b"
          data-testid="tab-bar"
          activeItemSelector='[data-active="true"]'
        >
          {visibleTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setActiveTab(t.key);
                setShowForm(false);
                setEditingId(null);
              }}
              className={`shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              data-active={activeTab === t.key ? "true" : undefined}
              data-testid={`tab-${t.key}`}
            >
              {t.label}
            </button>
          ))}
        </HorizontalOverflowSelector>

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
            assignmentsByEntryId={babyAssignmentsByEntryId}
            usersById={adminUsersById}
            promotingKey={promotingKey}
            generatingSuggestionEntryId={generatingBabySuggestionEntryId}
            pendingSuggestionEntryIds={pendingBabySuggestionEntryIds}
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
            onAssignToAccount={(entry) => {
              setAssignmentEntryId(entry.id);
              setEditingAssignmentId(null);
            }}
            onGenerateAssignmentSuggestion={handleGenerateBabyAssignmentSuggestion}
            onEditAssignment={(entry, assignment) => {
              setAssignmentEntryId(entry.id);
              setEditingAssignmentId(assignment.id);
            }}
            onUpdateAssignmentState={handleUpdateAssignmentState}
          />
        ) : activeTab === "events" && entries && entries.length > 0 ? (
          <EventExecutionBoard
            entries={entries}
            editingId={editingId}
            onEdit={(id) => { setShowForm(false); setEditingId(id); }}
            onDelete={handleDelete}
            onRunExecutionAction={handleEventExecutionAction}
            onUpdateReminderPolicy={handleEventReminderPolicyUpdate}
            actionState={eventActionState}
            reminderState={eventReminderState}
            actionErrorMessage={eventActionError}
            reminderErrorMessage={eventReminderError}
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

        <BabyAssignmentDialog
          open={assignmentEntryId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setAssignmentEntryId(null);
              setEditingAssignmentId(null);
            }
          }}
          users={adminUsers ?? []}
          sourceEntry={selectedAssignmentEntry}
          initialAssignment={editingAssignment}
          onSubmit={handleSubmitBabyAssignment}
          isSaving={createBabyKbAssignmentMutation.isPending || updateBabyKbAssignmentMutation.isPending}
        />
      </div>
    </Layout>
  );
}
