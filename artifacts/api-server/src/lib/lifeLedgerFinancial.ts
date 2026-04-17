import { z } from "zod";
import { db, lifeLedgerFinancialTable } from "@workspace/db";
import { CreateLifeLedgerEntryBody } from "@workspace/api-zod";

type CreateLifeLedgerEntryBodyType = z.infer<typeof CreateLifeLedgerEntryBody>;

export class LifeLedgerFinancialValidationError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function validateLifeLedgerFinancialCreateData(data: unknown): CreateLifeLedgerEntryBodyType {
  const parsed = CreateLifeLedgerEntryBody.safeParse(data);

  if (!parsed.success) {
    throw new LifeLedgerFinancialValidationError(422, parsed.error.message);
  }

  return parsed.data;
}

export async function createLifeLedgerFinancialEntryForUser({
  userId,
  data,
}: {
  userId: string;
  data: CreateLifeLedgerEntryBodyType;
}) {
  const [entry] = await db
    .insert(lifeLedgerFinancialTable)
    .values({
      userId,
      tab: "financial",
      ...data,
    })
    .returning();

  return entry;
}
