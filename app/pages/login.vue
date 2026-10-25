<script setup lang="ts">
import { reactive } from "vue";
import { LogIn } from "@lucide/vue";
import { isSafeInternalPath } from "~/utils/navigation";

definePageMeta({ layout: "auth" });

usePageTitle("Masuk");

const auth = useAuth();
const notify = useNotify();
const route = useRoute();

const form = reactive({ identifier: "", password: "" });
const clientErrors = reactive<Record<string, string>>({});
const formError = ref("");
const isBusy = ref(false);

const clearErrors = (): void => {
  for (const key of Object.keys(clientErrors)) delete clientErrors[key];
  formError.value = "";
};

const validate = (): boolean => {
  clearErrors();
  if (!form.identifier.trim()) clientErrors.identifier = "Email atau username wajib diisi.";
  if (!form.password) clientErrors.password = "Password wajib diisi.";
  return Object.keys(clientErrors).length === 0;
};

// Better Auth exposes separate endpoints for email and username sign-in; the
// identifier shape decides which one to call.
const looksLikeEmail = (value: string): boolean => value.includes("@");

const handleSubmit = async (): Promise<void> => {
  if (!validate() || isBusy.value) return;
  isBusy.value = true;

  const identifier = form.identifier.trim();
  const credentials = { password: form.password, rememberMe: true };
  const { data, error } = looksLikeEmail(identifier)
    ? await auth.signIn.email({ email: identifier, ...credentials })
    : await auth.signIn.username({ username: identifier, ...credentials });

  if (error) {
    isBusy.value = false;
    // Better Auth returns SCREAMING_SNAKE_CASE codes (e.g.
    // INVALID_EMAIL_OR_PASSWORD); normalize so the mapping always matches.
    const code = error.code?.toUpperCase() ?? "";
    formError.value =
      code === "INVALID_EMAIL_OR_PASSWORD" || code === "INVALID_USERNAME_OR_PASSWORD"
        ? "Email/username atau password salah."
        : code === "TOO_MANY_REQUESTS" || code === "RATE_LIMIT_EXCEEDED"
          ? "Terlalu banyak percobaan login. Tunggu beberapa saat lalu coba lagi."
          : "Login gagal. Silakan coba lagi.";
    return;
  }

  // Redirect only after the server handed back a session token (the session
  // cookie is set on this same response, so the route guard sees it too).
  if (!data?.token) {
    isBusy.value = false;
    formError.value = "Login gagal. Silakan coba lagi.";
    return;
  }

  notify.success("Login berhasil. Selamat datang kembali!");

  const redirect = isSafeInternalPath(route.query.redirect)
    ? route.query.redirect
    : "/dashboard";
  await navigateTo(redirect);
};
</script>

<template>
  <main class="w-full max-w-md">
    <div class="mb-8 text-center">
      <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
        Babacang Kelontong
      </p>
      <h1 class="mt-2 font-display text-2xl font-bold">Masuk ke akun Anda</h1>
      <p class="mt-2 text-sm text-muted">
        Gunakan email atau username terdaftar.
      </p>
    </div>

    <form
      class="space-y-5 rounded-3xl border border-line/70 bg-surface p-6 shadow-sm"
      novalidate
      @submit.prevent="handleSubmit"
    >
      <div
        v-if="formError"
        role="alert"
        class="rounded-2xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm font-medium text-coral"
      >
        {{ formError }}
      </div>

      <BaseInput
        v-model="form.identifier"
        label="Email atau Username"
        placeholder="admin@example.com"
        required
        :error="clientErrors.identifier"
        :disabled="isBusy"
      />

      <BaseInput
        v-model="form.password"
        label="Password"
        type="password"
        required
        :error="clientErrors.password"
        :disabled="isBusy"
      />

      <BaseButton type="submit" block :loading="isBusy">
        <LogIn class="mr-2 h-4 w-4" />
        Masuk
      </BaseButton>

      <p class="text-center text-sm text-muted">
        Belum punya akun?
        <NuxtLink to="/register" class="font-semibold text-brand hover:underline">
          Daftar di sini
        </NuxtLink>
      </p>
    </form>
  </main>
</template>
