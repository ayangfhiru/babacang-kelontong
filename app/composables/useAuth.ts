import { createAuthClient } from "better-auth/vue";
import { inferAdditionalFields, usernameClient } from "better-auth/client/plugins";
import type { auth } from "~~/server/utils/auth";

/**
 * Better Auth client for the Vue app.
 *
 * During SSR the incoming request's cookie header is forwarded so
 * `useSession`/actions see the same session as the server; in the browser the
 * default `credentials: "include"` handles it.
 */
export const useAuth = () => {
  const url = useRequestURL();
  const headers = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;

  return createAuthClient({
    baseURL: url.origin,
    fetchOptions: { headers },
    // `inferAdditionalFields` surfaces server-owned fields (e.g. `role`) on
    // the session user type without importing server code at runtime.
    plugins: [inferAdditionalFields<typeof auth>(), usernameClient()],
  });
};
