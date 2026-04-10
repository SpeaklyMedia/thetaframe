import { useState, useEffect, useRef, useCallback } from "react";
import { Layout } from "@/components/layout";
import { SkipProtocol } from "@/components/skip-protocol";
import { 
  useGetWeeklyFrame, 
  useUpsertWeeklyFrame, 
  getGetWeeklyFrameQueryKey,
  ApiError,
} from "@workspace/api-client-react";
import { getMondayOfCurrentWeek } from "@/lib/dates";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { WeeklyStep } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ONBOARDING_QUERY_KEY, useOnboardingProgress } from "@/hooks/use-onboarding";
import { SurfaceOnboardingCard } from "@/components/surface-onboarding-card";

const STEP_EMOJIS = ["🎯", "🔥", "💡", "🌱", "🛠️", "⚡", "📌", "✅", "🚀", "🧠", "💪", "🎨"];

function EmojiPicker({ value, onChange }: { value?: string | null; onChange: (e: string | null) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-9 h-9 text-lg shrink-0"
          data-testid="button-emoji-picker"
        >
          {value || "➕"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2">
        <div className="grid grid-cols-6 gap-1">
          {STEP_EMOJIS.map(e => (
            <button
              key={e}
              onClick={() => onChange(e)}
              className={`text-lg p-1 rounded hover:bg-accent transition-colors ${value === e ? "bg-accent" : ""}`}
              data-testid={`emoji-option-${e}`}
            >
              {e}
            </button>
          ))}
          {value && (
            <button
              onClick={() => onChange(null)}
              className="text-xs text-muted-foreground col-span-6 mt-1 text-center hover:text-foreground"
            >
              clear
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function WeeklyPage() {
  const weekStart = getMondayOfCurrentWeek();
  const queryClient = useQueryClient();
  const { data: frame, isLoading, error } = useGetWeeklyFrame(weekStart, { 
    query: { enabled: !!weekStart, queryKey: getGetWeeklyFrameQueryKey(weekStart), retry: 0 } 
  });
  const frameError = error instanceof ApiError && error.status !== 404 ? error : null;
  const upsert = useUpsertWeeklyFrame();
  const { isSurfaceComplete } = useOnboardingProgress();

  const [theme, setTheme] = useState("");
  const [steps, setSteps] = useState<WeeklyStep[]>([
    { id: crypto.randomUUID(), text: "" },
    { id: crypto.randomUUID(), text: "" },
    { id: crypto.randomUUID(), text: "" }
  ]);
  const [nonNegotiables, setNonNegotiables] = useState<WeeklyStep[]>([
    { id: crypto.randomUUID(), text: "" },
    { id: crypto.randomUUID(), text: "" }
  ]);
  const [recoveryPlan, setRecoveryPlan] = useState("");

  const initRef = useRef<number | null>(null);

  useEffect(() => {
    if (frame && initRef.current !== frame.id) {
      initRef.current = frame.id;
      setTheme(frame.theme || "");
      if (frame.steps && frame.steps.length > 0) setSteps(frame.steps as WeeklyStep[]);
      if (frame.nonNegotiables && frame.nonNegotiables.length > 0) setNonNegotiables(frame.nonNegotiables as WeeklyStep[]);
      setRecoveryPlan(frame.recoveryPlan || "");
    }
  }, [frame]);

  const save = useCallback((updates: Partial<{
    theme: string;
    steps: WeeklyStep[];
    nonNegotiables: WeeklyStep[];
    recoveryPlan: string;
  }>) => {
    const payload = {
      theme: updates.theme ?? theme,
      steps: updates.steps ?? steps,
      nonNegotiables: updates.nonNegotiables ?? nonNegotiables,
      recoveryPlan: updates.recoveryPlan ?? recoveryPlan,
    };
    
    upsert.mutate({ weekStart, data: payload }, {
      onSuccess: (newFrame) => {
        queryClient.setQueryData(getGetWeeklyFrameQueryKey(weekStart), newFrame);
        queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY });
      }
    });
  }, [weekStart, theme, steps, nonNegotiables, recoveryPlan, upsert, queryClient]);

  const isNewFrame = !isLoading && !frame;

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto p-4 md:p-8 space-y-8">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      </Layout>
    );
  }

  if (frameError) {
    return (
      <Layout>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 py-24 text-center">
          <h2 className="text-xl font-semibold">Couldn't load this week's frame</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            {frameError.status === 401
              ? "You're not signed in. Please sign in and try again."
              : "Something went wrong on our end. Try refreshing the page."}
          </p>
        </div>
      </Layout>
    );
  }

  const updateStep = (id: string, text: string) => {
    const updated = steps.map(s => s.id === id ? { ...s, text } : s);
    setSteps(updated);
    save({ steps: updated });
  };

  const updateStepEmoji = (id: string, emoji: string | null) => {
    const updated = steps.map(s => s.id === id ? { ...s, emoji } : s);
    setSteps(updated);
    save({ steps: updated });
  };

  const updateNonNegotiable = (id: string, text: string) => {
    const updated = nonNegotiables.map(s => s.id === id ? { ...s, text } : s);
    setNonNegotiables(updated);
    save({ nonNegotiables: updated });
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-8 max-w-4xl space-y-10">
        <header className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">Weekly Rhythm</h1>
          <p className="text-muted-foreground">Set your intention for the week of {new Date(weekStart).toLocaleDateString()}</p>
        </header>

        <SkipProtocol />

        {!isSurfaceComplete("weekly") && <SurfaceOnboardingCard surface="weekly" />}

        {isNewFrame && (
          <div className="bg-accent/40 border border-accent rounded-2xl px-5 py-4 text-sm text-muted-foreground" data-testid="empty-state-weekly">
            Fresh week, fresh slate. Set your rhythm below — it autosaves as you go.
          </div>
        )}

        <section className="bg-card p-6 rounded-2xl border shadow-sm space-y-4">
          <h2 className="text-xl font-semibold">Weekly Theme</h2>
          <Input 
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            onBlur={() => save({ theme })}
            placeholder="e.g. Grounding, Deep Work, Recovery..."
            className="max-w-md bg-transparent"
          />
        </section>

        <div className="grid gap-8 md:grid-cols-2">
          <section className="bg-card p-6 rounded-2xl border shadow-sm space-y-4">
            <h2 className="text-xl font-semibold">3 Steps</h2>
            <p className="text-sm text-muted-foreground">What moves the needle this week?</p>
            <div className="space-y-3" data-testid="weekly-steps">
              {steps.map((step, i) => (
                <div key={step.id} className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm font-medium w-4 shrink-0">{i + 1}.</span>
                  <EmojiPicker
                    value={step.emoji}
                    onChange={(emoji) => updateStepEmoji(step.id, emoji)}
                  />
                  <Input 
                    value={step.text}
                    onChange={(e) => updateStep(step.id, e.target.value)}
                    onBlur={() => save({ steps })}
                    placeholder="Step..."
                    className="flex-1 bg-transparent"
                    data-testid={`input-step-${i}`}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="bg-card p-6 rounded-2xl border shadow-sm space-y-4">
            <h2 className="text-xl font-semibold">Non-Negotiables</h2>
            <p className="text-sm text-muted-foreground">Your baseline for stability.</p>
            <div className="space-y-3">
              {nonNegotiables.map((nn, i) => (
                <div key={nn.id} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                  <Input 
                    value={nn.text}
                    onChange={(e) => updateNonNegotiable(nn.id, e.target.value)}
                    onBlur={() => save({ nonNegotiables })}
                    placeholder="Non-negotiable..."
                    className="flex-1 bg-transparent"
                    data-testid={`input-non-neg-${i}`}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="bg-card p-6 rounded-2xl border shadow-sm space-y-4">
          <h2 className="text-xl font-semibold">Recovery Plan</h2>
          <p className="text-sm text-muted-foreground">When things get overwhelming, what is the plan?</p>
          <Textarea 
            value={recoveryPlan}
            onChange={(e) => setRecoveryPlan(e.target.value)}
            onBlur={() => save({ recoveryPlan })}
            placeholder="Drop tier B, go for a walk..."
            className="resize-none h-24 bg-transparent"
          />
        </section>

      </div>
    </Layout>
  );
}
