/**
 * Round to 2 decimal places using half-up rounding.
 * All monetary arithmetic on the server goes through this so stored totals,
 * COGS, and discounts stay consistent with Decimal(14, 2) columns.
 */
export const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

/** Safely convert a Prisma Decimal (or number) to a plain number. */
export const toMoney = (value: unknown): number =>
  value === null || value === undefined ? 0 : Number(value);
