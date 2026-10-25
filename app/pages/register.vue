<script setup lang="ts">
import { UserPlus } from "@lucide/vue";
import { reactive } from "vue";
import type { ApiErrorPayload } from "~~/types";

definePageMeta({ layout: "auth" });

usePageTitle("Daftar");

// Keep in sync with the server-side schema in server/api/auth/[...all].ts.
const USERNAME_PATTERN = /^[a-zA-Z0-9_.]+$/;

const auth = useAuth();
const notify = useNotify();

const form = reactive({
  name: "",
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

  const name = form.name.trim();
  if (!name) {
    clientErrors.name = "Nama wajib diisi.";
  } else if (name.length < 2 || name.length > 50) {
    clientErrors.name = "Nama harus 2–50 karakter.";
  }

  const username = form.username.trim();
  if (!username) {
    clientErrors.username = "Username wajib diisi.";
  } else if (username.length < 3 || username.length > 30) {
    clientErrors.username = "Username harus 3–30 karakter.";
  } else if (!USERNAME_PATTERN.test(username)) {
    clientErrors.username =
      "Username hanya boleh berisi huruf, angka, underscore, dan titik.";
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
    const message = messages[0] ?? payload.message;
    if (field === "_") formError.value = message;
    else serverErrors[field] = message;
  }
};

const handleSubmit = async (): Promise<void> => {
  if (!validate() || isBusy.value) return;
  isBusy.value = true;

  // Built as a variable so the form-only `confirmPassword` field rides along
  // (excess-property checks only apply to object literals). It is consumed by
  // the server pre-check in server/api/auth/[...all].ts and never forwarded
  // to Better Auth itself.
  const payload = {
    name: form.name.trim(),
    username: form.username.trim(),
    email: form.email.trim(),
    password: form.password,
    confirmPassword: form.confirmPassword,
  };
  const { error } = await auth.signUp.email(payload);

  if (error) {
    isBusy.value = false;
    if (
      typeof error.status === "number" &&
      error.status >= 400 &&
      error.status < 500
    ) {
      // Field-level errors from the server pre-check (confirmPassword, dup
      // username/email) share the ApiErrorPayload shape of our API routes.
      applyServerErrors(
        (error as unknown as { data?: ApiErrorPayload }).data ?? {
          message: "Pendaftaran gagal. Periksa data Anda lalu coba lagi.",
        },
      );
    } else if (error.code?.toUpperCase() === "TOO_MANY_REQUESTS") {
      formError.value =
        "Terlalu banyak percobaan. Tunggu beberapa saat lalu coba lagi.";
    } else {
      formError.value = "Pendaftaran gagal. Silakan coba lagi.";
    }
    return;
  }

  // `autoSignIn: false` on the server means no session is created here — the
  // user signs in manually from /login, where this toast stays visible
  // because both pages share the auth layout's toast list (`useState`).
  notify.success(
    "Registrasi berhasil! Silakan login menggunakan akun yang telah dibuat.",
  );
  await navigateTo("/login");
};
</script>

<template>
  <main class="w-full max-w-md">
    <div class="mb-8 text-center">
      <p
        class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
      >
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
        v-model="form.name"
        label="Nama Lengkap"
        placeholder="contoh: Budi Santoso"
        required
        :error="clientErrors.name ?? serverErrors.name"
        :disabled="isBusy"
        :maxlength="50"
      />

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
  </main>
</template>
