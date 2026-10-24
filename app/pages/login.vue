<script setup lang="ts">
import { reactive } from "vue";
import { LogIn } from "@lucide/vue";

usePageTitle("Masuk");

const auth = useAuth();
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
  const { error } = looksLikeEmail(identifier)
    ? await auth.signIn.email({ email: identifier, ...credentials })
    : await auth.signIn.username({ username: identifier, ...credentials });

  if (error) {
    isBusy.value = false;
    formError.value =
      error.code === "invalid_email_or_password" || error.code === "invalid_username_or_password"
        ? "Email/username atau password salah."
        : error.code === "too_many_requests"
          ? "Terlalu banyak percobaan login. Tunggu beberapa saat lalu coba lagi."
          : "Login gagal. Silakan coba lagi.";
    return;
  }

  const redirect =
    typeof route.query.redirect === "string" && route.query.redirect.startsWith("/")
      ? route.query.redirect
      : "/admin/master-data/products";
  await navigateTo(redirect);
};
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-paper px-4 py-10">
    <div class="w-full max-w-md">
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
    </div>
  </main>
</template>
