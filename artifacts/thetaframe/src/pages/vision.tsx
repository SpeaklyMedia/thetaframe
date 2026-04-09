import { useState, useEffect, useRef, useCallback } from "react";
import { Layout } from "@/components/layout";
import { SkipProtocol } from "@/components/skip-protocol";
import { 
  useGetVisionFrame, 
  useUpsertVisionFrame, 
  getGetVisionFrameQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { VisionGoal } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";

export default function VisionPage() {
  const queryClient = useQueryClient();
  const { data: frame, isLoading } = useGetVisionFrame({ 
    query: { queryKey: getGetVisionFrameQueryKey(), retry: 0 } 
  });
  const upsert = useUpsertVisionFrame();

  const [goals, setGoals] = useState<VisionGoal[]>([
    { id: crypto.randomUUID(), text: "" },
    { id: crypto.randomUUID(), text: "" },
    { id: crypto.randomUUID(), text: "" }
  ]);
  const [nextSteps, setNextSteps] = useState<VisionGoal[]>([
    { id: crypto.randomUUID(), text: "" },
    { id: crypto.randomUUID(), text: "" },
    { id: crypto.randomUUID(), text: "" }
  ]);

  const initRef = useRef<number | null>(null);

  useEffect(() => {
    if (frame && initRef.current !== frame.id) {
      initRef.current = frame.id;
      if (frame.goals && frame.goals.length > 0) setGoals(frame.goals);
      if (frame.nextSteps && frame.nextSteps.length > 0) setNextSteps(frame.nextSteps);
    }
  }, [frame]);

  const save = useCallback((updates: Partial<{
    goals: VisionGoal[];
    nextSteps: VisionGoal[];
  }>) => {
    const payload = {
      goals: updates.goals ?? goals,
      nextSteps: updates.nextSteps ?? nextSteps,
    };
    
    upsert.mutate({ data: payload }, {
      onSuccess: (newFrame) => {
        queryClient.setQueryData(getGetVisionFrameQueryKey(), newFrame);
      }
    });
  }, [goals, nextSteps, upsert, queryClient]);

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

  const updateGoal = (id: string, text: string) => {
    const updated = goals.map(s => s.id === id ? { ...s, text } : s);
    setGoals(updated);
    save({ goals: updated });
  };

  const updateNextStep = (id: string, text: string) => {
    const updated = nextSteps.map(s => s.id === id ? { ...s, text } : s);
    setNextSteps(updated);
    save({ nextSteps: updated });
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-8 max-w-4xl space-y-10">
        <header className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">Vision Tracker</h1>
          <p className="text-muted-foreground">The big picture, broken down.</p>
        </header>

        <SkipProtocol />

        {isNewFrame && (
          <div className="bg-accent/40 border border-accent rounded-2xl px-5 py-4 text-sm text-muted-foreground" data-testid="empty-state-vision">
            No vision frame yet. Start by naming what you're building towards — it autosaves as you go.
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-2">
          <section className="bg-card p-6 rounded-2xl border shadow-sm space-y-4">
            <h2 className="text-xl font-semibold">Vision Goals</h2>
            <p className="text-sm text-muted-foreground">What are we building towards?</p>
            <div className="space-y-3">
              {goals.map((goal, i) => (
                <div key={goal.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-medium text-sm shrink-0">
                    {i + 1}
                  </div>
                  <Input 
                    value={goal.text}
                    onChange={(e) => updateGoal(goal.id, e.target.value)}
                    placeholder="Big goal..."
                    className="flex-1 bg-transparent border-transparent focus-visible:border-input"
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="bg-card p-6 rounded-2xl border shadow-sm space-y-4">
            <h2 className="text-xl font-semibold">Next Visible Steps</h2>
            <p className="text-sm text-muted-foreground">What's the very next action?</p>
            <div className="space-y-3">
              {nextSteps.map((step, i) => (
                <div key={step.id} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                  <Input 
                    value={step.text}
                    onChange={(e) => updateNextStep(step.id, e.target.value)}
                    placeholder="Next action..."
                    className="flex-1 bg-transparent border-transparent focus-visible:border-input"
                  />
                </div>
              ))}
            </div>
          </section>
        </div>

      </div>
    </Layout>
  );
}
