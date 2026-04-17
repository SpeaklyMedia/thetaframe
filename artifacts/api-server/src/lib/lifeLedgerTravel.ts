import { z } from "zod";
import { db, lifeLedgerTravelTable } from "@workspace/db";
import { CreateLifeLedgerEntryBody } from "@workspace/api-zod";

type CreateLifeLedgerEntryBodyType = z.infer<typeof CreateLifeLedgerEntryBody>;

export class LifeLedgerTravelValidationError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function validateLifeLedgerTravelCreateData(data: unknown): CreateLifeLedgerEntryBodyType {
  const parsed = CreateLifeLedgerEntryBody.safeParse(data);

  if (!parsed.success) {
    throw new LifeLedgerTravelValidationError(422, parsed.error.message);
  }

  return parsed.data;
}

export async function createLifeLedgerTravelEntryForUser({
  userId,
  data,
}: {
  userId: string;
  data: CreateLifeLedgerEntryBodyType;
}) {
  const [entry] = await db
    .insert(lifeLedgerTravelTable)
    .values({
      userId,
      tab: "travel",
      ...data,
    })
    .returning();

  return entry;
}
