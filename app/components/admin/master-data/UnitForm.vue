<script setup lang="ts">
import { reactive, watch } from "vue";
import type { CreateUnitInput, Unit } from "~~/types";

interface Props {
  modelValue: boolean;
  unit?: Unit | null;
  busy?: boolean;
  errors?: Record<string, string[]>;
}

const props = withDefaults(defineProps<Props>(), {
  unit: null,
  busy: false,
  errors: () => ({}),
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [values: CreateUnitInput];
}>();

const form = reactive({ name: "", symbol: "", description: "", isActive: true });
const clientErrors = reactive<Record<string, string>>({});

const clearErrors = (): void => {
  for (const key of Object.keys(clientErrors)) delete clientErrors[key];
};

const resetForm = (): void => {
  form.name = props.unit?.name ?? "";
  form.symbol = props.unit?.symbol ?? "";
  form.description = props.unit?.description ?? "";
  form.isActive = props.unit?.isActive ?? true;
  clearErrors();
};

// Reset the form whenever the modal opens (create vs edit target).
watch(
  () => props.modelValue,
  (open) => {
    if (open) resetForm();
  },
);

const errorFor = (field: string): string | undefined =>
  clientErrors[field] ?? props.errors[field]?.[0];

const validate = (): boolean => {
  clearErrors();
  if (!form.name.trim()) clientErrors.name = "Nama unit wajib diisi.";
  if (!form.symbol.trim()) clientErrors.symbol = "Simbol unit wajib diisi.";
  return Object.keys(clientErrors).length === 0;
};

const handleSubmit = (): void => {
  if (!validate()) return;

  emit("submit", {
    name: form.name.trim(),
    symbol: form.symbol.trim(),
    description: form.description.trim() || null,
    isActive: form.isActive,
  });
};
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="unit ? 'Edit Unit' : 'Tambah Unit'"
    description="Atur satuan pengukuran barang, misalnya pcs atau kg."
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form class="space-y-5 px-6 py-5" novalidate @submit.prevent="handleSubmit">
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <BaseInput
          v-model="form.name"
          label="Nama Unit"
          placeholder="Contoh: Kilogram"
          required
          :error="errorFor('name')"
          :disabled="busy"
          :maxlength="60"
        />

        <BaseInput
          v-model="form.symbol"
          label="Simbol"
          placeholder="Contoh: kg"
          required
          :error="errorFor('symbol')"
          :disabled="busy"
          :maxlength="20"
        />
      </div>

      <BaseTextarea
        v-model="form.description"
        label="Deskripsi"
        placeholder="Deskripsi opsional"
        :error="errorFor('description')"
        :disabled="busy"
        :rows="3"
        :maxlength="500"
      />

      <label class="flex items-center gap-3">
        <input
          v-model="form.isActive"
          type="checkbox"
          class="h-4 w-4 accent-brand"
          :disabled="busy"
        />
        <span class="text-sm font-medium text-ink-2">Unit aktif</span>
      </label>

      <div class="flex justify-end gap-3 border-t border-line/70 pt-5">
        <BaseButton variant="secondary" :disabled="busy" @click="emit('update:modelValue', false)">
          Batal
        </BaseButton>
        <BaseButton type="submit" :loading="busy">
          {{ unit ? "Simpan Perubahan" : "Tambah Unit" }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
