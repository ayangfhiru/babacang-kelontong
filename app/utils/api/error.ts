import type { ApiErrorPayload } from "~~/types";

const FALLBACK_PAYLOAD: ApiErrorPayload = {
  message: "Permintaan gagal diproses. Silakan coba lagi.",
};

const isStringRecord = (value: unknown): value is Record<string, string[]> => {
  if (!value || typeof value !== "object") return false;
  return Object.values(value).every(
    (item) => Array.isArray(item) && item.every((entry) => typeof entry === "string"),
  );
};

/**
 * Extract the client-facing error payload from an ofetch/Nitro error body
 * (`{ statusCode, message, data: ApiErrorPayload }`).
 */
const extractPayload = (body: unknown): ApiErrorPayload | null => {
  if (!body || typeof body !== "object") return null;

  const { data, message } = body as { data?: unknown; message?: unknown };

  if (data && typeof data === "object" && "message" in data) {
    const inner = data as { message?: unknown; details?: unknown };
    if (typeof inner.message === "string") {
      return {
        message: inner.message,
        details: isStringRecord(inner.details) ? inner.details : undefined,
      };
    }
  }

  if (typeof message === "string" && message.length > 0) return { message };

  return null;
};

/**
 * Normalize any client-side request failure into a displayable payload with an
 * optional `details` map (field name -> messages) for form-level errors.
 */
export const getApiErrorPayload = (error: unknown): ApiErrorPayload => {
  if (error && typeof error === "object" && "data" in error) {
    const payload = extractPayload((error as { data: unknown }).data);
    if (payload) return payload;
  }

  return FALLBACK_PAYLOAD;
};
