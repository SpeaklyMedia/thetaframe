import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/react";
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
import { useOnboardingProgress } from "@/hooks/use-onboarding";

function getDismissKey(userId: string) {
  return `thetaframe:onboarding-modal-dismissed:${userId}`;
}

export function SignedInOnboardingModal() {
  const { user } = useUser();
  const { status } = useAuthSession();
  const { incompleteSurfaces, isLoading, isError } = useOnboardingProgress();
  const [dismissed, setDismissed] = useState(true);

  const dismissKey = useMemo(
    () => (user?.id ? getDismissKey(user.id) : null),
    [user?.id],
  );

  useEffect(() => {
    if (!dismissKey) {
      setDismissed(true);
      return;
    }

    if (typeof window === "undefined") {
      setDismissed(false);
      return;
    }

    setDismissed(window.sessionStorage.getItem(dismissKey) === "1");
  }, [dismissKey]);

  const handleDismiss = () => {
    if (dismissKey && typeof window !== "undefined") {
      window.sessionStorage.setItem(dismissKey, "1");
    }
    setDismissed(true);
  };

  const shouldOpen =
    status === "ready" &&
    Boolean(user) &&
    !isLoading &&
    !isError &&
    incompleteSurfaces.length > 0 &&
    !dismissed;

  return (
    <Dialog open={shouldOpen} onOpenChange={(open) => { if (!open) handleDismiss(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="signed-in-onboarding-modal">
        <DialogHeader>
          <DialogTitle>Welcome to ThetaFrame</DialogTitle>
          <DialogDescription>
            This app is your working system. Start with the spaces that still need real data, and the guidance will disappear as each workflow is actually used.
          </DialogDescription>
        </DialogHeader>

        <OnboardingChecklist surfaces={incompleteSurfaces} onNavigate={handleDismiss} />

        <DialogFooter>
          <Button variant="outline" onClick={handleDismiss} data-testid="button-dismiss-onboarding-modal">
            Continue to the app
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
