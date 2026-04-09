import { useState, useEffect, useRef, useCallback } from "react";
import { Layout } from "@/components/layout";
import {
  useGetDailyFrame,
  useUpsertDailyFrame,
  getGetDailyFrameQueryKey,
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
import { SkipProtocol } from "@/components/skip-protocol";

const COLOUR_LABELS: Record<DailyFrameColourState, string> = {
  green: "Green — Calm & Ready",
  yellow: "Yellow — Anxious",
  red: "Red — Overwhelmed",
  blue: "Blue — Low Energy",
  purple: "Purple — Creative Flow",
};

export default function DailyPage() {
  const date = getTodayDateString();
  const queryClient = useQueryClient();
  const { data: frame, isLoading } = useGetDailyFrame(date, {
    query: { enabled: !!date, queryKey: getGetDailyFrameQueryKey(date) },
  });
  const upsert = useUpsertDailyFrame();

  const [colourState, setColourState] = useState<DailyFrameColourState>("green");
  const [tierA, setTierA] = useState<TierTask[]>([]);
  const [tierB, setTierB] = useState<TierTask[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [microWin, setMicroWin] = useState("");

  const initRef = useRef<number | null>(null);

  useEffect(() => {
    if (frame && initRef.current !== frame.id) {
      initRef.current = frame.id;
      setColourState(frame.colourState);
      setTierA((frame.tierA as TierTask[]) || []);
      setTierB((frame.tierB as TierTask[]) || []);
      setTimeBlocks((frame.timeBlocks as TimeBlock[]) || []);
      setMicroWin(frame.microWin || "");
    }
  }, [frame]);

  const save = useCallback(
    (updates: Partial<{
      colourState: DailyFrameColourState;
      tierA: TierTask[];
      tierB: TierTask[];
      timeBlocks: TimeBlock[];
      microWin: string;
    }>) => {
      const payload = {
        colourState: updates.colourState ?? colourState,
        tierA: updates.tierA ?? tierA,
        tierB: updates.tierB ?? tierB,
        timeBlocks: updates.timeBlocks ?? timeBlocks,
        microWin: updates.microWin ?? microWin,
        skipProtocolUsed: frame?.skipProtocolUsed ?? false,
        skipProtocolChoice: (frame?.skipProtocolChoice as "micro-win" | "intentional-recovery" | null) ?? null,
      };
      upsert.mutate({ date, data: payload }, {
        onSuccess: (newFrame) => {
          queryClient.setQueryData(getGetDailyFrameQueryKey(date), newFrame);
        },
      });
    },
    [date, colourState, tierA, tierB, timeBlocks, microWin, frame, upsert, queryClient]
  );

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
    const newTask: TierTask = { id: crypto.randomUUID(), text: "", completed: false };
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

  const addTimeBlock = () => {
    const newBlock: TimeBlock = { id: crypto.randomUUID(), startTime: "09:00", action: "" };
    const updated = [...timeBlocks, newBlock];
    setTimeBlocks(updated);
    save({ timeBlocks: updated });
  };

  const updateTimeBlock = (id: string, field: "startTime" | "action", value: string) => {
    const updated = timeBlocks.map(b => b.id === id ? { ...b, [field]: value } : b);
    setTimeBlocks(updated);
    save({ timeBlocks: updated });
  };

  const removeTimeBlock = (id: string) => {
    const updated = timeBlocks.filter(b => b.id !== id);
    setTimeBlocks(updated);
    save({ timeBlocks: updated });
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-8 max-w-4xl space-y-10">

        {/* Emotion Header */}
        <header className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-daily-title">Daily Frame</h1>
          <p className="text-muted-foreground">How are you feeling right now?</p>
          <div className="flex flex-wrap gap-2" data-testid="emotion-colour-picker">
            {(["green", "yellow", "red", "blue", "purple"] as DailyFrameColourState[]).map(c => (
              <button
                key={c}
                data-testid={`button-colour-${c}`}
                onClick={() => handleColourChange(c)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                  colourState === c
                    ? getEmotionColorClass(c) + " ring-2 ring-offset-2 ring-current"
                    : "bg-card border hover:bg-accent text-foreground"
                }`}
              >
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
          {colourState && (
            <p className="text-sm text-muted-foreground italic" data-testid="text-colour-label">
              {COLOUR_LABELS[colourState]}
            </p>
          )}
        </header>

        {/* Skip Protocol — shared component */}
        <SkipProtocol />

        {/* Tier A & B */}
        <div className="grid gap-6 md:grid-cols-2">
          <section className="space-y-4 bg-card p-6 rounded-2xl border shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Tier A</h2>
              <span className="text-xs font-medium text-muted-foreground px-2 py-1 bg-muted rounded-full">{tierA.length}/3</span>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">Non-negotiables. Max 3.</p>
            <div className="space-y-3" data-testid="tier-a-tasks">
              {tierA.map(task => (
                <div key={task.id} className="flex items-start gap-3 group">
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={(c) => updateTierTask("A", task.id, task.text, !!c)}
                    className="mt-1"
                    data-testid={`checkbox-tier-a-${task.id}`}
                  />
                  <Input
                    value={task.text}
                    onChange={(e) => updateTierTask("A", task.id, e.target.value, task.completed)}
                    onBlur={() => save({ tierA })}
                    placeholder="Focus task..."
                    className={`flex-1 border-transparent focus-visible:border-input bg-transparent ${task.completed ? "line-through text-muted-foreground" : ""}`}
                    data-testid={`input-tier-a-${task.id}`}
                  />
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeTierTask("A", task.id)} data-testid={`button-remove-tier-a-${task.id}`}>
                    <X className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              {tierA.length < 3 && (
                <Button variant="ghost" size="sm" onClick={() => addTierTask("A")} className="text-muted-foreground" data-testid="button-add-tier-a">
                  <Plus className="w-4 h-4 mr-2" /> Add Task
                </Button>
              )}
            </div>
          </section>

          <section className="space-y-4 bg-card p-6 rounded-2xl border shadow-sm">
            <h2 className="text-xl font-semibold">Tier B</h2>
            <p className="text-xs text-muted-foreground -mt-2">Optional progress items.</p>
            <div className="space-y-3" data-testid="tier-b-tasks">
              {tierB.map(task => (
                <div key={task.id} className="flex items-start gap-3 group">
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={(c) => updateTierTask("B", task.id, task.text, !!c)}
                    className="mt-1"
                    data-testid={`checkbox-tier-b-${task.id}`}
                  />
                  <Input
                    value={task.text}
                    onChange={(e) => updateTierTask("B", task.id, e.target.value, task.completed)}
                    onBlur={() => save({ tierB })}
                    placeholder="Flexible task..."
                    className={`flex-1 border-transparent focus-visible:border-input bg-transparent ${task.completed ? "line-through text-muted-foreground" : ""}`}
                    data-testid={`input-tier-b-${task.id}`}
                  />
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeTierTask("B", task.id)} data-testid={`button-remove-tier-b-${task.id}`}>
                    <X className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => addTierTask("B")} className="text-muted-foreground" data-testid="button-add-tier-b">
                <Plus className="w-4 h-4 mr-2" /> Add Task
              </Button>
            </div>
          </section>
        </div>

        {/* Time Blocks */}
        <section className="bg-card p-6 rounded-2xl border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Time Blocks</h2>
              <p className="text-xs text-muted-foreground mt-1">Schedule your day in containers.</p>
            </div>
            <Button variant="outline" size="sm" onClick={addTimeBlock} data-testid="button-add-time-block">
              <Plus className="w-4 h-4 mr-2" /> Add Block
            </Button>
          </div>
          <div className="space-y-3" data-testid="time-blocks-list">
            {timeBlocks.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No time blocks yet.</p>
            )}
            {timeBlocks.map(block => (
              <div key={block.id} className="flex items-center gap-3 group">
                <input
                  type="time"
                  value={block.startTime}
                  onChange={(e) => updateTimeBlock(block.id, "startTime", e.target.value)}
                  onBlur={() => save({ timeBlocks })}
                  className="w-28 bg-background border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  data-testid={`input-time-block-start-${block.id}`}
                />
                <Input
                  value={block.action}
                  onChange={(e) => updateTimeBlock(block.id, "action", e.target.value)}
                  onBlur={() => save({ timeBlocks })}
                  placeholder="What happens in this block..."
                  className="flex-1 bg-transparent border-transparent focus-visible:border-input"
                  data-testid={`input-time-block-action-${block.id}`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeTimeBlock(block.id)}
                  data-testid={`button-remove-time-block-${block.id}`}
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* Micro-Win */}
        <section className="bg-card p-6 rounded-2xl border shadow-sm space-y-4">
          <h2 className="text-xl font-semibold">Micro-Win</h2>
          <p className="text-sm text-muted-foreground">Record one small victory from today.</p>
          <Textarea
            value={microWin}
            onChange={(e) => setMicroWin(e.target.value)}
            onBlur={() => save({ microWin })}
            placeholder="I managed to drink a glass of water..."
            className="resize-none h-24"
            data-testid="textarea-micro-win"
          />
        </section>

      </div>
    </Layout>
  );
}
