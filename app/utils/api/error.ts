import type { ApiErrorPayload } from "~~/types";

const FALLBACK_PAYLOAD: ApiErrorPayload = {
  message: "Permintaan gagal diproses. Silakan coba lagi.",
};

const CONNECTION_PAYLOAD: ApiErrorPayload = {
  message: "Tidak dapat terhubung ke server. Periksa koneksi internet Anda lalu coba lagi.",
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
 * Duck-typed check for an ofetch `FetchError` (ofetch is a transitive
 * dependency, so its class cannot be imported here). Every FetchError defines
 * `request`/`response` getters; a transport failure has no response, hence no
 * numeric `statusCode`.
 */
const isTransportError = (error: object): boolean =>
  "request" in error &&
  "response" in error &&
  !("statusCode" in error && typeof (error as { statusCode?: unknown }).statusCode === "number");

/**
 * Normalize any client-side request failure into a displayable payload with an
 * optional `details` map (field name -> messages) for form-level errors.
 */
export const getApiErrorPayload = (error: unknown): ApiErrorPayload => {
  if (error && typeof error === "object" && "data" in error) {
    const payload = extractPayload((error as { data: unknown }).data);
    if (payload) return payload;
  }

  if (error instanceof Error && isTransportError(error)) return CONNECTION_PAYLOAD;

  return FALLBACK_PAYLOAD;
};
