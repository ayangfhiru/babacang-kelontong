<script setup lang="ts">
import { reactive } from "vue";
import { UserPlus } from "@lucide/vue";
import type { ApiErrorPayload } from "~~/types";

usePageTitle("Daftar");

// Keep in sync with the server-side schema in server/api/auth/[...all].ts.
const USERNAME_PATTERN = /^[a-zA-Z0-9_.]+$/;

const auth = useAuth();

const form = reactive({
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
});
const clientErrors = reactive<Record<string, string>>({});
const serverErrors = reactive<Record<string, string>>({});
const formError = ref("");
const isBusy = ref(false);

const clearErrors = (): void => {
  for (const key of Object.keys(clientErrors)) delete clientErrors[key];
  for (const key of Object.keys(serverErrors)) delete serverErrors[key];
  formError.value = "";
};

const validate = (): boolean => {
  clearErrors();
  const username = form.username.trim();

  if (!username) {
    clientErrors.username = "Username wajib diisi.";
  } else if (username.length < 3 || username.length > 30) {
    clientErrors.username = "Username harus 3–30 karakter.";
  } else if (!USERNAME_PATTERN.test(username)) {
    clientErrors.username = "Username hanya boleh berisi huruf, angka, underscore, dan titik.";
  }

  const email = form.email.trim();
  if (!email) {
    clientErrors.email = "Email wajib diisi.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    clientErrors.email = "Format email tidak valid.";
  }

  if (form.password.length < 8) {
    clientErrors.password = "Password minimal 8 karakter.";
  } else if (form.password.length > 128) {
    clientErrors.password = "Password maksimal 128 karakter.";
  }

  if (form.confirmPassword !== form.password) {
    clientErrors.confirmPassword = "Konfirmasi password tidak sama.";
  }

  return Object.keys(clientErrors).length === 0;
};

const applyServerErrors = (payload: ApiErrorPayload): void => {
  if (!payload.details) {
    formError.value = payload.message;
    return;
  }
  for (const [field, messages] of Object.entries(payload.details)) {
    const key = field === "_" ? "form" : field;
    const target = key === "form" ? formError : serverErrors;
    if (key === "form") formError.value = messages[0] ?? payload.message;
    else target.value = messages[0] ?? payload.message;
  }
};

const handleSubmit = async (): Promise<void> => {
  if (!validate() || isBusy.value) return;
  isBusy.value = true;

  const { error } = await auth.signUp.email({
    // `name` is required by the client type but not part of the form: the
    // server pre-check derives it from the username anyway.
    name: form.username.trim(),
    username: form.username.trim(),
    email: form.email.trim(),
    password: form.password,
  });

  if (error) {
    isBusy.value = false;
    if (typeof error.status === "number" && error.status >= 400 && error.status < 500) {
      // Field-level errors from the server pre-check (confirmPassword, dup
      // username/email) share the ApiErrorPayload shape of our API routes.
      applyServerErrors(
        (error as unknown as { data?: ApiErrorPayload }).data ?? {
          message: "Pendaftaran gagal. Periksa data Anda lalu coba lagi.",
        },
      );
    } else if (error.code === "too_many_requests") {
      formError.value = "Terlalu banyak percobaan. Tunggu beberapa saat lalu coba lagi.";
    } else {
      formError.value = "Pendaftaran gagal. Silakan coba lagi.";
    }
    return;
  }

  // autoSignIn (default) makes this the first session; the global middleware
  // bounces signed-in users away from /register on the next navigation.
  await navigateTo("/admin/master-data/products");
};
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-paper px-4 py-10">
    <div class="w-full max-w-md">
      <div class="mb-8 text-center">
        <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          Babacang Kelontong
        </p>
        <h1 class="mt-2 font-display text-2xl font-bold">Buat akun baru</h1>
        <p class="mt-2 text-sm text-muted">
          Akun baru otomatis berperan sebagai staf.
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
          v-model="form.username"
          label="Username"
          placeholder="contoh: budi.toko"
          required
          :error="clientErrors.username ?? serverErrors.username"
          :disabled="isBusy"
          :maxlength="30"
        />

        <BaseInput
          v-model="form.email"
          label="Email"
          type="email"
          placeholder="nama@example.com"
          required
          :error="clientErrors.email ?? serverErrors.email"
          :disabled="isBusy"
        />

        <BaseInput
          v-model="form.password"
          label="Password"
          type="password"
          hint="Minimal 8 karakter."
          required
          :error="clientErrors.password ?? serverErrors.password"
          :disabled="isBusy"
        />

        <BaseInput
          v-model="form.confirmPassword"
          label="Konfirmasi Password"
          type="password"
          required
          :error="clientErrors.confirmPassword ?? serverErrors.confirmPassword"
          :disabled="isBusy"
        />

        <BaseButton type="submit" block :loading="isBusy">
          <UserPlus class="mr-2 h-4 w-4" />
          Daftar
        </BaseButton>

        <p class="text-center text-sm text-muted">
          Sudah punya akun?
          <NuxtLink to="/login" class="font-semibold text-brand hover:underline">
            Masuk di sini
          </NuxtLink>
        </p>
      </form>
    </div>
  </main>
</template>
