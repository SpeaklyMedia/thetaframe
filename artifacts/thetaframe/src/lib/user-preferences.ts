import type {
  UserPreferences,
  UserPreferencesDensity,
  UserPreferencesReducedStimulation,
  UserPreferencesReminderTone,
} from "@workspace/api-client-react";

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  reducedStimulation: "default",
  density: "comfortable",
  reminderTone: "gentle",
};

export function resolveUserPreferences(
  preferences: Partial<UserPreferences> | null | undefined,
): UserPreferences {
  return {
    reducedStimulation:
      preferences?.reducedStimulation ?? DEFAULT_USER_PREFERENCES.reducedStimulation,
    density: preferences?.density ?? DEFAULT_USER_PREFERENCES.density,
    reminderTone: preferences?.reminderTone ?? DEFAULT_USER_PREFERENCES.reminderTone,
  };
}

export function getReminderToneCopy(
  tone: UserPreferencesReminderTone,
  key:
    | "dashboardComingUp"
    | "dashboardLifeLedger"
    | "dashboardPhoneReminders"
    | "dashboardPhoneRemindersBody"
    | "consoleUrgencyStrip"
    | "consoleUrgencyFallbackStrip"
    | "consoleUrgencyEmptyStrip"
    | "consoleDueNow"
    | "consoleDueNowEmpty"
    | "consoleComingUp"
    | "consoleComingUpEmpty"
    | "consoleFallback"
    | "consoleEmptyHeading"
    | "consoleEmptyBody",
): string {
  const copyByTone: Record<UserPreferencesReminderTone, Record<typeof key, string>> = {
    gentle: {
      dashboardComingUp: "Events and reminders stay in your assigned advanced lane.",
      dashboardLifeLedger: "Review dated plans, reminders, and appointments at a calm pace.",
      dashboardPhoneReminders: "Phone reminders",
      dashboardPhoneRemindersBody:
        "Device and outbox status stay with Life Ledger until real push transport is turned on.",
      consoleUrgencyStrip:
        "The strip shows how active reminders are clustering across the next few days.",
      consoleUrgencyFallbackStrip:
        "The strip shows the shape of the next dated Events while the reminder queue stays quiet.",
      consoleUrgencyEmptyStrip: "No near-term reminder or dated-event pressure is active right now.",
      consoleDueNow: "Needs a closer look inside the next 24 hours.",
      consoleDueNowEmpty: "Nothing urgent is pressing right now. The next reminder-active items are staged below.",
      consoleComingUp: "Reminder-active items that can stay in view without taking over the Console.",
      consoleComingUpEmpty: "No additional reminder-active items are waiting after the near-term window.",
      consoleFallback:
        "No reminder queue is active, so Console falls back to the next dated Events.",
      consoleEmptyHeading: "No reminder-active horizon needs attention right now.",
      consoleEmptyBody:
        "Console surfaces near-term reminders first. When the queue is quiet and no upcoming dated events exist, this region stays calm instead of manufacturing pressure.",
    },
    standard: {
      dashboardComingUp: "Events and reminders stay in your assigned advanced lane.",
      dashboardLifeLedger: "Review dated plans, reminders, and appointments.",
      dashboardPhoneReminders: "Phone reminders",
      dashboardPhoneRemindersBody:
        "Device and outbox status live with Life Ledger until real push transport is turned on.",
      consoleUrgencyStrip:
        "The strip shows how active reminders are distributed across the next few days.",
      consoleUrgencyFallbackStrip:
        "The strip shows the shape of the next dated Events while the reminder queue is quiet.",
      consoleUrgencyEmptyStrip: "No near-term reminder or dated-event pressure is active.",
      consoleDueNow: "Overdue or reminding inside the next 24 hours.",
      consoleDueNowEmpty: "Nothing is due right now. The next reminder-active items are staged below.",
      consoleComingUp: "Reminder-active items beyond the immediate window.",
      consoleComingUpEmpty: "No additional reminder-active items are queued after the due-now window.",
      consoleFallback:
        "No reminder queue is active, so Console falls back to the next dated Events.",
      consoleEmptyHeading: "No reminder-active horizon is pressing right now.",
      consoleEmptyBody:
        "Console will surface due-now reminders first. When the queue is quiet and no upcoming dated events exist, this region stays calm instead of fabricating urgency.",
    },
  };

  return copyByTone[tone][key];
}

export const USER_PREFERENCE_OPTION_LABELS: Record<
  "reducedStimulation" | "density" | "reminderTone",
  readonly { value: string; label: string; description: string }[]
> = {
  reducedStimulation: [
    {
      value: "default",
      label: "Default",
      description: "Keep the current visual energy and emphasis.",
    },
    {
      value: "reduced",
      label: "Reduced",
      description: "Soften glow, motion-like emphasis, and hover lift.",
    },
  ],
  density: [
    {
      value: "comfortable",
      label: "Comfortable",
      description: "Keep the calmer spacing baseline.",
    },
    {
      value: "compact",
      label: "Compact",
      description: "Tighten spacing without changing reading order.",
    },
  ],
  reminderTone: [
    {
      value: "gentle",
      label: "Gentle",
      description: "Use softer reminder language.",
    },
    {
      value: "standard",
      label: "Standard",
      description: "Use the current direct reminder phrasing.",
    },
  ],
};

export type ResolvedUserPreferenceDensity = UserPreferencesDensity;
export type ResolvedUserPreferenceReducedStimulation = UserPreferencesReducedStimulation;
export type ResolvedUserPreferenceReminderTone = UserPreferencesReminderTone;
