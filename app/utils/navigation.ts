/**
 * Whether a redirect target is a same-origin path.
 *
 * Guards against open redirects after login: rejects absolute URLs,
 * protocol-relative `//host` targets, and backslash variants browsers
 * normalize to `//`.
 */
export const isSafeInternalPath = (value: unknown): value is string => {
  if (typeof value !== "string" || !value.startsWith("/")) return false;
  return !value.startsWith("//") && !value.startsWith("/\\");
};
