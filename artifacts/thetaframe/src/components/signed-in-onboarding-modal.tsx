import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/react";
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
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { useAuthSession } from "@/hooks/use-auth-session";
import { ONBOARDING_QUERY_KEY, useOnboardingProgress } from "@/hooks/use-onboarding";
import { usePermissions } from "@/hooks/usePermissions";
import { getPreferredRoute } from "@/lib/navigation";
import { Link } from "wouter";

function getDismissKey(userId: string) {
  return `thetaframe:onboarding-modal-dismissed:${userId}`;
}

export function SignedInOnboardingModal() {
  const { user } = useUser();
  const { status } = useAuthSession();
  const queryClient = useQueryClient();
  const { surfaces, incompleteSurfaces, completedCount, isLoading, isError } = useOnboardingProgress();
  const { modules, isAdmin } = usePermissions();
  const [dismissed, setDismissed] = useState(true);
  const [openedOnce, setOpenedOnce] = useState(false);

  const dismissKey = useMemo(
    () => (user?.id ? getDismissKey(user.id) : null),
    [user?.id],
  );

  useEffect(() => {
    if (!dismissKey) {
      setDismissed(true);
      setOpenedOnce(false);
      return;
    }

    if (typeof window === "undefined") {
      setDismissed(false);
      return;
    }

    setDismissed(window.sessionStorage.getItem(dismissKey) === "1");
    setOpenedOnce(false);
  }, [dismissKey]);

  const handleDismiss = () => {
    if (dismissKey && typeof window !== "undefined") {
      window.sessionStorage.setItem(dismissKey, "1");
    }
    setDismissed(true);
  };

  const shouldOpen =
    !dismissed &&
    Boolean(user) &&
    status !== "signed_out" &&
    (openedOnce || (
      status === "ready" &&
      !isLoading &&
      (isError || incompleteSurfaces.length > 0)
    ));

  const fallbackHref = getPreferredRoute(modules, isAdmin);

  useEffect(() => {
    if (
      !dismissed &&
      !openedOnce &&
      status === "ready" &&
      Boolean(user) &&
      !isLoading &&
      (isError || incompleteSurfaces.length > 0)
    ) {
      setOpenedOnce(true);
    }
  }, [dismissed, incompleteSurfaces.length, isError, isLoading, openedOnce, status, user]);

  return (
    <Dialog open={shouldOpen} onOpenChange={(open) => { if (!open) handleDismiss(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="signed-in-onboarding-modal">
        <DialogHeader>
          <DialogTitle>Welcome to ThetaFrame</DialogTitle>
          <DialogDescription>
            This app is your working system. Start with the spaces that still need real data, and the guidance will disappear as each workflow is actually used.
          </DialogDescription>
        </DialogHeader>

        {isError ? (
          <div className="space-y-4">
            <div className="rounded-2xl border bg-card px-5 py-4 shadow-sm space-y-2">
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
          <div className="rounded-2xl border bg-card px-5 py-4 shadow-sm space-y-2">
            <h2 className="text-lg font-semibold">Loading your getting-started plan</h2>
            <p className="text-sm text-muted-foreground">
              ThetaFrame is preparing your onboarding state for this session.
            </p>
          </div>
        ) : (
          <OnboardingChecklist
            surfaces={incompleteSurfaces}
            onNavigate={handleDismiss}
            completedCount={completedCount}
            totalCount={surfaces.length}
          />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleDismiss} data-testid="button-dismiss-onboarding-modal">
            Continue to the app
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
