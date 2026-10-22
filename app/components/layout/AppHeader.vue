<script setup lang="ts">
import { Menu, Moon, Sun } from "@lucide/vue";

interface Props {
  title: string;
}

defineProps<Props>();

defineEmits<{ "toggle-menu": [] }>();

const { isDark, syncFromDom, toggleTheme } = useTheme();

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
            AD
          </div>
          <div>
            <p class="text-sm font-semibold leading-none">Admin</p>
            <p class="mt-1 text-xs text-muted">Pemilik Toko</p>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
