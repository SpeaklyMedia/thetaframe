import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BasicStartGuide } from "@/components/basic-guidance";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { useAuthSession } from "@/hooks/use-auth-session";
import { ONBOARDING_QUERY_KEY, useOnboardingProgress } from "@/hooks/use-onboarding";
import { usePermissions } from "@/hooks/usePermissions";
import { BASIC_LANE_ORDER, type BasicLane } from "@/lib/basic-onboarding";
import { THETAFRAME_OPEN_GUIDE_EVENT } from "@/lib/guide-events";
import { getPreferredRoute } from "@/lib/navigation";
import { Link, useLocation } from "wouter";

function getDismissKey(userId: string) {
  return `thetaframe:onboarding-modal-dismissed:${userId}`;
}

function getGuideLaneForPath(path: string): BasicLane | null {
  const pathname = path.split("?")[0] ?? "/";
  if (pathname.startsWith("/daily")) return "daily";
  if (pathname.startsWith("/weekly")) return "weekly";
  if (pathname.startsWith("/vision")) return "vision";
  return null;
}

export function SignedInOnboardingModal() {
  const { status, userId } = useAuthSession();
  const queryClient = useQueryClient();
  const { surfaces, incompleteSurfaces, completedCount, isLoading, isError } = useOnboardingProgress();
  const { modules, isAdmin } = usePermissions();
  const [location] = useLocation();
  const [dismissed, setDismissed] = useState(true);
  const [openedOnce, setOpenedOnce] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualGuideLane, setManualGuideLane] = useState<BasicLane | null>(null);

  const dismissKey = useMemo(
    () => (userId ? getDismissKey(userId) : null),
    [userId],
  );
  const currentGuideLane = useMemo(() => getGuideLaneForPath(location), [location]);

  useEffect(() => {
    if (!dismissKey) {
      setDismissed(true);
      setOpenedOnce(false);
      setManualOpen(false);
      setManualGuideLane(null);
      return;
    }

    if (typeof window === "undefined") {
      setDismissed(false);
      return;
    }

    setDismissed(window.sessionStorage.getItem(dismissKey) === "1");
    setOpenedOnce(false);
    setManualOpen(false);
    setManualGuideLane(null);
  }, [dismissKey]);

  useEffect(() => {
    const openGuide = () => {
      setManualGuideLane(getGuideLaneForPath(location));
      setManualOpen(true);
      setDismissed(false);
      setOpenedOnce(true);
    };

    window.addEventListener(THETAFRAME_OPEN_GUIDE_EVENT, openGuide);
    return () => window.removeEventListener(THETAFRAME_OPEN_GUIDE_EVENT, openGuide);
  }, [location]);

  const handleDismiss = () => {
    if (dismissKey && typeof window !== "undefined") {
      window.sessionStorage.setItem(dismissKey, "1");
    }
    setDismissed(true);
    setManualOpen(false);
    setManualGuideLane(null);
  };

  const shouldOpen =
    (manualOpen || !dismissed) &&
    Boolean(userId) &&
    status !== "signed_out" &&
    (manualOpen || openedOnce || (
      status === "ready" &&
      !isLoading &&
      (isError || incompleteSurfaces.length > 0)
    ));

  const fallbackHref = getPreferredRoute(modules, isAdmin);
  const hasBasicLanes =
    modules.length > 0 &&
    BASIC_LANE_ORDER.some((module) => modules.includes(module));
  const useBasicStartGuide =
    !isAdmin &&
    hasBasicLanes;
  const basicSurfaces = surfaces.filter((surface) =>
    BASIC_LANE_ORDER.includes(surface.surface as (typeof BASIC_LANE_ORDER)[number]),
  );
  const focusedLane = manualOpen ? manualGuideLane : currentGuideLane;

  useEffect(() => {
    if (
      !dismissed &&
      !openedOnce &&
      status === "ready" &&
      Boolean(userId) &&
      !isLoading &&
      (isError || incompleteSurfaces.length > 0)
    ) {
      setOpenedOnce(true);
    }
  }, [dismissed, incompleteSurfaces.length, isError, isLoading, openedOnce, status, userId]);

  return (
    <Dialog open={shouldOpen} onOpenChange={(open) => { if (!open) handleDismiss(); }}>
      <DialogContent
        className="max-w-3xl !flex !max-h-[calc(100dvh-2rem)] !flex-col !gap-0 !overflow-hidden !p-0"
        data-testid="signed-in-onboarding-modal"
      >
        <DialogHeader className="shrink-0 pb-3 pl-5 pr-12 pt-5 sm:pl-6 sm:pr-14">
          <DialogTitle>{useBasicStartGuide ? "Start Here" : "Welcome to ThetaFrame"}</DialogTitle>
          <DialogDescription>
            {useBasicStartGuide
              ? "Pick one small step. You can come back here any time."
              : "This app is your working system. Start with the spaces that still need real data, and the guidance will disappear as each workflow is actually used."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6" data-testid="signed-in-onboarding-modal-body">
          {isError ? (
            <div className="space-y-4">
              <div className="space-y-2 rounded-lg border bg-card px-5 py-4 shadow-sm">
                <h2 className="text-lg font-semibold">Your getting-started guide could not load</h2>
                <p className="text-sm text-muted-foreground">
                  The app is available, but the onboarding checklist did not load yet. You can retry or go straight to your next lane.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY })}
                  data-testid="button-retry-onboarding-modal"
                >
                  Retry guide
                </Button>
                <Button asChild type="button" data-testid="link-open-fallback-lane">
                  <Link href={fallbackHref} onClick={handleDismiss}>
                    Open your next lane
                  </Link>
                </Button>
              </div>
            </div>
          ) : isLoading && openedOnce ? (
            <div className="space-y-2 rounded-lg border bg-card px-5 py-4 shadow-sm">
              <h2 className="text-lg font-semibold">Loading your getting-started plan</h2>
              <p className="text-sm text-muted-foreground">
                ThetaFrame is preparing your onboarding state for this session.
              </p>
            </div>
          ) : useBasicStartGuide ? (
            <BasicStartGuide
              surfaces={basicSurfaces}
              onNavigate={handleDismiss}
              focusedLane={focusedLane}
            />
          ) : (
            <OnboardingChecklist
              surfaces={incompleteSurfaces}
              onNavigate={handleDismiss}
              completedCount={completedCount}
              totalCount={surfaces.length}
            />
          )}
        </div>

        <DialogFooter className="shrink-0 border-t bg-background px-5 py-4 sm:px-6">
          <Button variant="outline" onClick={handleDismiss} data-testid="button-dismiss-onboarding-modal">
            Continue to the app
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
