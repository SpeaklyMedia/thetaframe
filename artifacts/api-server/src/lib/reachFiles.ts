import { and, eq } from "drizzle-orm";
import { db, reachFilesTable } from "@workspace/db";
import { z } from "zod";

const reachFileMetadataApplySchema = z
  .object({
    notes: z.string().nullable().optional(),
    summary: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
  })
  .passthrough();

export class ReachFileApplyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReachFileApplyValidationError";
  }
}

export function validateReachFileMetadataApplyData(payload: unknown): { notes: string } {
  const parsed = reachFileMetadataApplySchema.safeParse(payload);

  if (!parsed.success) {
    throw new ReachFileApplyValidationError(parsed.error.message);
  }

  const notes =
    parsed.data.summary?.trim() ||
    parsed.data.notes?.trim() ||
    parsed.data.title?.trim() ||
    "";

  if (notes.length === 0) {
    throw new ReachFileApplyValidationError(
      "REACH file summary drafts must include summary, notes, or title text before they can be applied.",
    );
  }

  return { notes };
}

export async function applyReachFileMetadataForUser({
  userId,
  reachFileId,
  data,
}: {
  userId: string;
  reachFileId: number;
  data: { notes: string };
}) {
  const [updated] = await db
    .update(reachFilesTable)
    .set({
      notes: data.notes,
      updatedAt: new Date(),
    })
    .where(and(eq(reachFilesTable.id, reachFileId), eq(reachFilesTable.userId, userId)))
    .returning();

  return updated ?? null;
}
