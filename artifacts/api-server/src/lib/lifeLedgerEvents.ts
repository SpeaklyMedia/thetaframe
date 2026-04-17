import { z } from "zod";
import { db, lifeLedgerEventsTable } from "@workspace/db";
import { CreateLifeLedgerEntryBody } from "@workspace/api-zod";

type CreateLifeLedgerEntryBodyType = z.infer<typeof CreateLifeLedgerEntryBody>;

export class LifeLedgerEventValidationError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function validateLifeLedgerEventCreateData(data: unknown): CreateLifeLedgerEntryBodyType {
  const parsed = CreateLifeLedgerEntryBody.safeParse(data);

  if (!parsed.success) {
    throw new LifeLedgerEventValidationError(422, parsed.error.message);
  }

  return parsed.data;
}

export async function createLifeLedgerEventForUser({
  userId,
  data,
}: {
  userId: string;
  data: CreateLifeLedgerEntryBodyType;
}) {
  const [entry] = await db
    .insert(lifeLedgerEventsTable)
    .values({
      userId,
      tab: "events",
      ...data,
    })
    .returning();

  return entry;
}
