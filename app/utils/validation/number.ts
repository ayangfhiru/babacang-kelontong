/**
 * Strict parsers for user-entered numbers. They never coerce empty or
 * half-typed input with `Number()` — invalid values return `null` so callers
 * can show a validation message instead of storing `NaN` or `0` by accident.
 */

/** Parse a non-negative integer string ("0", "12"); empty/invalid → null. */
export const parseNonNegativeInt = (value: string): number | null => {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

/** Parse a positive integer string ("1", "12"); empty/invalid → null. */
export const parsePositiveInt = (value: string): number | null => {
  const parsed = parseNonNegativeInt(value);
  return parsed !== null && parsed > 0 ? parsed : null;
};

/** Parse a non-negative money string ("1500", "1500.50"); empty/invalid → null. */
export const parseNonNegativeMoney = (value: string): number | null => {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};
