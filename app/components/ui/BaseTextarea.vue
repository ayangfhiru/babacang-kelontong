<script setup lang="ts">
interface Props {
  modelValue?: string;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  rows?: number;
  maxlength?: number;
}

withDefaults(defineProps<Props>(), {
  modelValue: "",
  placeholder: "",
  error: "",
  disabled: false,
  required: false,
  rows: 3,
  maxlength: undefined,
});

const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const onInput = (event: Event): void => {
  emit("update:modelValue", (event.target as HTMLTextAreaElement).value);
};
</script>

<template>
  <div>
    <label v-if="label" class="mb-1.5 block text-sm font-semibold text-ink-2">
      {{ label }}
      <span v-if="required" class="text-coral">*</span>
    </label>
    <textarea
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :rows="rows"
      :maxlength="maxlength"
      :aria-invalid="Boolean(error)"
      class="w-full resize-y rounded-2xl border bg-surface px-4 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted disabled:cursor-not-allowed disabled:bg-surface-2"
      :class="error ? 'border-coral' : 'border-line focus:border-brand/50'"
      @input="onInput"
    />
    <p v-if="error" class="mt-1.5 text-xs font-medium text-coral">{{ error }}</p>
  </div>
</template>
