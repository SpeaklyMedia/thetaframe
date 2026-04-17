import { db, dailyFramesTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { UpsertDailyFrameBody } from "@workspace/api-zod";
import { z } from "zod";
import { randomUUID } from "node:crypto";

type UpsertDailyFrameBodyType = z.infer<typeof UpsertDailyFrameBody>;

export class DailyFrameValidationError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function validateDailyFrameUpsertData(data: unknown): UpsertDailyFrameBodyType {
  const parsed = UpsertDailyFrameBody.safeParse(data);

  if (!parsed.success) {
    throw new DailyFrameValidationError(422, parsed.error.message);
  }

  if (parsed.data.tierA.length > 3) {
    throw new DailyFrameValidationError(422, "Tier A may not contain more than 3 tasks.");
  }

  return parsed.data;
}

export async function upsertDailyFrameForUser({
  userId,
  date,
  data,
}: {
  userId: string;
  date: string;
  data: UpsertDailyFrameBodyType;
}) {
  const [frame] = await db
    .insert(dailyFramesTable)
    .values({
      userId,
      date,
      colourState: data.colourState,
      tierA: data.tierA,
      tierB: data.tierB,
      timeBlocks: data.timeBlocks,
      microWin: data.microWin ?? null,
      skipProtocolUsed: data.skipProtocolUsed,
      skipProtocolChoice: data.skipProtocolChoice ?? null,
    })
    .onConflictDoUpdate({
      target: [dailyFramesTable.userId, dailyFramesTable.date],
      set: {
        colourState: data.colourState,
        tierA: data.tierA,
        tierB: data.tierB,
        timeBlocks: data.timeBlocks,
        microWin: data.microWin ?? null,
        skipProtocolUsed: data.skipProtocolUsed,
        skipProtocolChoice: data.skipProtocolChoice ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  return frame;
}

export function buildDefaultDailyFrameUpsertData() {
  return {
    colourState: "green" as const,
    tierA: [],
    tierB: [],
    timeBlocks: [],
    microWin: null,
    skipProtocolUsed: false,
    skipProtocolChoice: null,
  };
}

export async function captureDailyQuickTaskForUser(args: {
  userId: string;
  date: string;
  text: string;
}) {
  const trimmedText = args.text.trim();
  if (!trimmedText) {
    throw new DailyFrameValidationError(400, "Quick capture text cannot be blank.");
  }

  const [existingFrame] = await db
    .select()
    .from(dailyFramesTable)
    .where(and(eq(dailyFramesTable.userId, args.userId), eq(dailyFramesTable.date, args.date)));

  const capturedTask = {
    id: randomUUID(),
    text: trimmedText,
    completed: false,
  };

  const base = existingFrame
    ? {
        colourState: existingFrame.colourState as UpsertDailyFrameBodyType["colourState"],
        tierA: Array.isArray(existingFrame.tierA) ? (existingFrame.tierA as UpsertDailyFrameBodyType["tierA"]) : [],
        tierB: Array.isArray(existingFrame.tierB) ? (existingFrame.tierB as UpsertDailyFrameBodyType["tierB"]) : [],
        timeBlocks: Array.isArray(existingFrame.timeBlocks)
          ? (existingFrame.timeBlocks as UpsertDailyFrameBodyType["timeBlocks"])
          : [],
        microWin: existingFrame.microWin ?? null,
        skipProtocolUsed: existingFrame.skipProtocolUsed,
        skipProtocolChoice: existingFrame.skipProtocolChoice as UpsertDailyFrameBodyType["skipProtocolChoice"],
      }
    : buildDefaultDailyFrameUpsertData();

  const frame = await upsertDailyFrameForUser({
    userId: args.userId,
    date: args.date,
    data: validateDailyFrameUpsertData({
      ...base,
      tierB: [capturedTask, ...base.tierB],
    }),
  });

  return {
    frame,
    capturedTaskId: capturedTask.id,
  };
}
