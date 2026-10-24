/**
 * Global route guard:
 * - `/admin/**` requires a session (→ `/login?redirect=...`).
 * - `/login` and `/register` bounce already-signed-in users to the app.
 *
 * A single global middleware keeps the rule in one place instead of adding
 * `definePageMeta` to every admin page.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const isAuthPage = to.path === "/login" || to.path === "/register";
  const isAdminArea = to.path.startsWith("/admin");

  if (!isAuthPage && !isAdminArea) return;

  const auth = useAuth();
  const { data: session } = await auth.useSession(useFetch);
  const signedIn = Boolean(session.value?.user);

  if (isAdminArea && !signedIn) {
    return navigateTo({ path: "/login", query: { redirect: to.fullPath } });
  }

  if (isAuthPage && signedIn) {
    const redirect = typeof to.query.redirect === "string" ? to.query.redirect : "";
    // Only honor same-origin relative paths to avoid open redirects.
    return navigateTo(redirect.startsWith("/") ? redirect : "/admin/master-data/products");
  }
});
