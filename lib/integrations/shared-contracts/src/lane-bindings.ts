import type { ThetaLane } from "./enums";

export type ThetaLaneExtension = {
  route: string;
  purpose: string;
  dataInputs: readonly string[];
  apiRoutes: readonly string[];
};

export type ThetaMobileRoutingRule = {
  pattern: readonly string[];
  target: Exclude<ThetaLane, "baby-kb" | "admin">;
};

export type ThetaIntegrationBindings = {
  calendar: {
    thesis: string;
    defaultImportLane: "life-ledger";
    constraintProjectionLanes: readonly ("daily" | "weekly")[];
    optionalSuggestionLane: "bizdev";
    requiredLinkFields: readonly string[];
    ownership: {
      googleCalendarOwns: readonly string[];
      thetaframeOwns: readonly string[];
    };
  };
  mobile: {
    thesis: string;
    priorityOrder: readonly string[];
    requiredDeepLinks: readonly string[];
    routingRules: readonly ThetaMobileRoutingRule[];
  };
  aiPopulation: {
    thesis: string;
    requiredIntakeChannels: readonly string[];
    pipeline: readonly string[];
    neverAutoCommit: readonly string[];
  };
};

export const thetaLaneExtensions: Readonly<Record<ThetaLane, ThetaLaneExtension>> = {
  daily: {
    route: "/daily",
    purpose: "Shape the current day around energy, priority, and realistic pacing.",
    dataInputs: ["colorState", "tierA", "tierB", "timeBlocks", "microWin", "skipProtocol"],
    apiRoutes: ["/api/daily-frames/:date", "/api/daily-frames", "/api/daily-frames/recent"],
  },
  weekly: {
    route: "/weekly",
    purpose: "Set weekly alignment, top steps, and recovery plan.",
    dataInputs: ["theme", "steps", "nonNegotiables", "recoveryPlan"],
    apiRoutes: ["/api/weekly-frames/:weekStart", "/api/weekly-frames"],
  },
  vision: {
    route: "/vision",
    purpose: "Connect larger goals to the next visible steps.",
    dataInputs: ["goals", "nextSteps"],
    apiRoutes: ["/api/vision-frames", "/api/vision-frames/me"],
  },
  bizdev: {
    route: "/bizdev",
    purpose: "Track leads, next touches, blockers, and open revenue.",
    dataInputs: ["brand", "phase", "humanStatus", "nextAction", "nextTouchDate", "blocker", "moneyOpen"],
    apiRoutes: ["/api/bizdev/brands", "/api/bizdev/brands/:id", "/api/bizdev/brands/summary"],
  },
  "life-ledger": {
    route: "/life-ledger",
    purpose: "Keep obligations, people, finances, subscriptions, and plans in one structured place.",
    dataInputs: ["tab", "name", "dueDate", "tags", "impactLevel", "reviewWindow", "notes"],
    apiRoutes: ["/api/life-ledger/:tab", "/api/life-ledger/next-90-days", "/api/life-ledger/subscription-audit"],
  },
  "baby-kb": {
    route: "/life-ledger#baby",
    purpose: "Serve as an admin-only provenance and review lane for parenting-related framework content that feeds real operating surfaces.",
    dataInputs: ["imported packet rows", "review tags", "verification state", "promotion links"],
    apiRoutes: [
      "/api/life-ledger/baby",
      "/api/admin/baby-kb/bulk-update",
      "/api/admin/baby-kb/promotions",
      "/api/admin/parent-packet-materializations",
    ],
  },
  reach: {
    route: "/reach",
    purpose: "Store, open, and reuse files needed across workflows.",
    dataInputs: ["files", "notes", "object paths", "packet import actions"],
    apiRoutes: ["/api/reach/files", "/api/storage/uploads/request-url", "/api/storage/objects/*"],
  },
  admin: {
    route: "/admin",
    purpose: "Govern access and presets rather than perform personal planning.",
    dataInputs: ["users", "permissions", "presets", "parent packet import runs", "Baby KB promotions"],
    apiRoutes: [
      "/api/admin/users",
      "/api/admin/users/:userId/permissions",
      "/api/admin/presets",
      "/api/admin/parent-packet-imports",
      "/api/admin/baby-kb/promotions",
    ],
  },
} as const;

export const thetaIntegrationBindings: ThetaIntegrationBindings = {
  calendar: {
    thesis: "Google Calendar is the external time-and-availability surface, not ThetaFrame's planning brain.",
    defaultImportLane: "life-ledger",
    constraintProjectionLanes: ["daily", "weekly"],
    optionalSuggestionLane: "bizdev",
    requiredLinkFields: [
      "calendarId",
      "eventId",
      "direction",
      "last_synced_at",
      "linked_theta_object_id",
      "linked_lane",
    ],
    ownership: {
      googleCalendarOwns: [
        "external event timestamps",
        "attendee metadata",
        "calendar notifications for linked/exported events",
      ],
      thetaframeOwns: [
        "lane placement",
        "object meaning",
        "review state",
        "semantic reminders",
        "AI provenance",
      ],
    },
  },
  mobile: {
    thesis: "Mobile is capture, remind, and return; never a second planning model.",
    priorityOrder: ["deep_links", "quick_capture", "notifications", "widgets_or_shortcuts", "background_sync"],
    requiredDeepLinks: [
      "thetaframe://daily/new",
      "thetaframe://weekly/new",
      "thetaframe://vision/new",
      "thetaframe://life-ledger/new",
      "thetaframe://bizdev/new",
      "thetaframe://reach/upload",
    ],
    routingRules: [
      { pattern: ["today", "this afternoon", "urgent", "current work"], target: "daily" },
      { pattern: ["this week", "protect", "review", "recover"], target: "weekly" },
      { pattern: ["goal", "next step", "longer horizon"], target: "vision" },
      {
        pattern: ["bill", "person", "date", "subscription", "trip", "appointment", "record"],
        target: "life-ledger",
      },
      { pattern: ["lead", "client", "deal", "follow-up", "pipeline"], target: "bizdev" },
      { pattern: ["file", "screenshot", "source doc"], target: "reach" },
    ],
  },
  aiPopulation: {
    thesis: "Messy input becomes lane-correct draft objects with provenance and approval gates.",
    requiredIntakeChannels: [
      "typed_text",
      "voice_transcript",
      "screenshot_or_photo",
      "pasted_message_or_email",
      "share_sheet_capture",
      "calendar_import",
      "reach_upload",
    ],
    pipeline: [
      "capture_raw_payload",
      "normalize_text_attachments_source",
      "extract_facts_entities_dates_actions",
      "classify_lane",
      "produce_draft_objects",
      "attach_rationale_provenance_confidence",
      "require_policy_based_approval",
      "optionally_export_or_schedule_after_approval",
    ],
    neverAutoCommit: [
      "money",
      "commitments",
      "external calendar writes",
      "durable record edits",
      "Baby KB promotions",
    ],
  },
} as const;
