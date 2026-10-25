import { isSafeInternalPath } from "~/utils/navigation";

/**
 * Global route guard:
 * - `/admin/**` and `/dashboard` require a session (→ `/login?redirect=...`).
 * - `/login` and `/register` bounce already-signed-in users to `/dashboard`.
 *
 * A single global middleware keeps the rule in one place instead of adding
 * `definePageMeta` to every protected page. The session is always fetched
 * server-side here — a client-only check would be trivially bypassable.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const isAuthPage = to.path === "/login" || to.path === "/register";
  const isProtectedArea = to.path.startsWith("/admin") || to.path === "/dashboard";

  if (!isAuthPage && !isProtectedArea) return;

  const auth = useAuth();
  // `getSession()` (not `useSession(useFetch)`) always performs a fresh
  // request: on client-side navigations the composable variant can reuse the
  // "no session" payload cached during SSR and would bounce a user who just
  // signed in back to /login.
  const { data: session } = await auth.getSession();
  const signedIn = Boolean(session?.user);

  if (isProtectedArea && !signedIn) {
    return navigateTo({ path: "/login", query: { redirect: to.fullPath } });
  }

  if (isAuthPage && signedIn) {
    const redirect = to.query.redirect;
    // Only honor same-origin relative paths to avoid open redirects.
    return navigateTo(isSafeInternalPath(redirect) ? redirect : "/dashboard");
  }
});
