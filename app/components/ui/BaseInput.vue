<script setup lang="ts">
interface Props {
  modelValue?: string;
  label?: string;
  type?: "text" | "number" | "password" | "search" | "date" | "datetime-local" | "email";
  inputmode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search";
  placeholder?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
  min?: number;
  maxlength?: number;
}

withDefaults(defineProps<Props>(), {
  modelValue: "",
  type: "text",
  inputmode: undefined,
  placeholder: "",
  error: "",
  hint: "",
  disabled: false,
  required: false,
  min: undefined,
  maxlength: undefined,
});

const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const onInput = (event: Event): void => {
  emit("update:modelValue", (event.target as HTMLInputElement).value);
};
</script>

<template>
  <div>
    <label v-if="label" class="mb-1.5 block text-sm font-semibold text-ink-2">
      {{ label }}
      <span v-if="required" class="text-coral">*</span>
    </label>
    <input
      :value="modelValue"
      :type="type"
      :inputmode="inputmode"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :min="min"
      :maxlength="maxlength"
      :aria-invalid="Boolean(error)"
      class="w-full rounded-2xl border bg-surface px-4 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted disabled:cursor-not-allowed disabled:bg-surface-2"
      :class="error ? 'border-coral' : 'border-line focus:border-brand/50'"
      @input="onInput"
    />
    <p v-if="error" class="mt-1.5 text-xs font-medium text-coral">{{ error }}</p>
    <p v-else-if="hint" class="mt-1.5 text-xs text-muted">{{ hint }}</p>
  </div>
</template>
