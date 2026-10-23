import type { ZodError, ZodType } from "zod";
import { z } from "zod";
import type { ApiErrorPayload } from "~~/types";

const buildFieldDetails = (error: ZodError): Record<string, string[]> =>
  error.issues.reduce<Record<string, string[]>>((details, issue) => {
    const field = issue.path.join(".") || "_";
    details[field] = [...(details[field] ?? []), issue.message];
    return details;
  }, {});

/** Build a 400 error carrying field-level validation details. */
export const buildValidationError = (error: ZodError) => {
  const message = "Data yang dikirim tidak valid.";
  return createError({
    statusCode: 400,
    statusMessage: "VALIDATION_ERROR",
    message,
    data: {
      message,
      details: buildFieldDetails(error),
    } satisfies ApiErrorPayload,
  });
};

/** Validate untrusted input (body, query, params) against a Zod schema. */
export const parseWithSchema = <T>(schema: ZodType<T>, input: unknown): T => {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  throw buildValidationError(result.error);
};

/** Shared pagination + search query schema for collection endpoints. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).optional(),
});

/** Status filter shared by master data modules (`?isActive=true|false`). */
export const statusFilterSchema = z.stringbool().optional();

/** Route param schema for `:id` (UUID identifiers). */
export const idParamSchema = z
  .string()
  .trim()
  .min(1, "Identifier wajib diisi.")
  .max(64, "Identifier terlalu panjang.");

/** `<input type="date">` value: "YYYY-MM-DD" that must be a real calendar date. */
export const isoDateInputSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid.")
  .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()), {
    message: "Tanggal tidak valid.",
  });

/** `<input type="datetime-local">` value: "YYYY-MM-DDTHH:mm". */
export const isoDateTimeInputSchema = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: "Waktu tidak valid.",
  });

/** Normalize an optional free-text field: empty string becomes null. */
export const optionalTrimmedText = (maxLength: number, message: string) =>
  z
    .string()
    .trim()
    .max(maxLength, message)
    .nullish();
