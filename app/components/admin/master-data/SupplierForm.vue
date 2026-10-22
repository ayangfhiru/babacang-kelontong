<script setup lang="ts">
import { reactive, watch } from "vue";
import type { CreateSupplierInput, Supplier } from "~~/types";

interface Props {
  modelValue: boolean;
  supplier?: Supplier | null;
  busy?: boolean;
  errors?: Record<string, string[]>;
}

const props = withDefaults(defineProps<Props>(), {
  supplier: null,
  busy: false,
  errors: () => ({}),
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [values: CreateSupplierInput];
}>();

const form = reactive({
  code: "",
  name: "",
  contactPerson: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
  isActive: true,
});

const clientErrors = reactive<Record<string, string>>({});

const clearErrors = (): void => {
  for (const key of Object.keys(clientErrors)) delete clientErrors[key];
};

const resetForm = (): void => {
  form.code = props.supplier?.code ?? "";
  form.name = props.supplier?.name ?? "";
  form.contactPerson = props.supplier?.contactPerson ?? "";
  form.email = props.supplier?.email ?? "";
  form.phone = props.supplier?.phone ?? "";
  form.address = props.supplier?.address ?? "";
  form.notes = props.supplier?.notes ?? "";
  form.isActive = props.supplier?.isActive ?? true;
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
  if (!form.name.trim()) clientErrors.name = "Nama supplier wajib diisi.";
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    clientErrors.email = "Format email tidak valid.";
  }
  return Object.keys(clientErrors).length === 0;
};

const handleSubmit = (): void => {
  if (!validate()) return;

  emit("submit", {
    code: form.code.trim() || null,
    name: form.name.trim(),
    contactPerson: form.contactPerson.trim() || null,
    email: form.email.trim() || null,
    phone: form.phone.trim() || null,
    address: form.address.trim() || null,
    notes: form.notes.trim() || null,
    isActive: form.isActive,
  });
};
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="supplier ? 'Edit Supplier' : 'Tambah Supplier'"
    description="Data pemasok barang untuk kebutuhan restock."
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form class="space-y-5 px-6 py-5" novalidate @submit.prevent="handleSubmit">
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <BaseInput
          v-model="form.code"
          label="Kode Supplier"
          placeholder="Contoh: SUP-001"
          :error="errorFor('code')"
          :disabled="busy"
          :maxlength="40"
        />

        <BaseInput
          v-model="form.name"
          label="Nama Supplier"
          placeholder="Contoh: CV Sumber Pangan"
          required
          :error="errorFor('name')"
          :disabled="busy"
          :maxlength="150"
        />
      </div>

      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <BaseInput
          v-model="form.contactPerson"
          label="Nama Kontak"
          placeholder="Contoh: Pak Budi"
          :error="errorFor('contactPerson')"
          :disabled="busy"
          :maxlength="120"
        />

        <BaseInput
          v-model="form.phone"
          label="Nomor Telepon"
          type="text"
          placeholder="Contoh: 081234567890"
          :error="errorFor('phone')"
          :disabled="busy"
          :maxlength="30"
        />
      </div>

      <BaseInput
        v-model="form.email"
        label="Email"
        type="text"
        placeholder="Contoh: supplier@email.com"
        :error="errorFor('email')"
        :disabled="busy"
        :maxlength="150"
      />

      <BaseTextarea
        v-model="form.address"
        label="Alamat"
        placeholder="Alamat gudang / toko pemasok"
        :error="errorFor('address')"
        :disabled="busy"
        :rows="3"
        :maxlength="500"
      />

      <BaseTextarea
        v-model="form.notes"
        label="Catatan"
        placeholder="Catatan opsional, misalnya jadwal kirim"
        :error="errorFor('notes')"
        :disabled="busy"
        :rows="2"
        :maxlength="1000"
      />

      <label class="flex items-center gap-3">
        <input
          v-model="form.isActive"
          type="checkbox"
          class="h-4 w-4 accent-brand"
          :disabled="busy"
        />
        <span class="text-sm font-medium text-ink-2">Supplier aktif</span>
      </label>

      <div class="flex justify-end gap-3 border-t border-line/70 pt-5">
        <BaseButton variant="secondary" :disabled="busy" @click="emit('update:modelValue', false)">
          Batal
        </BaseButton>
        <BaseButton type="submit" :loading="busy">
          {{ supplier ? "Simpan Perubahan" : "Tambah Supplier" }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
