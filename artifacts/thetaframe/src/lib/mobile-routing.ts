import {
  thetaLaneExtensions,
  type ThetaMobileNotificationCategory,
  thetaMobileNotificationRoutes,
  type ThetaMobileQuickCaptureIntent,
  thetaMobileQuickCaptureIntentTargets,
  type ThetaMobileRouteTargetLane,
  thetaMobileRequiredDeepLinks,
} from "@workspace/integration-contracts";

export type ResolvedMobileRoute = {
  lane: ThetaMobileRouteTargetLane;
  route: string;
};

export const mobileRequiredDeepLinks = thetaMobileRequiredDeepLinks;

export const mobileDeepLinkByLane: Readonly<Record<ThetaMobileRouteTargetLane, string>> = Object.fromEntries(
  mobileRequiredDeepLinks.map((deepLink) => [deepLink.lane, deepLink.uri]),
) as Readonly<Record<ThetaMobileRouteTargetLane, string>>;

export const mobileQuickCaptureRouteMap: Readonly<
  Record<ThetaMobileQuickCaptureIntent, ResolvedMobileRoute>
> = Object.fromEntries(
  Object.entries(thetaMobileQuickCaptureIntentTargets).map(([intent, lane]) => [
    intent,
    {
      lane,
      route: thetaLaneExtensions[lane].route,
    },
  ]),
) as Readonly<Record<ThetaMobileQuickCaptureIntent, ResolvedMobileRoute>>;

export const mobileNotificationRouteMap: Readonly<
  Record<ThetaMobileNotificationCategory, ResolvedMobileRoute>
> = thetaMobileNotificationRoutes;

export function resolveQuickCaptureIntentRoute(intent: ThetaMobileQuickCaptureIntent): ResolvedMobileRoute {
  return mobileQuickCaptureRouteMap[intent];
}

export function resolveNotificationCategoryRoute(
  category: ThetaMobileNotificationCategory,
): ResolvedMobileRoute {
  return mobileNotificationRouteMap[category];
}
