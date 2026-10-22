/**
 * Client-facing error payload returned in the `data` field of Nitro error
 * responses. `details` maps a field name to the list of messages for that field.
 */
export interface ApiErrorPayload {
  message: string;
  details?: Record<string, string[]>;
}
