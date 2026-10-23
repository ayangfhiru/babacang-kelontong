export type UserRole = "ADMIN" | "STAFF";

/** Authenticated user as exposed through the session cookie. */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: SessionUser;
}

// Augment the nuxt-auth-utils session `User` so `useUserSession().user`
// carries the verified identity instead of `Record<string, unknown>`.
declare module "#auth-utils" {
  interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  }
}
