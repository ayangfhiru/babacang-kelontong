import type { H3Event } from "h3";
import type { SessionUser } from "~~/types";
import { apiError } from "./api";

/**
 * Server-side gate for the admin-only modules (§9).
 *
 * - No session at all            → 401 (requireUserSession)
 * - Session without ADMIN role   → 403
 *
 * The identity always comes from the verified session cookie — never from a
 * client-supplied `userId`.
 */
export const requireAdmin = async (event: H3Event): Promise<SessionUser> => {
  const session = await requireUserSession(event, {
    statusCode: 401,
    message: "Anda belum masuk. Silakan login terlebih dahulu.",
  });

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
    role: session.user.role,
  };
};
