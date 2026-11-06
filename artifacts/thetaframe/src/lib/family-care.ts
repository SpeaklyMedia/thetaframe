import type { FamilyCareEvent, FamilyCareEventInput } from "@workspace/api-client-react";

export const ML_PER_OUNCE = 29.5735;

export function ouncesToMilliliters(value: string): number | null {
  if (!value.trim()) return null;
  const ounces = Number(value);
  if (!Number.isFinite(ounces) || ounces < 0) return null;
  return Math.round(ounces * ML_PER_OUNCE);
}

export function millilitersToOunces(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  return (value / ML_PER_OUNCE).toFixed(1).replace(/\.0$/, "");
}

export function minuteToTimeInput(value: number): string {
  const minute = ((Math.round(value) % 1440) + 1440) % 1440;
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

export function timeInputToMinute(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return 0;
  }
  return hour * 60 + minute;
}

export function formatPlanTime(value: number): string {
  const date = new Date(Date.UTC(2020, 0, 1, 0, ((value % 1440) + 1440) % 1440));
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(date);
}

export function forwardMinutes(start: number, end: number): number {
  const duration = ((end - start) % 1440 + 1440) % 1440;
  return duration === 0 ? 1440 : duration;
}

export type TimelinePiece = { left: number; width: number };

export function timelinePieces(startMinute: number, endMinute: number): TimelinePiece[] {
  const start = ((startMinute % 1440) + 1440) % 1440;
  const duration = forwardMinutes(startMinute, endMinute);
  if (duration >= 1440) return [{ left: 0, width: 100 }];
  const end = start + duration;
  if (end <= 1440) return [{ left: (start / 1440) * 100, width: (duration / 1440) * 100 }];
  return [
    { left: (start / 1440) * 100, width: ((1440 - start) / 1440) * 100 },
    { left: 0, width: ((end - 1440) / 1440) * 100 },
  ];
}

export function localDateTimeInput(date = new Date()): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function localInputToIso(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Choose a valid date and time.");
  return date.toISOString();
}

export type FamilyCareSummary = {
  feedCount: number;
  bottleConsumedMl: number;
  pumpedMl: number;
  wetCount: number;
  stoolCount: number;
  completedSleepMinutes: number;
};

function numericData(event: FamilyCareEvent, key: string): number {
  const value = event.data[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function summarizeFamilyCareEvents(
  events: FamilyCareEvent[],
  now = new Date(),
): FamilyCareSummary {
  const start = now.getTime() - 24 * 60 * 60 * 1000;
  return events.reduce<FamilyCareSummary>(
    (summary, event) => {
      const observed = new Date(event.observedAt).getTime();
      if (!Number.isFinite(observed) || observed < start || observed > now.getTime()) return summary;
      if (event.kind === "feed") {
        summary.feedCount += 1;
        if (event.data.method === "bottle") summary.bottleConsumedMl += numericData(event, "consumedMl");
      }
      if (event.kind === "pump") summary.pumpedMl += numericData(event, "expressedMl");
      if (event.kind === "diaper") {
        if (event.data.wet === true) summary.wetCount += 1;
        if (event.data.stool === true) summary.stoolCount += 1;
      }
      if (event.kind === "sleep" && event.endedAt) {
        const end = new Date(event.endedAt).getTime();
        if (Number.isFinite(end) && end > observed) summary.completedSleepMinutes += Math.round((end - observed) / 60_000);
      }
      return summary;
    },
    { feedCount: 0, bottleConsumedMl: 0, pumpedMl: 0, wetCount: 0, stoolCount: 0, completedSleepMinutes: 0 },
  );
}

export function describeFamilyCareEvent(event: FamilyCareEvent): string {
  if (event.kind === "feed") {
    const method = typeof event.data.method === "string" ? event.data.method : "feed";
    const consumed = millilitersToOunces(event.data.consumedMl);
    return consumed ? `${method} · ${consumed} oz consumed` : method;
  }
  if (event.kind === "diaper") {
    return [event.data.wet === true ? "wet" : "", event.data.stool === true ? "stool" : ""].filter(Boolean).join(" + ") || "diaper check";
  }
  if (event.kind === "sleep") return event.endedAt ? "completed observed sleep" : "sleep started · end not logged";
  if (event.kind === "pump") {
    const expressed = millilitersToOunces(event.data.expressedMl);
    return expressed ? `${expressed} oz produced` : "pump session";
  }
  return typeof event.data.title === "string" ? event.data.title : "note";
}

export function eventToInput(event: FamilyCareEvent): FamilyCareEventInput {
  return {
    kind: event.kind,
    observedAt: event.observedAt,
    endedAt: event.endedAt,
    data: event.data,
  };
}
