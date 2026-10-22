import type { ApiErrorPayload } from "~~/types";
import { Prisma } from "../../prisma/generated/client";

/** Create an HTTP error with a consistent client-facing payload. */
export const apiError = (
  statusCode: number,
  statusMessage: string,
  message: string,
  details?: Record<string, string[]>,
) =>
  createError({
    statusCode,
    statusMessage,
    message,
    data: {
      message,
      details,
    } satisfies ApiErrorPayload,
  });

/** Friendly error for a record that does not exist. */
export const notFoundError = (entity = "Data") =>
  apiError(404, "NOT_FOUND", `${entity} tidak ditemukan.`);

/** Friendly error for a uniqueness conflict on a specific field. */
export const conflictError = (field: string, message: string) =>
  apiError(409, "CONFLICT", message, { [field]: [message] });

/**
 * Friendly error for a master record that is still referenced by other records.
 * Archiving (deactivation) is the safe alternative to deletion.
 */
export const inUseError = (entityLabel: string, count: number, countLabel = "produk") =>
  apiError(
    409,
    "CONFLICT",
    `${entityLabel} masih digunakan oleh ${count} ${countLabel}. Nonaktifkan ${entityLabel.toLowerCase()} sebagai gantinya.`,
  );

const getPrismaErrorCode = (error: unknown): string | null =>
  error instanceof Prisma.PrismaClientKnownRequestError ? error.code : null;

/**
 * Safety net for races between a uniqueness pre-check and the actual write:
 * map known Prisma constraint errors to HTTP errors, otherwise return the
 * original error so callers can rethrow it unchanged.
 */
export const toHttpError = (error: unknown, fallbackMessage: string): unknown => {
  const code = getPrismaErrorCode(error);

  if (code === "P2025") return notFoundError();
  if (code === "P2002" || code === "P2003") {
    return apiError(409, "CONFLICT", fallbackMessage);
  }

  return error;
};
