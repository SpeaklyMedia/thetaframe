import { useState, useEffect, useRef, useCallback } from "react";
import { Layout } from "@/components/layout";
import { 
  useGetWeeklyFrame, 
  useUpsertWeeklyFrame, 
  getGetWeeklyFrameQueryKey 
} from "@workspace/api-client-react";
import { getMondayOfCurrentWeek } from "@/lib/dates";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { WeeklyStep } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function WeeklyPage() {
  const weekStart = getMondayOfCurrentWeek();
  const queryClient = useQueryClient();
  const { data: frame, isLoading } = useGetWeeklyFrame(weekStart, { 
    query: { enabled: !!weekStart, queryKey: getGetWeeklyFrameQueryKey(weekStart) } 
  });
  const upsert = useUpsertWeeklyFrame();

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
      if (frame.steps && frame.steps.length > 0) setSteps(frame.steps);
      if (frame.nonNegotiables && frame.nonNegotiables.length > 0) setNonNegotiables(frame.nonNegotiables);
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
      }
    });
  }, [weekStart, theme, steps, nonNegotiables, recoveryPlan, upsert, queryClient]);

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

  const updateStep = (id: string, text: string) => {
    const updated = steps.map(s => s.id === id ? { ...s, text } : s);
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
            <div className="space-y-3">
              {steps.map((step, i) => (
                <div key={step.id} className="flex items-center gap-3">
                  <span className="text-muted-foreground text-sm font-medium w-4">{i + 1}.</span>
                  <Input 
                    value={step.text}
                    onChange={(e) => updateStep(step.id, e.target.value)}
                    placeholder="Step..."
                    className="flex-1 bg-transparent"
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
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                  <Input 
                    value={nn.text}
                    onChange={(e) => updateNonNegotiable(nn.id, e.target.value)}
                    placeholder="Non-negotiable..."
                    className="flex-1 bg-transparent"
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
