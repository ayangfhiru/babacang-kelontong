import { z } from "zod";
import { readRawBody } from "h3";
import { auth } from "../../utils/auth";
import { apiError, conflictError } from "../../utils/api";
import { prisma } from "../../utils/db";
import { parseWithSchema } from "../../utils/validation";

// Mirrors the Better Auth username plugin defaults (3–30 chars, alphanumeric
// plus underscore/dot) so the client-facing error is consistent with signup.
const USERNAME_PATTERN = /^[a-zA-Z0-9_.]+$/;

const signUpBodySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Nama minimal 2 karakter.")
      .max(50, "Nama maksimal 50 karakter."),
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

  // With `autoSignIn: false`, Better Auth intentionally answers an existing
  // email with a generic 200 response (anti-enumeration), which would show a
  // false "registration successful" toast. Uniqueness is therefore verified
  // here — same server, same endpoint — before forwarding.
  const normalizedEmail = validated.email.toLowerCase();
  const [existingEmail, existingUsername] = await Promise.all([
    prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } }),
    prisma.user.findUnique({ where: { username: validated.username }, select: { id: true } }),
  ]);

  if (existingEmail) {
    throw conflictError(
      "email",
      "Email sudah terdaftar. Gunakan email lain atau silakan login.",
    );
  }
  if (existingUsername) {
    throw conflictError("username", "Username sudah digunakan. Pilih username lain.");
  }

  // Explicit whitelist: only fields validated above are forwarded to
  // Better Auth (no `confirmPassword`, no client-supplied `role`).
  const body = {
    name: validated.name,
    username: validated.username,
    email: validated.email,
    password: validated.password,
  };

  const forwardRequest = new Request(toWebRequest(event), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  return auth.handler(forwardRequest);
});
