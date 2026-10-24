export type UserRole = "ADMIN" | "STAFF";

/** Authenticated user as exposed through the Better Auth session cookie. */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}
