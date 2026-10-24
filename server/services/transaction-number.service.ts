import { Prisma } from "../../prisma/generated/client";

type Tx = Prisma.TransactionClient;

export type NumberPrefix = "PO" | "INV" | "RTN" | "ADJ";

const pad = (value: number, length = 4): string => String(value).padStart(length, "0");

/** "YYYYMMDD" of the given date in UTC. */
const datePart = (date: Date): string => date.toISOString().slice(0, 10).replaceAll("-", "");

/**
 * Build the next sequential number for a document type on a given day:
 * `PO-20261023-0001`, `INV-20261023-0002`, …
 *
 * The counter restarts every day. Races are handled by `withNumberRetry`,
 * which re-runs the create when the unique index rejects a duplicate number.
 */
export const nextDocumentNumber = async (
  tx: Tx,
  prefix: NumberPrefix,
  model: "purchase" | "sales" | "return" | "stockAdjustment",
  date: Date,
): Promise<string> => {
  const day = datePart(date);
  const where = { number: { startsWith: `${prefix}-${day}-` } };

  // Each model has its own WhereInput and delegate type; a switch keeps the
  // count call type-safe instead of calling it on a union of delegates.
  let count: number;
  switch (model) {
    case "purchase":
      count = await tx.purchase.count({ where });
      break;
    case "sales":
      count = await tx.sales.count({ where });
      break;
    case "return":
      count = await tx.return.count({ where });
      break;
    case "stockAdjustment":
      count = await tx.stockAdjustment.count({ where });
      break;
  }

  return `${prefix}-${day}-${pad(count + 1)}`;
};

const isDuplicateNumberError = (error: unknown): boolean => {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== "P2002") return false;
  const target = error.meta?.target;
  return Array.isArray(target) ? target.includes("number") : target === "number";
};

/**
 * Run `createWithNumber` and retry when the per-day sequence collided with a
 * concurrent insert (unique index on `number`). Keeps posting idempotent-safe
 * under concurrent requests (§10).
 */
export const withNumberRetry = async <T>(createWithNumber: () => Promise<T>): Promise<T> => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await createWithNumber();
    } catch (error) {
      if (attempt >= 3 || !isDuplicateNumberError(error)) throw error;
    }
  }
};
