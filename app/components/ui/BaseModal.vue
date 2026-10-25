<script setup lang="ts">
import { onBeforeUnmount, watch } from "vue";
import { X } from "@lucide/vue";

interface Props {
  modelValue: boolean;
  title: string;
  description?: string;
  maxWidth?: string;
  /**
   * Fill the viewport height on phones (full-screen sheet pattern). Desktop
   * and tablet keep a proportional dialog.
   */
  fullscreen?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  maxWidth: "",
  fullscreen: false,
});

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
      :class="{ 'p-0 sm:p-4': fullscreen }"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
    >
      <div class="fixed inset-0 bg-night/60 backdrop-blur-sm" @click="close" />

      <!--
        The panel caps its own height and scrolls its body, so the header and
        the footer slot stay reachable no matter how long the content is.
      -->
      <div
        class="relative z-10 flex w-full flex-col overflow-hidden rounded-4xl border border-line/70 bg-surface shadow-pop"
        :class="[
          maxWidth || 'max-w-lg',
          fullscreen
            ? 'h-dvh max-h-dvh sm:h-auto sm:max-h-[calc(100dvh-2rem)]'
            : 'max-h-[calc(100dvh-2rem)]',
        ]"
      >
        <div
          class="flex shrink-0 items-start justify-between gap-4 border-b border-line/70 px-6 py-5"
        >
          <div>
            <h2 class="font-display text-xl font-bold text-ink">
              {{ title }}
            </h2>
            <p v-if="description" class="mt-1 text-sm text-muted">
              {{ description }}
            </p>
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

        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <slot />
        </div>

        <div
          v-if="$slots.footer"
          class="shrink-0 border-t border-line/70 px-6 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5"
        >
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
