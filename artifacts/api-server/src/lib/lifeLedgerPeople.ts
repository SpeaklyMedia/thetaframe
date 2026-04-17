import { z } from "zod";
import { db, lifeLedgerPeopleTable } from "@workspace/db";
import { CreateLifeLedgerEntryBody } from "@workspace/api-zod";

type CreateLifeLedgerEntryBodyType = z.infer<typeof CreateLifeLedgerEntryBody>;

export class LifeLedgerPeopleValidationError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function validateLifeLedgerPeopleCreateData(data: unknown): CreateLifeLedgerEntryBodyType {
  const parsed = CreateLifeLedgerEntryBody.safeParse(data);

  if (!parsed.success) {
    throw new LifeLedgerPeopleValidationError(422, parsed.error.message);
  }

  return parsed.data;
}

export async function createLifeLedgerPersonForUser({
  userId,
  data,
}: {
  userId: string;
  data: CreateLifeLedgerEntryBodyType;
}) {
  const [entry] = await db
    .insert(lifeLedgerPeopleTable)
    .values({
      userId,
      tab: "people",
      ...data,
    })
    .returning();

  return entry;
}
