import type { MobileIntegrationStatusMode } from "@/components/shell/MobileIntegrationStatusCard";
import {
  mobileDeepLinkByLane,
  resolveNotificationCategoryRoute,
  resolveQuickCaptureIntentRoute,
} from "@/lib/mobile-routing";

export type MobilePlaceholderContent = {
  mode: MobileIntegrationStatusMode;
  title: string;
  description: string;
  chips: readonly string[];
  note: string;
};

const dailyQuickCapture = resolveQuickCaptureIntentRoute("current_work");
const dailyNotification = resolveNotificationCategoryRoute("daily_prompt");
const weeklyNotification = resolveNotificationCategoryRoute("weekly_review");
const lifeLedgerDueNotification = resolveNotificationCategoryRoute("life_ledger_due");
const lifeLedgerQuickCapture = resolveQuickCaptureIntentRoute("durable_record");
const reachQuickCapture = resolveQuickCaptureIntentRoute("file_capture");

export const dailyMobilePlaceholder: MobilePlaceholderContent = {
  mode: "quick_capture",
  title: "Mobile capture will route urgent work into Daily",
  description:
    "Phone-first capture for current work, today items, and urgent follow-through will eventually land in Daily without creating a second planning surface.",
  chips: [
    `Target lane: ${dailyQuickCapture.lane}`,
    `Capture route: ${dailyQuickCapture.route}`,
    `Notification route: ${dailyNotification.route}`,
  ],
  note: "Not active yet. This reserves the mobile quick-capture and daily reminder surface without creating runtime mobile behavior.",
};

export const weeklyMobilePlaceholder: MobilePlaceholderContent = {
  mode: "deep_link",
  title: "Weekly prompts will deep-link back to the review lane",
  description:
    "Protected-time and review prompts will eventually open Weekly directly so recovery, review, and alignment stay in the weekly lane instead of a separate mobile flow.",
  chips: [
    `Deep link: ${mobileDeepLinkByLane.weekly}`,
    `Target route: ${weeklyNotification.route}`,
    "Notification category: weekly_review",
  ],
  note: "Not active yet. This placeholder marks where mobile deep-link and weekly reminder context will appear later.",
};

export const lifeLedgerEventsMobilePlaceholder: MobilePlaceholderContent = {
  mode: "notification",
  title: "Mobile reminder returns now resolve back into Events",
  description:
    "Reminder-active event work now has a lane-safe mobile return route so due items can come back into Life Ledger Events without creating a second planning surface.",
  chips: [
    `Notification route: ${lifeLedgerDueNotification.route}`,
    `Deep link: ${mobileDeepLinkByLane["life-ledger"]}`,
    `Capture route: ${lifeLedgerQuickCapture.route}`,
  ],
  note: "Reminder delivery is still dormant. This surface now proves the mobile-safe route, deep link, and active reminder queue that later delivery work will use.",
};

export const reachMobilePlaceholder: MobilePlaceholderContent = {
  mode: "quick_capture",
  title: "Files and screenshots will return to REACH",
  description:
    "Share-sheet captures, screenshots, and source documents will eventually route into REACH so files are stored once and then suggested back into the right lane.",
  chips: [
    `Target lane: ${reachQuickCapture.lane}`,
    `Capture route: ${reachQuickCapture.route}`,
    `Deep link: ${mobileDeepLinkByLane.reach}`,
  ],
  note: "Not active yet. This placeholder reserves the future mobile file-capture and return-to-source surface.",
};

export const dormantMobilePlaceholderModes: Record<
  Extract<MobileIntegrationStatusMode, "notification" | "shortcut" | "widget">,
  MobilePlaceholderContent
> = {
  notification: {
    mode: "notification",
    title: "Lane-safe notification state",
    description:
      "A notification state will show when mobile reminders can return directly to the correct lane without creating a second product model.",
    chips: ["Dormant mode", "Notifications deep-link exactly"],
    note: "Dormant in this slice. Included now so future mobile reminder work reuses the same UI contract.",
  },
  shortcut: {
    mode: "shortcut",
    title: "Shortcut entry state",
    description:
      "A shortcut state will show when iPhone and Android quick-add flows can launch directly into lane-correct capture without extra routing decisions.",
    chips: ["Dormant mode", "Quick capture placeholder"],
    note: "Dormant in this slice. Included now so shortcut work reuses the same UI contract later.",
  },
  widget: {
    mode: "widget",
    title: "Widget entry state",
    description:
      "A widget state will show when compact mobile entry points can open an existing ThetaFrame lane without introducing a separate mobile information architecture.",
    chips: ["Dormant mode", "No second product model"],
    note: "Dormant in this slice. Included now so widget work reuses the same UI contract later.",
  },
};
