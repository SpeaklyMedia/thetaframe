import { useState, useEffect, useRef, useCallback } from "react";
import { Layout } from "@/components/layout";
import { 
  useGetDailyFrame, 
  useUpsertDailyFrame, 
  getGetDailyFrameQueryKey 
} from "@workspace/api-client-react";
import { getTodayDateString } from "@/lib/dates";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { DailyFrameColourState, TierTask, TimeBlock } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { getEmotionColorClass } from "@/lib/colors";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";

export default function DailyPage() {
  const date = getTodayDateString();
  const queryClient = useQueryClient();
  const { data: frame, isLoading } = useGetDailyFrame(date, { 
    query: { enabled: !!date, queryKey: getGetDailyFrameQueryKey(date) } 
  });
  const upsert = useUpsertDailyFrame();

  const [colourState, setColourState] = useState<DailyFrameColourState>("green");
  const [tierA, setTierA] = useState<TierTask[]>([]);
  const [tierB, setTierB] = useState<TierTask[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [microWin, setMicroWin] = useState("");
  const [skipProtocolUsed, setSkipProtocolUsed] = useState(false);

  const initRef = useRef<number | null>(null);

  useEffect(() => {
    if (frame && initRef.current !== frame.id) {
      initRef.current = frame.id;
      setColourState(frame.colourState);
      setTierA(frame.tierA || []);
      setTierB(frame.tierB || []);
      setTimeBlocks(frame.timeBlocks || []);
      setMicroWin(frame.microWin || "");
      setSkipProtocolUsed(frame.skipProtocolUsed);
    }
  }, [frame]);

  const save = useCallback((updates: Partial<{
    colourState: DailyFrameColourState;
    tierA: TierTask[];
    tierB: TierTask[];
    timeBlocks: TimeBlock[];
    microWin: string;
    skipProtocolUsed: boolean;
  }>) => {
    const payload = {
      colourState: updates.colourState ?? colourState,
      tierA: updates.tierA ?? tierA,
      tierB: updates.tierB ?? tierB,
      timeBlocks: updates.timeBlocks ?? timeBlocks,
      microWin: updates.microWin ?? microWin,
      skipProtocolUsed: updates.skipProtocolUsed ?? skipProtocolUsed,
    };
    
    upsert.mutate({ date, data: payload }, {
      onSuccess: (newFrame) => {
        queryClient.setQueryData(getGetDailyFrameQueryKey(date), newFrame);
      }
    });
  }, [date, colourState, tierA, tierB, timeBlocks, microWin, skipProtocolUsed, upsert, queryClient]);

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto p-4 md:p-8 space-y-8">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  const handleColourChange = (color: DailyFrameColourState) => {
    setColourState(color);
    save({ colourState: color });
  };

  const updateTierTask = (tier: "A" | "B", id: string, text: string, completed: boolean) => {
    if (tier === "A") {
      const updated = tierA.map(t => t.id === id ? { ...t, text, completed } : t);
      setTierA(updated);
      save({ tierA: updated });
    } else {
      const updated = tierB.map(t => t.id === id ? { ...t, text, completed } : t);
      setTierB(updated);
      save({ tierB: updated });
    }
  };

  const addTierTask = (tier: "A" | "B") => {
    const newTask = { id: crypto.randomUUID(), text: "", completed: false };
    if (tier === "A") {
      if (tierA.length >= 3) return;
      const updated = [...tierA, newTask];
      setTierA(updated);
      save({ tierA: updated });
    } else {
      const updated = [...tierB, newTask];
      setTierB(updated);
      save({ tierB: updated });
    }
  };

  const removeTierTask = (tier: "A" | "B", id: string) => {
    if (tier === "A") {
      const updated = tierA.filter(t => t.id !== id);
      setTierA(updated);
      save({ tierA: updated });
    } else {
      const updated = tierB.filter(t => t.id !== id);
      setTierB(updated);
      save({ tierB: updated });
    }
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-8 max-w-4xl space-y-10">
        <header className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">Daily Frame</h1>
          <p className="text-muted-foreground">How are you feeling today?</p>
          <div className="flex flex-wrap gap-3">
            {(["green", "yellow", "red", "blue", "purple"] as DailyFrameColourState[]).map(c => (
              <button
                key={c}
                onClick={() => handleColourChange(c)}
                className={`px-4 py-2 rounded-full font-medium transition-all ${
                  colourState === c 
                    ? getEmotionColorClass(c) 
                    : "bg-card border hover:bg-accent text-foreground"
                }`}
              >
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
        </header>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Tier A */}
          <section className="space-y-4 bg-card p-6 rounded-2xl border shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Tier A (Focus)</h2>
              <span className="text-xs font-medium text-muted-foreground">{tierA.length}/3 tasks</span>
            </div>
            <div className="space-y-3">
              {tierA.map(task => (
                <div key={task.id} className="flex items-start gap-3 group">
                  <Checkbox 
                    checked={task.completed}
                    onCheckedChange={(c) => updateTierTask("A", task.id, task.text, !!c)}
                    className="mt-1"
                  />
                  <Input 
                    value={task.text}
                    onChange={(e) => updateTierTask("A", task.id, e.target.value, task.completed)}
                    placeholder="Focus task..."
                    className={`flex-1 border-transparent focus-visible:border-input bg-transparent ${task.completed ? 'line-through text-muted-foreground' : ''}`}
                  />
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeTierTask("A", task.id)}>
                    <X className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              {tierA.length < 3 && (
                <Button variant="ghost" size="sm" onClick={() => addTierTask("A")} className="text-muted-foreground">
                  <Plus className="w-4 h-4 mr-2" /> Add Task
                </Button>
              )}
            </div>
          </section>

          {/* Tier B */}
          <section className="space-y-4 bg-card p-6 rounded-2xl border shadow-sm">
            <h2 className="text-xl font-semibold">Tier B (Flex)</h2>
            <div className="space-y-3">
              {tierB.map(task => (
                <div key={task.id} className="flex items-start gap-3 group">
                  <Checkbox 
                    checked={task.completed}
                    onCheckedChange={(c) => updateTierTask("B", task.id, task.text, !!c)}
                    className="mt-1"
                  />
                  <Input 
                    value={task.text}
                    onChange={(e) => updateTierTask("B", task.id, e.target.value, task.completed)}
                    placeholder="Flexible task..."
                    className={`flex-1 border-transparent focus-visible:border-input bg-transparent ${task.completed ? 'line-through text-muted-foreground' : ''}`}
                  />
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeTierTask("B", task.id)}>
                    <X className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => addTierTask("B")} className="text-muted-foreground">
                <Plus className="w-4 h-4 mr-2" /> Add Task
              </Button>
            </div>
          </section>
        </div>

        <section className="bg-card p-6 rounded-2xl border shadow-sm space-y-4">
          <h2 className="text-xl font-semibold">Micro-Win</h2>
          <p className="text-sm text-muted-foreground">Record one tiny victory from today.</p>
          <Textarea 
            value={microWin}
            onChange={(e) => setMicroWin(e.target.value)}
            onBlur={() => save({ microWin })}
            placeholder="I managed to drink a glass of water..."
            className="resize-none h-24"
          />
        </section>

      </div>
    </Layout>
  );
}
