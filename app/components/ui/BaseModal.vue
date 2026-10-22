<script setup lang="ts">
import { onBeforeUnmount, watch } from "vue";
import { X } from "@lucide/vue";

interface Props {
  modelValue: boolean;
  title: string;
  description?: string;
  maxWidth?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const close = (): void => {
  emit("update:modelValue", false);
};

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === "Escape") close();
};

const releaseBodyLock = (): void => {
  document.body.style.overflow = previousBodyOverflow;
  window.removeEventListener("keydown", onKeydown);
};

let previousBodyOverflow = "";

// Lock body scroll and listen for Escape only while the modal is open.
watch(
  () => props.modelValue,
  (open) => {
    if (!import.meta.client) return;

    if (open) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", onKeydown);
      return;
    }

    releaseBodyLock();
  },
);

onBeforeUnmount(releaseBodyLock);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
    >
      <div class="fixed inset-0 bg-night/60 backdrop-blur-sm" @click="close" />

      <div
        class="relative z-10 w-full rounded-4xl border border-line/70 bg-surface shadow-pop"
        :class="maxWidth || 'max-w-lg'"
      >
        <div class="flex items-start justify-between gap-4 border-b border-line/70 px-6 py-5">
          <div>
            <h2 class="font-display text-xl font-bold text-ink">{{ title }}</h2>
            <p v-if="description" class="mt-1 text-sm text-muted">{{ description }}</p>
          </div>
          <button
            type="button"
            class="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-line text-muted transition-colors hover:border-brand/40 hover:text-brand"
            aria-label="Tutup dialog"
            @click="close"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <slot />
      </div>
    </div>
  </Teleport>
</template>
