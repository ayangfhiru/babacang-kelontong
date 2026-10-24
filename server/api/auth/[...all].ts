import { z } from "zod";
import { readRawBody } from "h3";
import { auth } from "../../utils/auth";
import { apiError } from "../../utils/api";
import { parseWithSchema } from "../../utils/validation";

// Mirrors the Better Auth username plugin defaults (3–30 chars, alphanumeric
// plus underscore/dot) so the client-facing error is consistent with signup.
const USERNAME_PATTERN = /^[a-zA-Z0-9_.]+$/;

const signUpBodySchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, "Username minimal 3 karakter.")
      .max(30, "Username maksimal 30 karakter.")
      .regex(USERNAME_PATTERN, "Username hanya boleh berisi huruf, angka, underscore, dan titik."),
    email: z.string().trim().email("Format email tidak valid."),
    password: z.string().min(8, "Password minimal 8 karakter.").max(128, "Password maksimal 128 karakter."),
    confirmPassword: z.string(),
  })
  .refine((body) => body.password === body.confirmPassword, {
    message: "Konfirmasi password tidak sama.",
    path: ["confirmPassword"],
  });

const isSignUpRequest = (path: string, method: string | undefined): boolean =>
  method === "POST" && path.replace(/\/+$/, "").endsWith("/sign-up/email");

/**
 * Catch-all handler for every Better Auth route (`/api/auth/*`).
 *
 * Sign-up additionally validates `confirmPassword` (a form-only field that
 * Better Auth itself does not know about) before forwarding the request to
 * the auth handler with only the whitelisted fields. This is a pre-check on
 * the official endpoint — not a duplicate signup route.
 */
export default defineEventHandler(async (event) => {
  if (!isSignUpRequest(event.path, event.method)) {
    return auth.handler(toWebRequest(event));
  }

  const rawBody = await readRawBody(event, "utf8");
  let parsed: unknown;
  try {
    parsed = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    throw apiError(400, "VALIDATION_ERROR", "Data yang dikirim tidak valid.");
  }
  const validated = parseWithSchema(signUpBodySchema, parsed);

  // Explicit whitelist: only fields Better Auth's signup understands are
  // forwarded (no `confirmPassword`, no client-supplied `role`/`name`).
  const body = {
    username: validated.username,
    email: validated.email,
    password: validated.password,
  };

  // `name` is not part of the signup form (PROMT §4): default it from the
  // username. The role stays server-owned via `additionalFields.input=false`.
  const forwardRequest = new Request(toWebRequest(event), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...body, name: body.username }),
  });

  return auth.handler(forwardRequest);
});
