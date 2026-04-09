import { useState, useEffect } from "react";
import {
  useGetDailyFrame,
  useUpsertDailyFrame,
  getGetDailyFrameQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getTodayDateString } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle } from "lucide-react";

export function SkipProtocol() {
  const date = getTodayDateString();
  const queryClient = useQueryClient();
  const { data: frame } = useGetDailyFrame(date, {
    query: { enabled: !!date, queryKey: getGetDailyFrameQueryKey(date) },
  });
  const upsert = useUpsertDailyFrame();

  const [skipUsed, setSkipUsed] = useState(false);
  const [skipChoice, setSkipChoice] = useState<"micro-win" | "intentional-recovery" | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (frame) {
      setSkipUsed(frame.skipProtocolUsed);
      setSkipChoice((frame.skipProtocolChoice as "micro-win" | "intentional-recovery" | null) ?? null);
    }
  }, [frame]);

  const saveSkip = (used: boolean, choice: "micro-win" | "intentional-recovery" | null) => {
    const base = {
      colourState: (frame?.colourState ?? "green") as "green" | "yellow" | "red" | "blue" | "purple",
      tierA: (frame?.tierA as Array<{ id: string; text: string; completed: boolean }>) ?? [],
      tierB: (frame?.tierB as Array<{ id: string; text: string; completed: boolean }>) ?? [],
      timeBlocks: (frame?.timeBlocks as Array<{ id: string; startTime: string; action: string }>) ?? [],
      microWin: frame?.microWin ?? null,
      skipProtocolUsed: used,
      skipProtocolChoice: choice,
    };
    upsert.mutate({ date, data: base }, {
      onSuccess: (updated) => {
        queryClient.setQueryData(getGetDailyFrameQueryKey(date), updated);
      },
    });
  };

  const triggerSkip = () => {
    setSkipUsed(true);
    setShowPrompt(true);
    saveSkip(true, skipChoice);
  };

  const choose = (choice: "micro-win" | "intentional-recovery") => {
    setSkipChoice(choice);
    setShowPrompt(false);
    saveSkip(true, choice);
  };

  if (!skipUsed) {
    return (
      <div className="bg-card border rounded-2xl p-5 flex items-center justify-between gap-4" data-testid="skip-protocol-panel">
        <div>
          <p className="font-medium text-sm">Feeling like skipping today?</p>
          <p className="text-xs text-muted-foreground mt-1">Trigger the Skip Protocol — choose a gentle path forward.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={triggerSkip}
          disabled={upsert.isPending}
          data-testid="button-skip-protocol"
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Skip Protocol
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-2xl p-5 space-y-3" data-testid="skip-protocol-active">
      <div className="flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-green-600" />
        <p className="font-medium text-sm">Skip Protocol activated</p>
      </div>
      {showPrompt && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Choose your path:</p>
          <div className="flex gap-3">
            <Button size="sm" variant="outline" onClick={() => choose("micro-win")} data-testid="button-skip-choice-micro-win">
              Micro-Win
            </Button>
            <Button size="sm" variant="outline" onClick={() => choose("intentional-recovery")} data-testid="button-skip-choice-recovery">
              Intentional Recovery
            </Button>
          </div>
        </div>
      )}
      {skipChoice && !showPrompt && (
        <p className="text-sm text-muted-foreground">
          Path chosen: <span className="font-medium capitalize">{skipChoice.replace("-", " ")}</span>
        </p>
      )}
    </div>
  );
}
