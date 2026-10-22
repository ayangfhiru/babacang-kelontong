<script setup lang="ts">
import { reactive, watch } from "vue";
import type { Brand, CreateBrandInput } from "~~/types";

interface Props {
  modelValue: boolean;
  brand?: Brand | null;
  busy?: boolean;
  errors?: Record<string, string[]>;
}

const props = withDefaults(defineProps<Props>(), {
  brand: null,
  busy: false,
  errors: () => ({}),
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [values: CreateBrandInput];
}>();

const form = reactive({ name: "", description: "", isActive: true });
const clientErrors = reactive<Record<string, string>>({});

const clearErrors = (): void => {
  for (const key of Object.keys(clientErrors)) delete clientErrors[key];
};

const resetForm = (): void => {
  form.name = props.brand?.name ?? "";
  form.description = props.brand?.description ?? "";
  form.isActive = props.brand?.isActive ?? true;
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
  if (!form.name.trim()) clientErrors.name = "Nama merek wajib diisi.";
  return Object.keys(clientErrors).length === 0;
};

const handleSubmit = (): void => {
  if (!validate()) return;

  emit("submit", {
    name: form.name.trim(),
    description: form.description.trim() || null,
    isActive: form.isActive,
  });
};
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="brand ? 'Edit Merek' : 'Tambah Merek'"
    description="Atur daftar merek barang di toko."
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form class="space-y-5 px-6 py-5" novalidate @submit.prevent="handleSubmit">
      <BaseInput
        v-model="form.name"
        label="Nama Merek"
        placeholder="Contoh: Indomie"
        required
        :error="errorFor('name')"
        :disabled="busy"
        :maxlength="120"
      />

      <BaseTextarea
        v-model="form.description"
        label="Deskripsi"
        placeholder="Deskripsi opsional"
        :error="errorFor('description')"
        :disabled="busy"
        :rows="3"
        :maxlength="1000"
      />

      <label class="flex items-center gap-3">
        <input
          v-model="form.isActive"
          type="checkbox"
          class="h-4 w-4 accent-brand"
          :disabled="busy"
        />
        <span class="text-sm font-medium text-ink-2">Merek aktif</span>
      </label>

      <div class="flex justify-end gap-3 border-t border-line/70 pt-5">
        <BaseButton variant="secondary" :disabled="busy" @click="emit('update:modelValue', false)">
          Batal
        </BaseButton>
        <BaseButton type="submit" :loading="busy">
          {{ brand ? "Simpan Perubahan" : "Tambah Merek" }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
