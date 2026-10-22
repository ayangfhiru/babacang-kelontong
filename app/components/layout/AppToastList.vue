<script setup lang="ts">
import { CircleCheck, CircleX, X } from "@lucide/vue";

const { toasts, dismiss } = useNotify();
</script>

<template>
  <Teleport to="body">
    <div class="pointer-events-none fixed bottom-5 right-5 z-[150] flex w-full max-w-sm flex-col gap-3">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        role="status"
        class="pointer-events-auto flex items-start gap-3 rounded-2xl border border-line/70 bg-surface p-4 shadow-pop"
      >
        <CircleCheck v-if="toast.type === 'success'" class="mt-0.5 h-5 w-5 shrink-0 text-brand" />
        <CircleX v-else class="mt-0.5 h-5 w-5 shrink-0 text-coral" />

        <p class="flex-1 text-sm font-medium leading-relaxed text-ink-2">{{ toast.message }}</p>

        <button
          type="button"
          class="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:text-ink"
          aria-label="Tutup notifikasi"
          @click="dismiss(toast.id)"
        >
          <X class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  </Teleport>
</template>
