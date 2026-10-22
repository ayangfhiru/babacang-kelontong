<script setup lang="ts">
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface Props {
  modelValue?: string;
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  /** Label for the empty option (optional fields such as brand). */
  emptyLabel?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

withDefaults(defineProps<Props>(), {
  modelValue: "",
  placeholder: "",
  emptyLabel: "",
  error: "",
  disabled: false,
  required: false,
});

const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const onChange = (event: Event): void => {
  emit("update:modelValue", (event.target as HTMLSelectElement).value);
};
</script>

<template>
  <div>
    <label v-if="label" class="mb-1.5 block text-sm font-semibold text-ink-2">
      {{ label }}
      <span v-if="required" class="text-coral">*</span>
    </label>
    <select
      :value="modelValue"
      :disabled="disabled"
      :required="required"
      :aria-invalid="Boolean(error)"
      class="w-full appearance-none rounded-2xl border bg-surface px-4 py-2.5 text-sm text-ink outline-none transition-colors disabled:cursor-not-allowed disabled:bg-surface-2"
      :class="error ? 'border-coral' : 'border-line focus:border-brand/50'"
      @change="onChange"
    >
      <option v-if="emptyLabel" value="" :disabled="required">
        {{ emptyLabel }}
      </option>
      <option v-else-if="placeholder" value="" disabled>
        {{ placeholder }}
      </option>
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
        :disabled="option.disabled"
      >
        {{ option.label }}
      </option>
    </select>
    <p v-if="error" class="mt-1.5 text-xs font-medium text-coral">{{ error }}</p>
  </div>
</template>
