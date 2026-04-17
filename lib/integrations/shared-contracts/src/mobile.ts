import { z } from "zod";
import { thetaLaneExtensions, thetaIntegrationBindings } from "./lane-bindings";

export const thetaMobileRouteTargetLanes = [
  "daily",
  "weekly",
  "vision",
  "life-ledger",
  "bizdev",
  "reach",
] as const;

export const thetaMobileQuickCaptureIntents = [
  "current_work",
  "weekly_alignment",
  "long_horizon_goal",
  "durable_record",
  "pipeline_follow_up",
  "file_capture",
] as const;

export const thetaMobileNotificationCategories = [
  "daily_prompt",
  "weekly_review",
  "vision_nudge",
  "life_ledger_due",
  "bizdev_follow_up",
  "reach_processing",
] as const;

export const thetaMobileEntryChannels = [
  "deep_link",
  "share_sheet",
  "shortcut",
  "widget",
  "notification",
] as const;

export const thetaMobileRouteTargetLaneSchema = z.enum(thetaMobileRouteTargetLanes);
export const thetaMobileQuickCaptureIntentSchema = z.enum(thetaMobileQuickCaptureIntents);
export const thetaMobileNotificationCategorySchema = z.enum(thetaMobileNotificationCategories);
export const thetaMobileEntryChannelSchema = z.enum(thetaMobileEntryChannels);

export type ThetaMobileRouteTargetLane = (typeof thetaMobileRouteTargetLanes)[number];
export type ThetaMobileQuickCaptureIntent = (typeof thetaMobileQuickCaptureIntents)[number];
export type ThetaMobileNotificationCategory = (typeof thetaMobileNotificationCategories)[number];
export type ThetaMobileEntryChannel = (typeof thetaMobileEntryChannels)[number];

export const thetaMobileQuickCaptureIntentTargets: Readonly<
  Record<ThetaMobileQuickCaptureIntent, ThetaMobileRouteTargetLane>
> = {
  current_work: "daily",
  weekly_alignment: "weekly",
  long_horizon_goal: "vision",
  durable_record: "life-ledger",
  pipeline_follow_up: "bizdev",
  file_capture: "reach",
};

export const thetaMobileNotificationCategoryTargets: Readonly<
  Record<ThetaMobileNotificationCategory, ThetaMobileRouteTargetLane>
> = {
  daily_prompt: "daily",
  weekly_review: "weekly",
  vision_nudge: "vision",
  life_ledger_due: "life-ledger",
  bizdev_follow_up: "bizdev",
  reach_processing: "reach",
};

export const thetaMobileNotificationCategoryRoutes: Readonly<
  Record<ThetaMobileNotificationCategory, string>
> = {
  daily_prompt: thetaLaneExtensions.daily.route,
  weekly_review: thetaLaneExtensions.weekly.route,
  vision_nudge: thetaLaneExtensions.vision.route,
  life_ledger_due: "/life-ledger?tab=events",
  bizdev_follow_up: thetaLaneExtensions.bizdev.route,
  reach_processing: thetaLaneExtensions.reach.route,
};

function parseDeepLinkPath(uri: string): { lane: ThetaMobileRouteTargetLane; action: "new" | "upload" } {
  const match = /^thetaframe:\/\/(daily|weekly|vision|life-ledger|bizdev|reach)\/(new|upload)$/.exec(uri);
  if (!match) {
    throw new Error(`Unsupported ThetaFrame mobile deep link: ${uri}`);
  }

  return {
    lane: match[1] as ThetaMobileRouteTargetLane,
    action: match[2] as "new" | "upload",
  };
}

export const thetaMobileDeepLinkSchema = z.object({
  uri: z.string().regex(/^thetaframe:\/\/[a-z-]+\/(new|upload)$/),
  lane: thetaMobileRouteTargetLaneSchema,
  action: z.enum(["new", "upload"]),
  route: z.string().startsWith("/"),
});

export type ThetaMobileDeepLink = z.infer<typeof thetaMobileDeepLinkSchema>;

export const thetaMobileResolvedRouteSchema = z.object({
  lane: thetaMobileRouteTargetLaneSchema,
  route: z.string().startsWith("/"),
});

export type ThetaMobileResolvedRoute = z.infer<typeof thetaMobileResolvedRouteSchema>;

export const thetaMobileRequiredDeepLinks = thetaIntegrationBindings.mobile.requiredDeepLinks.map((uri) => {
  const { lane, action } = parseDeepLinkPath(uri);
  return thetaMobileDeepLinkSchema.parse({
    uri,
    lane,
    action,
    route: thetaLaneExtensions[lane].route,
  });
}) as readonly ThetaMobileDeepLink[];

export const thetaMobileNotificationRoutes: Readonly<
  Record<ThetaMobileNotificationCategory, ThetaMobileResolvedRoute>
> = Object.fromEntries(
  Object.entries(thetaMobileNotificationCategoryTargets).map(([category, lane]) => [
    category,
    thetaMobileResolvedRouteSchema.parse({
      lane,
      route: thetaMobileNotificationCategoryRoutes[category as ThetaMobileNotificationCategory],
    }),
  ]),
) as Readonly<Record<ThetaMobileNotificationCategory, ThetaMobileResolvedRoute>>;

export const thetaMobileRoutingRules = thetaIntegrationBindings.mobile.routingRules.map((rule) => ({
  ...rule,
  route: thetaLaneExtensions[rule.target].route,
})) as ReadonlyArray<
  (typeof thetaIntegrationBindings.mobile.routingRules)[number] & {
    route: string;
  }
>;
