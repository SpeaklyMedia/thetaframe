import type { AIDraftStatusState } from "@/components/shell/AIDraftStatusCard";
import { resolveAIDraftDescriptor } from "@/lib/ai-draft-mapping";

export type AIDraftPlaceholderContent = {
  state: AIDraftStatusState;
  title: string;
  description: string;
  chips: readonly string[];
  note: string;
};

const dailyDraft = resolveAIDraftDescriptor("daily_frame_draft");
const weeklyDraft = resolveAIDraftDescriptor("weekly_frame_draft");
const visionDraft = resolveAIDraftDescriptor("vision_alignment_draft");
const lifeLedgerDraft = resolveAIDraftDescriptor("life_ledger_classification_draft");
const reachDraft = resolveAIDraftDescriptor("reach_file_summary");

export const dailyAIDraftPlaceholder: AIDraftPlaceholderContent = {
  state: "draft",
  title: "AI can draft a cleaner Daily frame from messy current-work input",
  description:
    "Freeform notes, voice capture, and quick context could eventually become a structured Daily draft without changing Daily's role as the current-day execution lane.",
  chips: [
    `Target lane: ${dailyDraft.targetSurfaceLabel}`,
    `Draft kind: ${dailyDraft.draftKind}`,
    dailyDraft.approvalBadgeCopy,
    dailyDraft.provenanceChipCopy,
  ],
  note: "Not active yet. This placeholder reserves the future AI draft and approval surface for Daily.",
};

export const weeklyAIDraftPlaceholder: AIDraftPlaceholderContent = {
  state: "draft",
  title: "AI can compress scattered notes into a Weekly rhythm draft",
  description:
    "Messy inputs could eventually become a cleaner weekly theme, three steps, and recovery draft while Weekly stays the alignment and protection lane.",
  chips: [
    `Target lane: ${weeklyDraft.targetSurfaceLabel}`,
    `Draft kind: ${weeklyDraft.draftKind}`,
    weeklyDraft.approvalBadgeCopy,
    weeklyDraft.provenanceChipCopy,
  ],
  note: "Not active yet. This placeholder marks where weekly draft, rationale, and review context will appear later.",
};

export const visionAIDraftPlaceholder: AIDraftPlaceholderContent = {
  state: "needs_review",
  title: "AI can turn long-horizon input into draft goals and next steps",
  description:
    "Bigger ideas, pasted plans, and continuity notes could eventually become a Vision draft with explicit review so ambiguous goals are never merged silently.",
  chips: [
    `Target lane: ${visionDraft.targetSurfaceLabel}`,
    `Draft kind: ${visionDraft.draftKind}`,
    visionDraft.approvalBadgeCopy,
    visionDraft.provenanceChipCopy,
  ],
  note: "Not active yet. This placeholder reserves the future Vision draft and review surface.",
};

const LIFE_LEDGER_TAB_COPY: Record<
  "people" | "events" | "financial" | "subscriptions" | "travel",
  Pick<AIDraftPlaceholderContent, "title" | "description">
> = {
  people: {
    title: "AI can classify relationship notes into structured people entries",
    description:
      "Names, reminders, and contextual notes could eventually become a draft person entry so relational context gets structured without manual retyping.",
  },
  events: {
    title: "AI can classify dates and obligations into event drafts",
    description:
      "Appointments, obligations, and dated commitments could eventually become a structured Life Ledger event draft before they affect Daily or Weekly.",
  },
  financial: {
    title: "AI can organize financial obligations into reviewable drafts",
    description:
      "Bills, debts, and payment notes could eventually become draft ledger entries with explicit review so high-stakes records stay user-controlled.",
  },
  subscriptions: {
    title: "AI can sort recurring services into subscription drafts",
    description:
      "Messy service notes and statements could eventually become structured subscription drafts ready for review instead of manual entry.",
  },
  travel: {
    title: "AI can organize travel details into ledger-ready drafts",
    description:
      "Bookings, itinerary notes, and travel reminders could eventually become structured travel entries without changing Life Ledger's role as the durable record lane.",
  },
};

export function getLifeLedgerAIDraftPlaceholder(
  tab: "people" | "events" | "financial" | "subscriptions" | "travel",
): AIDraftPlaceholderContent {
  const copy = LIFE_LEDGER_TAB_COPY[tab];
  return {
    state: tab === "financial" ? "approval_gated" : "needs_review",
    title: copy.title,
    description: copy.description,
    chips: [
      `Target lane: ${lifeLedgerDraft.targetSurfaceLabel}`,
      `Draft kind: ${lifeLedgerDraft.draftKind}`,
      lifeLedgerDraft.approvalBadgeCopy,
      lifeLedgerDraft.provenanceChipCopy,
    ],
    note: "Not active yet. This placeholder reserves the future Life Ledger drafting, provenance, and review surface.",
  };
}

export const reachAIDraftPlaceholder: AIDraftPlaceholderContent = {
  state: "draft",
  title: "AI can summarize REACH files and suggest the right lane",
  description:
    "Uploaded files and extracted text could eventually produce a summary draft plus routing suggestion so REACH acts as the source-artifact lane, not a dead-end file bucket.",
  chips: [
    `Target lane: ${reachDraft.targetSurfaceLabel}`,
    `Draft kind: ${reachDraft.draftKind}`,
    reachDraft.approvalBadgeCopy,
    reachDraft.provenanceChipCopy,
  ],
  note: "Not active yet. This placeholder reserves the future file-summary and routing-draft surface for REACH.",
};

export const dormantAIDraftPlaceholderStates: Record<
  Extract<AIDraftStatusState, "approved" | "rejected" | "background_ready">,
  AIDraftPlaceholderContent
> = {
  approved: {
    state: "approved",
    title: "Approved AI draft state",
    description:
      "An approved state will show when a user confirms a provider-agnostic AI draft and the result is ready to commit into the target lane.",
    chips: ["Dormant state", "Draft then confirm then commit"],
    note: "Dormant in this slice. Included now so later approval flows reuse the same UI contract.",
  },
  rejected: {
    state: "rejected",
    title: "Rejected AI draft state",
    description:
      "A rejected state will show when a draft is declined so provenance and review outcomes stay explicit rather than disappearing silently.",
    chips: ["Dormant state", "Review outcome preserved"],
    note: "Dormant in this slice. Included now so later rejection handling reuses the same UI contract.",
  },
  background_ready: {
    state: "background_ready",
    title: "Background-ready AI draft state",
    description:
      "A background-ready state will show when low-risk draft work finishes asynchronously and is ready for explicit user review.",
    chips: ["Dormant state", "Provider-agnostic draft pipeline"],
    note: "Dormant in this slice. Included now so later background draft handling reuses the same UI contract.",
  },
};
