import type { CalendarLinkStatusState } from "@/components/shell/CalendarLinkStatusCard";

export type CalendarPlaceholderContent = {
  state: CalendarLinkStatusState;
  title: string;
  description: string;
  chips: readonly string[];
  note: string;
};

export const dailyCalendarPlaceholder: CalendarPlaceholderContent = {
  state: "export",
  title: "Reserve time blocks for calendar projection",
  description:
    "Daily time blocks will eventually be able to project into linked Google Calendar events without changing Daily's role as the pacing surface.",
  chips: ["Projection lane: Daily", "Future source: Time blocks", "Reconciliation placeholder"],
  note: "Not active yet. This placeholder marks where linked export and sync-status feedback will appear later.",
};

export const weeklyCalendarPlaceholder: CalendarPlaceholderContent = {
  state: "export",
  title: "Protect weekly commitments before export",
  description:
    "Weekly non-negotiables and protected blocks will eventually surface as intentional calendar exports while Weekly stays the alignment lane, not a calendar mirror.",
  chips: ["Projection lane: Weekly", "Future source: Non-negotiables", "Protected time placeholder"],
  note: "Not active yet. This reserves the weekly linked/export surface for a later calendar scaffold.",
};

export const lifeLedgerEventsCalendarPlaceholder: CalendarPlaceholderContent = {
  state: "import",
  title: "Imported dated commitments will land here",
  description:
    "Google Calendar imports will eventually enter Life Ledger events first so external commitments gain structure before they influence Daily or Weekly pacing.",
  chips: ["Import lane: Life Ledger / Events", "Future source: Google Calendar", "Traceable import placeholder"],
  note: "Not active yet. This card reserves the import and linked-state surface for dated obligations and appointments.",
};

export const dormantCalendarPlaceholderStates: Record<
  Extract<CalendarLinkStatusState, "linked" | "conflicted">,
  CalendarPlaceholderContent
> = {
  linked: {
    state: "linked",
    title: "Linked calendar state",
    description:
      "A linked state will show when a ThetaFrame object and Google Calendar event are intentionally connected and traceable in both directions.",
    chips: ["Linked placeholder", "Traceable event relationship"],
    note: "Dormant in this slice. Included now so later reconciliation work reuses the same UI contract.",
  },
  conflicted: {
    state: "conflicted",
    title: "Calendar conflict and reconciliation state",
    description:
      "A conflict state will show when local planning meaning and external event timing diverge enough to require an explicit reconciliation decision.",
    chips: ["Conflict placeholder", "Manual reconciliation required"],
    note: "Dormant in this slice. Included now so later conflict handling reuses the same UI contract.",
  },
};
