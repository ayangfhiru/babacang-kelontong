<script setup lang="ts">
import { LogOut, Menu, Moon, Sun } from "@lucide/vue";

interface Props {
  title: string;
}

defineProps<Props>();

defineEmits<{ "toggle-menu": [] }>();

const { isDark, syncFromDom, toggleTheme } = useTheme();

const auth = useAuth();
const notify = useNotify();
const { data: session } = await auth.useSession(useFetch);

const isSigningOut = ref(false);

const displayName = computed(
  () => session.value?.user?.name || session.value?.user?.email || "Pengguna",
);
const roleLabel = computed(() =>
  session.value?.user?.role === "ADMIN" ? "Admin" : "Staf",
);
// Two-letter monogram from the display name (or email local part).
const monogram = computed(() =>
  displayName.value
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase(),
);

const handleSignOut = async (): Promise<void> => {
  if (isSigningOut.value) return;
  isSigningOut.value = true;

  const { error } = await auth.signOut();
  if (error) {
    isSigningOut.value = false;
    notify.error("Gagal keluar. Silakan coba lagi.");
    return;
  }

  await navigateTo("/login");
};

onMounted(() => {
  syncFromDom();
});

const todayLabel = computed(() => formatDayLabel(new Date()));
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-line/60 bg-paper/85 backdrop-blur-xl">
    <div class="flex h-[76px] items-center gap-3 px-4 sm:px-6 lg:px-8">
      <button
        type="button"
        class="grid h-11 w-11 place-items-center rounded-2xl border border-line bg-surface text-ink md:hidden"
        aria-label="Buka menu navigasi"
        @click="$emit('toggle-menu')"
      >
        <Menu class="h-5 w-5" />
      </button>

      <div class="min-w-0">
        <p class="hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-muted sm:block">
          {{ todayLabel }}
        </p>
        <h1 class="truncate font-display text-lg font-bold leading-tight sm:text-xl">
          {{ title }}
        </h1>
      </div>

      <div class="ml-auto flex items-center gap-2">
        <button
          type="button"
          class="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-line bg-surface text-ink-2 transition-colors hover:border-brand/40 hover:text-brand"
          :aria-label="isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'"
          @click="toggleTheme"
        >
          <Sun v-if="isDark" class="h-5 w-5" />
          <Moon v-else class="h-5 w-5" />
        </button>

        <div class="hidden items-center gap-3 pl-2 lg:flex">
          <div
            class="grid h-11 w-11 place-items-center rounded-full bg-brand-soft font-semibold text-brand"
          >
            {{ monogram }}
          </div>
          <div>
            <p class="text-sm font-semibold leading-none">{{ displayName }}</p>
            <p class="mt-1 text-xs text-muted">{{ roleLabel }}</p>
          </div>
          <button
            type="button"
            class="ml-1 grid h-9 w-9 place-items-center rounded-xl border border-line bg-surface text-ink-2 transition-colors hover:border-coral/40 hover:text-coral"
            :disabled="isSigningOut"
            aria-label="Keluar dari akun"
            @click="handleSignOut"
          >
            <LogOut class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
