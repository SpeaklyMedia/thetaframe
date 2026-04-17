import { z } from "zod";
import { thetaExternalLinkRefSchema } from "./schemas";

export const thetaCalendarLinkSchema = thetaExternalLinkRefSchema.extend({
  provider: z.literal("google_calendar"),
  calendarId: z.string().min(1),
  eventId: z.string().min(1),
});

export type ThetaCalendarLink = z.infer<typeof thetaCalendarLinkSchema>;

export function isThetaCalendarLink(value: unknown): value is ThetaCalendarLink {
  return thetaCalendarLinkSchema.safeParse(value).success;
}
