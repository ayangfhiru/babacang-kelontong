<script setup lang="ts">
import { TriangleAlert } from "@lucide/vue";
import BaseButton from "./BaseButton.vue";
import BaseModal from "./BaseModal.vue";

interface Props {
  modelValue: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
}

withDefaults(defineProps<Props>(), {
  confirmLabel: "Hapus",
  cancelLabel: "Batal",
  loading: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  confirm: [];
}>();
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="title"
    max-width="max-w-md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="px-6 py-5">
      <div class="flex items-start gap-4">
        <span class="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-coral-soft text-coral">
          <TriangleAlert class="h-5 w-5" />
        </span>
        <p class="text-sm leading-relaxed text-ink-2">{{ message }}</p>
      </div>
    </div>

    <template #footer>
      <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <BaseButton
          variant="secondary"
          :disabled="loading"
          @click="emit('update:modelValue', false)"
        >
          {{ cancelLabel }}
        </BaseButton>
        <BaseButton variant="danger" :loading="loading" @click="emit('confirm')">
          {{ confirmLabel }}
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>
