import { z } from "zod";
import { db, lifeLedgerSubscriptionsTable } from "@workspace/db";
import { CreateLifeLedgerEntryBody } from "@workspace/api-zod";

type CreateLifeLedgerEntryBodyType = z.infer<typeof CreateLifeLedgerEntryBody>;

export class LifeLedgerSubscriptionsValidationError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function validateLifeLedgerSubscriptionsCreateData(data: unknown): CreateLifeLedgerEntryBodyType {
  const parsed = CreateLifeLedgerEntryBody.safeParse(data);

  if (!parsed.success) {
    throw new LifeLedgerSubscriptionsValidationError(422, parsed.error.message);
  }

  return parsed.data;
}

export async function createLifeLedgerSubscriptionForUser({
  userId,
  data,
}: {
  userId: string;
  data: CreateLifeLedgerEntryBodyType;
}) {
  const [entry] = await db
    .insert(lifeLedgerSubscriptionsTable)
    .values({
      userId,
      tab: "subscriptions",
      ...data,
    })
    .returning();

  return entry;
}
