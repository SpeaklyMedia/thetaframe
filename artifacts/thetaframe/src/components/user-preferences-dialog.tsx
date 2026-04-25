import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetUserPreferencesQueryKey,
  type UserPreferences,
  type UserPreferencesDensity,
  type UserPreferencesReducedStimulation,
  type UserPreferencesReminderTone,
  useUpsertUserPreferences,
} from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { USER_PREFERENCE_OPTION_LABELS } from "@/lib/user-preferences";

type UserPreferencesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type DraftPreferences = Pick<
  UserPreferences,
  "reducedStimulation" | "density" | "reminderTone"
>;

function PreferenceOptionButton({
  active,
  label,
  description,
  onClick,
  testId,
}: {
  active: boolean;
  label: string;
  description: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-md border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "bg-background hover:border-primary/50 hover:bg-accent",
      )}
      onClick={onClick}
      data-testid={testId}
    >
      <span className="block text-sm font-semibold">{label}</span>
      <span
        className={cn(
          "mt-1 block text-sm",
          active ? "text-primary-foreground/85" : "text-muted-foreground",
        )}
      >
        {description}
      </span>
    </button>
  );
}

export function UserPreferencesDialog({
  open,
  onOpenChange,
}: UserPreferencesDialogProps) {
  const queryClient = useQueryClient();
  const { preferences, isLoading } = useUserPreferences(open);
  const upsertPreferences = useUpsertUserPreferences();
  const [draft, setDraft] = useState<DraftPreferences>(preferences);

  useEffect(() => {
    if (open) {
      setDraft(preferences);
    }
  }, [open, preferences]);

  const isDirty =
    draft.reducedStimulation !== preferences.reducedStimulation ||
    draft.density !== preferences.density ||
    draft.reminderTone !== preferences.reminderTone;

  const handleSave = () => {
    upsertPreferences.mutate(
      { data: draft },
      {
        onSuccess: (result) => {
          queryClient.setQueryData(getGetUserPreferencesQueryKey(), result);
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl"
        data-testid="dialog-user-preferences"
      >
        <DialogHeader>
          <DialogTitle>Display + reminders</DialogTitle>
          <DialogDescription>
            Choose how much visual intensity, spacing, and reminder directness you want across your signed-in workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="space-y-3" data-testid="preferences-section-reduced-stimulation">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Reduced stimulation</h3>
              <p className="text-sm text-muted-foreground">
                Less visual intensity and less ambient emphasis.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {USER_PREFERENCE_OPTION_LABELS.reducedStimulation.map((option) => (
                <PreferenceOptionButton
                  key={option.value}
                  active={draft.reducedStimulation === option.value}
                  label={option.label}
                  description={option.description}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      reducedStimulation:
                        option.value as UserPreferencesReducedStimulation,
                    }))
                  }
                  testId={`button-user-preferences-reduced-stimulation-${option.value}`}
                />
              ))}
            </div>
          </section>

          <section className="space-y-3" data-testid="preferences-section-density">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Density</h3>
              <p className="text-sm text-muted-foreground">
                Calmer spacing or tighter information.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {USER_PREFERENCE_OPTION_LABELS.density.map((option) => (
                <PreferenceOptionButton
                  key={option.value}
                  active={draft.density === option.value}
                  label={option.label}
                  description={option.description}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      density: option.value as UserPreferencesDensity,
                    }))
                  }
                  testId={`button-user-preferences-density-${option.value}`}
                />
              ))}
            </div>
          </section>

          <section className="space-y-3" data-testid="preferences-section-reminder-tone">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Reminder tone</h3>
              <p className="text-sm text-muted-foreground">
                Softer or more direct reminder wording.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {USER_PREFERENCE_OPTION_LABELS.reminderTone.map((option) => (
                <PreferenceOptionButton
                  key={option.value}
                  active={draft.reminderTone === option.value}
                  label={option.label}
                  description={option.description}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      reminderTone: option.value as UserPreferencesReminderTone,
                    }))
                  }
                  testId={`button-user-preferences-reminder-tone-${option.value}`}
                />
              ))}
            </div>
          </section>
        </div>

        <DialogFooter showCloseButton>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isLoading || upsertPreferences.isPending || !isDirty}
            data-testid="button-save-user-preferences"
          >
            {upsertPreferences.isPending ? "Saving..." : "Save preferences"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
