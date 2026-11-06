import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetFamilyCareQueryKey,
  type FamilyCareEvent,
  type FamilyCareEventInput,
  type UpsertFamilyCareContextBody,
  type UpsertFamilyCareHandoffBody,
  useCreateFamilyCareEvent,
  useDeleteFamilyCareEvent,
  useGetFamilyCare,
  useUpdateFamilyCareEvent,
  useUpsertFamilyCareContext,
  useUpsertFamilyCareHandoff,
} from "@workspace/api-client-react";
import { Baby, Clock3, HandHeart, HeartHandshake, ListPlus, ShieldCheck } from "lucide-react";
import { HabitCanvasObjectChip, HabitCanvasSection, HabitCanvasSurface } from "@/components/habit-canvas";
import { Layout } from "@/components/layout";
import { LaneHero } from "@/components/shell/LaneHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  describeFamilyCareEvent,
  formatPlanTime,
  forwardMinutes,
  localDateTimeInput,
  localInputToIso,
  millilitersToOunces,
  minuteToTimeInput,
  ouncesToMilliliters,
  summarizeFamilyCareEvents,
  timeInputToMinute,
  timelinePieces,
} from "@/lib/family-care";

type View = "tonight" | "log" | "handoff" | "summary";
type EventKind = "feed" | "diaper" | "sleep" | "pump" | "note";

type EventForm = {
  clientEventId: string;
  kind: EventKind;
  observedAt: string;
  endedAt: string;
  method: "nursing" | "bottle" | "other";
  contents: "breast_milk" | "formula" | "other" | "unknown";
  offeredOz: string;
  consumedOz: string;
  continuation: boolean;
  wet: boolean;
  stool: boolean;
  color: string;
  consistency: string;
  expressedOz: string;
  durationMinutes: string;
  side: "left" | "right" | "both" | "not_recorded";
  noteCategory: "general" | "medicine" | "supplement" | "milestone" | "meal";
  title: string;
  notes: string;
};

function blankEventForm(): EventForm {
  return {
    clientEventId: crypto.randomUUID(),
    kind: "feed",
    observedAt: localDateTimeInput(),
    endedAt: "",
    method: "nursing",
    contents: "unknown",
    offeredOz: "",
    consumedOz: "",
    continuation: false,
    wet: false,
    stool: false,
    color: "",
    consistency: "",
    expressedOz: "",
    durationMinutes: "",
    side: "not_recorded",
    noteCategory: "general",
    title: "",
    notes: "",
  };
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const value = error as { error?: unknown; message?: unknown; data?: { error?: unknown } };
    if (typeof value.data?.error === "string") return value.data.error;
    if (typeof value.error === "string") return value.error;
    if (typeof value.message === "string") return value.message;
  }
  return "The change could not be saved. Your input is still here.";
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function TimelineBar({ start, end, className, label }: { start: number; end: number; className: string; label: string }) {
  return (
    <>
      {timelinePieces(start, end).map((piece, index) => (
        <div
          key={`${label}-${index}`}
          className={`absolute inset-y-1 flex min-w-4 items-center justify-center overflow-hidden rounded-md px-1 text-[10px] font-semibold sm:text-xs ${className}`}
          style={{ left: `${piece.left}%`, width: `${piece.width}%` }}
          title={label}
        >
          <span className="truncate">{label}</span>
        </div>
      ))}
    </>
  );
}

function PlanTimeline({ context }: { context: UpsertFamilyCareContextBody }) {
  const aRest = forwardMinutes(context.nightStartMinute, context.handoffMinute);
  const bRest = forwardMinutes(context.handoffMinute, context.morningWakeMinute);
  const needsReview = aRest > 12 * 60 || bRest > 12 * 60 || aRest < 60 || bRest < 60;
  const feedMarkers = [60, 240, 420, 600, 780, 960, 1140, 1320];

  return (
    <div className="space-y-4" data-testid="family-care-plan-timeline">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-background/80 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{context.caregiverALabel} rest opportunity</p>
          <p className="mt-1 text-lg font-semibold">{formatDuration(aRest)}</p>
          <p className="text-xs text-muted-foreground">Planned, not observed sleep</p>
        </div>
        <div className="rounded-lg border bg-background/80 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{context.caregiverBLabel} rest opportunity</p>
          <p className="mt-1 text-lg font-semibold">{formatDuration(bRest)}</p>
          <p className="text-xs text-muted-foreground">Planned, not observed sleep</p>
        </div>
        <div className={`rounded-lg border p-3 ${needsReview ? "border-amber-300 bg-amber-50/80 dark:bg-amber-950/20" : "border-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/20"}`}>
          <p className="text-xs font-semibold uppercase tracking-wide">Coverage check</p>
          <p className="mt-1 text-lg font-semibold">{needsReview ? "Review the plan" : "Rest windows separated"}</p>
          <p className="text-xs opacity-80">The planned rest windows do not overlap. Shared awake coverage may overlap.</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background/70 p-3">
        <div className="min-w-[720px] space-y-3">
          <div className="ml-28 grid grid-cols-6 text-[10px] text-muted-foreground">
            {[0, 4, 8, 12, 16, 20].map((hour) => <span key={hour}>{formatPlanTime(hour * 60)}</span>)}
          </div>
          <div className="grid grid-cols-[7rem_1fr] items-center gap-2">
            <p className="text-xs font-semibold">{context.caregiverALabel}</p>
            <div className="relative h-11 rounded-md bg-muted/60">
              <TimelineBar start={context.nightStartMinute} end={context.handoffMinute} className="bg-sky-200 text-sky-950 dark:bg-sky-900 dark:text-sky-100" label="Rest opportunity" />
              <TimelineBar start={context.handoffMinute} end={context.nightStartMinute} className="bg-emerald-100/80 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100" label="Planned coverage" />
            </div>
          </div>
          <div className="grid grid-cols-[7rem_1fr] items-center gap-2">
            <p className="text-xs font-semibold">{context.caregiverBLabel}</p>
            <div className="relative h-11 rounded-md bg-muted/60">
              <TimelineBar start={context.handoffMinute} end={context.morningWakeMinute} className="bg-violet-200 text-violet-950 dark:bg-violet-900 dark:text-violet-100" label="Rest opportunity" />
              <TimelineBar start={context.morningWakeMinute} end={context.handoffMinute} className="bg-emerald-100/80 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100" label="Planned coverage" />
            </div>
          </div>
          <div className="grid grid-cols-[7rem_1fr] items-center gap-2">
            <p className="text-xs font-semibold">Illustrative only</p>
            <div className="relative h-11 rounded-md border border-dashed bg-violet-50/40 dark:bg-violet-950/10">
              {feedMarkers.map((minute) => (
                <span
                  key={minute}
                  className="absolute top-2 h-7 w-1.5 -translate-x-1/2 rounded-full bg-violet-400"
                  style={{ left: `${(minute / 1440) * 100}%` }}
                  title={`Example band ${formatPlanTime(minute)}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Feeding markers are examples, not alarms or medical schedules. Follow observed cues and clinician guidance. Planned rest never creates an observed care or sleep event.
      </p>
    </div>
  );
}

function buildEventInput(form: EventForm): FamilyCareEventInput {
  const observedAt = localInputToIso(form.observedAt);
  const endedAt = form.kind === "sleep" && form.endedAt ? localInputToIso(form.endedAt) : null;
  if (form.kind === "feed") {
    return {
      kind: "feed",
      observedAt,
      endedAt: null,
      data: {
        method: form.method,
        contents: form.contents,
        offeredMl: form.method === "nursing" ? null : ouncesToMilliliters(form.offeredOz),
        consumedMl: form.method === "nursing" ? null : ouncesToMilliliters(form.consumedOz),
        continuation: form.continuation,
        notes: form.notes || null,
      },
    };
  }
  if (form.kind === "diaper") {
    return { kind: "diaper", observedAt, endedAt: null, data: { wet: form.wet, stool: form.stool, color: form.color || null, consistency: form.consistency || null, notes: form.notes || null } };
  }
  if (form.kind === "sleep") {
    return { kind: "sleep", observedAt, endedAt, data: { notes: form.notes || null } };
  }
  if (form.kind === "pump") {
    return { kind: "pump", observedAt, endedAt: null, data: { expressedMl: ouncesToMilliliters(form.expressedOz), durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : null, side: form.side, notes: form.notes || null } };
  }
  return { kind: "note", observedAt, endedAt: null, data: { category: form.noteCategory, title: form.title, notes: form.notes || null } };
}

function formFromEvent(event: FamilyCareEvent): EventForm {
  const form = blankEventForm();
  form.kind = event.kind;
  form.observedAt = localDateTimeInput(new Date(event.observedAt));
  form.endedAt = event.endedAt ? localDateTimeInput(new Date(event.endedAt)) : "";
  form.notes = readString(event.data.notes);
  if (event.kind === "feed") {
    if (event.data.method === "nursing" || event.data.method === "bottle" || event.data.method === "other") form.method = event.data.method;
    if (event.data.contents === "breast_milk" || event.data.contents === "formula" || event.data.contents === "other" || event.data.contents === "unknown") form.contents = event.data.contents;
    form.offeredOz = millilitersToOunces(event.data.offeredMl);
    form.consumedOz = millilitersToOunces(event.data.consumedMl);
    form.continuation = event.data.continuation === true;
  } else if (event.kind === "diaper") {
    form.wet = event.data.wet === true;
    form.stool = event.data.stool === true;
    form.color = readString(event.data.color);
    form.consistency = readString(event.data.consistency);
  } else if (event.kind === "pump") {
    form.expressedOz = millilitersToOunces(event.data.expressedMl);
    form.durationMinutes = typeof event.data.durationMinutes === "number" ? String(event.data.durationMinutes) : "";
    if (event.data.side === "left" || event.data.side === "right" || event.data.side === "both" || event.data.side === "not_recorded") form.side = event.data.side;
  } else if (event.kind === "note") {
    form.title = readString(event.data.title);
    if (event.data.category === "medicine" || event.data.category === "supplement" || event.data.category === "milestone" || event.data.category === "meal") form.noteCategory = event.data.category;
  }
  return form;
}

export default function FamilyCarePage() {
  const queryClient = useQueryClient();
  const familyCare = useGetFamilyCare({ query: { queryKey: getGetFamilyCareQueryKey(), refetchOnWindowFocus: false } });
  const [view, setView] = useState<View>("tonight");
  const [statusMessage, setStatusMessage] = useState("");
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [eventForm, setEventForm] = useState<EventForm>(blankEventForm);
  const [contextForm, setContextForm] = useState<UpsertFamilyCareContextBody>({
    displayLabel: "Family Care",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    caregiverALabel: "Caregiver A",
    caregiverBLabel: "Caregiver B",
    nightStartMinute: 1200,
    handoffMinute: 0,
    morningWakeMinute: 240,
  });
  const [handoffForm, setHandoffForm] = useState<UpsertFamilyCareHandoffBody>({});

  const refresh = async () => queryClient.invalidateQueries({ queryKey: getGetFamilyCareQueryKey() });
  const contextMutation = useUpsertFamilyCareContext();
  const createEvent = useCreateFamilyCareEvent();
  const updateEvent = useUpdateFamilyCareEvent();
  const deleteEvent = useDeleteFamilyCareEvent();
  const handoffMutation = useUpsertFamilyCareHandoff();

  useEffect(() => {
    const context = familyCare.data?.context;
    if (!context) return;
    setContextForm({
      displayLabel: context.displayLabel,
      timezone: context.id == null ? Intl.DateTimeFormat().resolvedOptions().timeZone || context.timezone : context.timezone,
      caregiverALabel: context.caregiverALabel,
      caregiverBLabel: context.caregiverBLabel,
      nightStartMinute: context.nightStartMinute,
      handoffMinute: context.handoffMinute,
      morningWakeMinute: context.morningWakeMinute,
    });
  }, [familyCare.data?.context]);

  useEffect(() => {
    const handoff = familyCare.data?.handoff;
    if (!handoff) return;
    setHandoffForm({
      currentCaregiverLabel: handoff.currentCaregiverLabel,
      lastConfirmedAction: handoff.lastConfirmedAction,
      nextAction: handoff.nextAction,
      watchFor: handoff.watchFor,
      canWait: handoff.canWait,
      supportNeeded: handoff.supportNeeded,
    });
  }, [familyCare.data?.handoff]);

  const events = familyCare.data?.events ?? [];
  const summary = useMemo(() => summarizeFamilyCareEvents(events), [events]);

  const saveContext = (event: FormEvent) => {
    event.preventDefault();
    setStatusMessage("Saving plan…");
    contextMutation.mutate(
      { data: contextForm },
      {
        onSuccess: async () => { await refresh(); setStatusMessage("Plan saved to your private account."); },
        onError: (error) => setStatusMessage(errorText(error)),
      },
    );
  };

  const saveEvent = (event: FormEvent) => {
    event.preventDefault();
    try {
      const data = buildEventInput(eventForm);
      setStatusMessage(editingEventId ? "Saving event changes…" : "Saving observation…");
      const callbacks = {
        onSuccess: async () => {
          await refresh();
          setEditingEventId(null);
          setEventForm(blankEventForm());
          setStatusMessage(editingEventId ? "Event changes saved." : "Observation saved.");
        },
        onError: (error: unknown) => setStatusMessage(errorText(error)),
      };
      if (editingEventId) updateEvent.mutate({ eventId: editingEventId, data }, callbacks);
      else createEvent.mutate({ data: { ...data, clientEventId: eventForm.clientEventId } }, callbacks);
    } catch (error) {
      setStatusMessage(errorText(error));
    }
  };

  const removeEvent = (event: FamilyCareEvent) => {
    if (!window.confirm("Remove this observed event? The deletion will remain in the private audit history.")) return;
    setStatusMessage("Removing event…");
    deleteEvent.mutate(
      { eventId: event.id },
      {
        onSuccess: async () => { await refresh(); setStatusMessage("Event removed."); },
        onError: (error) => setStatusMessage(errorText(error)),
      },
    );
  };

  const saveHandoff = (event: FormEvent) => {
    event.preventDefault();
    setStatusMessage("Saving handoff…");
    handoffMutation.mutate(
      { data: handoffForm },
      {
        onSuccess: async () => { await refresh(); setStatusMessage("Handoff saved to your private account."); },
        onError: (error) => setStatusMessage(errorText(error)),
      },
    );
  };

  const setContextTime = (key: "nightStartMinute" | "handoffMinute" | "morningWakeMinute", value: string) => {
    setContextForm((current) => ({ ...current, [key]: timeInputToMinute(value) }));
  };

  const tabs: { id: View; label: string; icon: typeof Clock3 }[] = [
    { id: "tonight", label: "Tonight", icon: Clock3 },
    { id: "log", label: "Quick Log", icon: ListPlus },
    { id: "handoff", label: "Handoff", icon: HandHeart },
    { id: "summary", label: "Summary", icon: HeartHandshake },
  ];

  return (
    <Layout>
      <main className="tf-density-page tf-density-page-spacious container mx-auto max-w-6xl space-y-6 lg:space-y-8" data-testid="family-care-page">
        <LaneHero label="Private planning + observations" title="Family Care" subtitle="Record what happened, keep the next handoff clear, and plan caregiver coverage without turning examples into medical instructions.">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4" /><span>{familyCare.data?.accessNotice ?? "Private to this account. Shared household access is not enabled yet."}</span></div>
        </LaneHero>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist" aria-label="Family Care views">
          {tabs.map(({ id, label, icon: Icon }) => (
            <Button key={id} type="button" variant={view === id ? "default" : "outline"} className="min-h-11 justify-start" role="tab" aria-selected={view === id} onClick={() => setView(id)}>
              <Icon className="mr-2 h-4 w-4" />{label}
            </Button>
          ))}
        </div>

        {familyCare.isLoading ? <p className="rounded-lg border p-4 text-sm text-muted-foreground">Loading your private Family Care space…</p> : null}
        {familyCare.isError ? <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm" role="alert">Family Care could not load. No local fallback or public browser storage is being used.</p> : null}

        {!familyCare.isLoading && !familyCare.isError ? (
          <HabitCanvasSurface title={view === "tonight" ? "Tonight's coverage" : view === "log" ? "Record one observation" : view === "handoff" ? "Leave a clear handoff" : "Last 24 hours"} description="Observed events, planned coverage, and illustrative windows stay visibly separate." testId="family-care-canvas" focusGroupTestId="family-care-focus-group" aside={<HabitCanvasObjectChip tone="neutral">Timezone: {contextForm.timezone}</HabitCanvasObjectChip>}>
            {view === "tonight" ? (
              <HabitCanvasSection stepLabel="Plan · not observed" title="Caregiver coverage and rest opportunities" description="Choose labels and times that fit this account. These fields never create care events." testId="family-care-tonight">
                <form className="space-y-5" onSubmit={saveContext}>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2"><Label htmlFor="family-care-label">Private context label</Label><Input id="family-care-label" maxLength={80} value={contextForm.displayLabel} onChange={(e) => setContextForm((current) => ({ ...current, displayLabel: e.target.value }))} required /></div>
                    <div className="space-y-2"><Label htmlFor="family-care-timezone">IANA timezone</Label><Input id="family-care-timezone" maxLength={80} value={contextForm.timezone} onChange={(e) => setContextForm((current) => ({ ...current, timezone: e.target.value }))} required /><p className="text-xs text-muted-foreground">Reference timezone for this private plan. Observation date/time fields follow this device's timezone.</p></div>
                    <div className="space-y-2"><Label htmlFor="family-care-a">Caregiver A label</Label><Input id="family-care-a" maxLength={80} value={contextForm.caregiverALabel} onChange={(e) => setContextForm((current) => ({ ...current, caregiverALabel: e.target.value }))} required /></div>
                    <div className="space-y-2"><Label htmlFor="family-care-b">Caregiver B label</Label><Input id="family-care-b" maxLength={80} value={contextForm.caregiverBLabel} onChange={(e) => setContextForm((current) => ({ ...current, caregiverBLabel: e.target.value }))} required /></div>
                    <div className="space-y-2"><Label htmlFor="family-care-night-start">A rest begins</Label><Input id="family-care-night-start" type="time" value={minuteToTimeInput(contextForm.nightStartMinute)} onChange={(e) => setContextTime("nightStartMinute", e.target.value)} /></div>
                    <div className="space-y-2"><Label htmlFor="family-care-handoff-time">Handoff</Label><Input id="family-care-handoff-time" type="time" value={minuteToTimeInput(contextForm.handoffMinute)} onChange={(e) => setContextTime("handoffMinute", e.target.value)} /></div>
                    <div className="space-y-2"><Label htmlFor="family-care-wake">B rest ends</Label><Input id="family-care-wake" type="time" value={minuteToTimeInput(contextForm.morningWakeMinute)} onChange={(e) => setContextTime("morningWakeMinute", e.target.value)} /></div>
                    <div className="flex items-end"><Button type="submit" className="min-h-11 w-full" disabled={contextMutation.isPending}>Save private plan</Button></div>
                  </div>
                  <PlanTimeline context={contextForm} />
                </form>
              </HabitCanvasSection>
            ) : null}

            {view === "log" ? (
              <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <HabitCanvasSection stepLabel="Observed" title={editingEventId ? "Edit observation" : "Quick Log"} description="Use real timestamps. Unknown measurements stay unknown." testId="family-care-quick-log">
                  <form className="space-y-4" onSubmit={saveEvent}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2"><Label htmlFor="care-kind">Event</Label><select id="care-kind" className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={eventForm.kind} onChange={(e) => setEventForm((current) => ({ ...blankEventForm(), kind: e.target.value as EventKind, observedAt: current.observedAt }))}><option value="feed">Feed</option><option value="diaper">Diaper</option><option value="sleep">Infant sleep</option><option value="pump">Pump</option><option value="note">Note</option></select></div>
                      <div className="space-y-2"><Label htmlFor="care-observed-at">Observed date and time</Label><Input id="care-observed-at" type="datetime-local" value={eventForm.observedAt} onChange={(e) => setEventForm((current) => ({ ...current, observedAt: e.target.value }))} required /></div>
                    </div>

                    {eventForm.kind === "feed" ? <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2"><Label htmlFor="feed-method">Method</Label><select id="feed-method" className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={eventForm.method} onChange={(e) => setEventForm((current) => ({ ...current, method: e.target.value as EventForm["method"], offeredOz: "", consumedOz: "" }))}><option value="nursing">Nursing · volume unknown</option><option value="bottle">Bottle</option><option value="other">Other</option></select></div>
                      <div className="space-y-2"><Label htmlFor="feed-contents">Contents when known</Label><select id="feed-contents" className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={eventForm.contents} onChange={(e) => setEventForm((current) => ({ ...current, contents: e.target.value as EventForm["contents"] }))}><option value="unknown">Not recorded</option><option value="breast_milk">Breast milk</option><option value="formula">Formula</option><option value="other">Other</option></select></div>
                      {eventForm.method !== "nursing" ? <><div className="space-y-2"><Label htmlFor="feed-offered">Bottle offered (oz)</Label><Input id="feed-offered" type="number" min="0" max="67" step="0.1" value={eventForm.offeredOz} onChange={(e) => setEventForm((current) => ({ ...current, offeredOz: e.target.value }))} /></div><div className="space-y-2"><Label htmlFor="feed-consumed">Bottle consumed (oz)</Label><Input id="feed-consumed" type="number" min="0" max="67" step="0.1" value={eventForm.consumedOz} onChange={(e) => setEventForm((current) => ({ ...current, consumedOz: e.target.value }))} /></div></> : null}
                      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={eventForm.continuation} onChange={(e) => setEventForm((current) => ({ ...current, continuation: e.target.checked }))} />Related continuation/top-up</label>
                    </div> : null}

                    {eventForm.kind === "diaper" ? <div className="grid gap-4 sm:grid-cols-2"><fieldset className="space-y-2"><legend className="text-sm font-medium">Contents</legend><div className="flex min-h-11 items-center gap-5"><label className="flex items-center gap-2"><input type="checkbox" checked={eventForm.wet} onChange={(e) => setEventForm((current) => ({ ...current, wet: e.target.checked }))} />Wet</label><label className="flex items-center gap-2"><input type="checkbox" checked={eventForm.stool} onChange={(e) => setEventForm((current) => ({ ...current, stool: e.target.checked }))} />Stool</label></div></fieldset><div className="space-y-2"><Label htmlFor="diaper-color">Color (optional)</Label><Input id="diaper-color" maxLength={120} value={eventForm.color} onChange={(e) => setEventForm((current) => ({ ...current, color: e.target.value }))} /></div><div className="space-y-2"><Label htmlFor="diaper-consistency">Consistency (optional)</Label><Input id="diaper-consistency" maxLength={120} value={eventForm.consistency} onChange={(e) => setEventForm((current) => ({ ...current, consistency: e.target.value }))} /></div></div> : null}

                    {eventForm.kind === "sleep" ? <div className="space-y-2"><Label htmlFor="sleep-end">Observed wake time (optional)</Label><Input id="sleep-end" type="datetime-local" value={eventForm.endedAt} onChange={(e) => setEventForm((current) => ({ ...current, endedAt: e.target.value }))} /><p className="text-xs text-muted-foreground">Leave blank while sleep is open. Duration is calculated only after an end is recorded.</p></div> : null}

                    {eventForm.kind === "pump" ? <div className="grid gap-4 sm:grid-cols-3"><div className="space-y-2"><Label htmlFor="pump-amount">Produced (oz)</Label><Input id="pump-amount" type="number" min="0" max="67" step="0.1" value={eventForm.expressedOz} onChange={(e) => setEventForm((current) => ({ ...current, expressedOz: e.target.value }))} /></div><div className="space-y-2"><Label htmlFor="pump-duration">Duration (minutes)</Label><Input id="pump-duration" type="number" min="1" max="240" value={eventForm.durationMinutes} onChange={(e) => setEventForm((current) => ({ ...current, durationMinutes: e.target.value }))} /></div><div className="space-y-2"><Label htmlFor="pump-side">Side</Label><select id="pump-side" className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={eventForm.side} onChange={(e) => setEventForm((current) => ({ ...current, side: e.target.value as EventForm["side"] }))}><option value="not_recorded">Not recorded</option><option value="left">Left</option><option value="right">Right</option><option value="both">Both</option></select></div></div> : null}

                    {eventForm.kind === "note" ? <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="note-category">Category</Label><select id="note-category" className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={eventForm.noteCategory} onChange={(e) => setEventForm((current) => ({ ...current, noteCategory: e.target.value as EventForm["noteCategory"] }))}><option value="general">General observation</option><option value="medicine">Medicine record only</option><option value="supplement">Supplement record only</option><option value="milestone">Milestone</option><option value="meal">Caregiver meal</option></select></div><div className="space-y-2"><Label htmlFor="note-title">Short description</Label><Input id="note-title" maxLength={120} value={eventForm.title} onChange={(e) => setEventForm((current) => ({ ...current, title: e.target.value }))} required /></div></div> : null}

                    <div className="space-y-2"><Label htmlFor="care-notes">Notes (optional)</Label><Textarea id="care-notes" maxLength={1000} value={eventForm.notes} onChange={(e) => setEventForm((current) => ({ ...current, notes: e.target.value }))} /></div>
                    <div className="flex flex-wrap gap-2"><Button type="submit" className="min-h-11" disabled={createEvent.isPending || updateEvent.isPending}>{editingEventId ? "Save changes" : "Save observation"}</Button>{editingEventId ? <Button type="button" variant="outline" className="min-h-11" onClick={() => { setEditingEventId(null); setEventForm(blankEventForm()); }}>Cancel edit</Button> : null}</div>
                  </form>
                </HabitCanvasSection>

                <HabitCanvasSection stepLabel="Saved" title="Recent activity" description="Newest observations first. Planned timeline bands never appear here." testId="family-care-recent-events">
                  {events.length === 0 ? <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">No recorded events yet. Nothing has been inferred or seeded.</p> : <div className="space-y-3">{events.slice(0, 12).map((event) => <article key={event.id} className="rounded-lg border bg-background/80 p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold capitalize">{event.kind}</p><p className="text-sm text-muted-foreground">{describeFamilyCareEvent(event)}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(event.observedAt).toLocaleString()} · observed</p></div><div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => { setEditingEventId(event.id); setEventForm(formFromEvent(event)); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</Button><Button type="button" size="sm" variant="ghost" onClick={() => removeEvent(event)}>Remove</Button></div></div></article>)}</div>}
                </HabitCanvasSection>
              </div>
            ) : null}

            {view === "handoff" ? <HabitCanvasSection stepLabel="Private coordination" title="What should the next caregiver know?" description="Keep this short and factual. A caregiver label is not a separate account." testId="family-care-handoff"><form className="space-y-4" onSubmit={saveHandoff}><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="handoff-caregiver">Current caregiver label</Label><Input id="handoff-caregiver" maxLength={120} value={handoffForm.currentCaregiverLabel ?? ""} onChange={(e) => setHandoffForm((current) => ({ ...current, currentCaregiverLabel: e.target.value }))} /></div><div className="space-y-2"><Label htmlFor="handoff-last">Last confirmed care action</Label><Textarea id="handoff-last" maxLength={1000} value={handoffForm.lastConfirmedAction ?? ""} onChange={(e) => setHandoffForm((current) => ({ ...current, lastConfirmedAction: e.target.value }))} /></div><div className="space-y-2"><Label htmlFor="handoff-next">Next action</Label><Textarea id="handoff-next" maxLength={1000} value={handoffForm.nextAction ?? ""} onChange={(e) => setHandoffForm((current) => ({ ...current, nextAction: e.target.value }))} /></div><div className="space-y-2"><Label htmlFor="handoff-watch">What to watch</Label><Textarea id="handoff-watch" maxLength={1000} value={handoffForm.watchFor ?? ""} onChange={(e) => setHandoffForm((current) => ({ ...current, watchFor: e.target.value }))} /></div><div className="space-y-2"><Label htmlFor="handoff-wait">What can wait</Label><Textarea id="handoff-wait" maxLength={1000} value={handoffForm.canWait ?? ""} onChange={(e) => setHandoffForm((current) => ({ ...current, canWait: e.target.value }))} /></div><div className="space-y-2"><Label htmlFor="handoff-support">Support needed</Label><Textarea id="handoff-support" maxLength={1000} value={handoffForm.supportNeeded ?? ""} onChange={(e) => setHandoffForm((current) => ({ ...current, supportNeeded: e.target.value }))} /></div></div><Button type="submit" className="min-h-11" disabled={handoffMutation.isPending}>Save handoff</Button></form></HabitCanvasSection> : null}

            {view === "summary" ? <HabitCanvasSection stepLabel="Observed · rolling 24 hours" title="Recorded care summary" description="Counts come only from saved observations. Missing data is not presented as a clinical zero." testId="family-care-summary"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><div className="rounded-lg border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Feeds</p><p className="mt-1 text-2xl font-semibold">{summary.feedCount || "No logged feeds"}</p></div><div className="rounded-lg border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Bottle consumed</p><p className="mt-1 text-2xl font-semibold">{summary.bottleConsumedMl ? `${millilitersToOunces(summary.bottleConsumedMl)} oz` : "No logged volume"}</p></div><div className="rounded-lg border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Pumped / produced</p><p className="mt-1 text-2xl font-semibold">{summary.pumpedMl ? `${millilitersToOunces(summary.pumpedMl)} oz` : "No logged volume"}</p></div><div className="rounded-lg border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Wet diapers</p><p className="mt-1 text-2xl font-semibold">{summary.wetCount || "None logged"}</p></div><div className="rounded-lg border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Stool diapers</p><p className="mt-1 text-2xl font-semibold">{summary.stoolCount || "None logged"}</p></div><div className="rounded-lg border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Completed observed sleep</p><p className="mt-1 text-2xl font-semibold">{summary.completedSleepMinutes ? formatDuration(summary.completedSleepMinutes) : "Not enough data"}</p></div></div><div className="rounded-lg border border-amber-300/70 bg-amber-50/70 p-4 text-sm dark:bg-amber-950/20"><div className="flex gap-2"><Baby className="mt-0.5 h-4 w-4 shrink-0" /><p>This is a caregiver observation summary, not medical scoring or advice. For urgent symptoms, contact the child's clinician or seek urgent/emergency care as appropriate.</p></div></div></HabitCanvasSection> : null}
          </HabitCanvasSurface>
        ) : null}

        <p className="min-h-6 text-sm text-muted-foreground" role="status" aria-live="polite">{statusMessage}</p>
      </main>
    </Layout>
  );
}
