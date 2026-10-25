import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { username } from "better-auth/plugins";
import type { H3Event } from "h3";
import type { SessionUser, UserRole } from "~~/types";
import { prisma } from "./db";
import { apiError } from "./api";
import { hashPassword, verifyPassword } from "./password";

/**
 * Better Auth instance. Reads `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` from
 * the environment automatically (see `.env.example`).
 */
export const auth = betterAuth({
  // `role` is a server-owned additional field: never accepted from sign-up or
  // update payloads (`input: false`), always returned on the session user.
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "STAFF",
        input: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    // Registration must NOT open a session: after signing up the user is
    // redirected to `/login` to sign in with their own credentials.
    autoSignIn: false,
    // Custom hasher compatible with the legacy `prisma/seed.ts` format so
    // pre-existing accounts keep working (see server/utils/password.ts).
    password: { hash: hashPassword, verify: verifyPassword },
  },
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  advanced: {
    database: {
      // The project's auth tables use `uuid` primary keys (@db.Uuid) — the
      // default nanoid base64 ids would violate the column type.
      generateId: "uuid",
    },
  },
  plugins: [username()],
});

/**
 * Server-side gate for the admin-only modules (§9).
 *
 * - No session at all        → 401
 * - Session without ADMIN    → 403
 *
 * The identity always comes from the verified session cookie — never from a
 * client-supplied `userId`.
 */
export const requireAdmin = async (event: H3Event): Promise<SessionUser> => {
  const session = await auth.api.getSession({ headers: event.headers });

  if (!session?.user) {
    throw apiError(
      401,
      "UNAUTHORIZED",
      "Anda belum masuk. Silakan login terlebih dahulu.",
    );
  }

  if (session.user.role !== "ADMIN") {
    throw apiError(
      403,
      "FORBIDDEN",
      "Akses ditolak. Hanya admin yang dapat mengelola transaksi dan stok.",
    );
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role as UserRole,
  };
};
