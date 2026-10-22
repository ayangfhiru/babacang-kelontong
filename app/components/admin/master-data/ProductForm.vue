<script setup lang="ts">
import { reactive, watch } from "vue";
import type {
  BrandOption,
  CategoryOption,
  CreateProductInput,
  Product,
  UnitOption,
} from "~~/types";
import type { SelectOption } from "~/components/ui/BaseSelect.vue";

interface Props {
  modelValue: boolean;
  product?: Product | null;
  categoryOptions: CategoryOption[];
  brandOptions: BrandOption[];
  unitOptions: UnitOption[];
  busy?: boolean;
  errors?: Record<string, string[]>;
}

const props = withDefaults(defineProps<Props>(), {
  product: null,
  busy: false,
  errors: () => ({}),
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [values: CreateProductInput];
}>();

const form = reactive({
  sku: "",
  barcode: "",
  name: "",
  description: "",
  categoryId: "",
  brandId: "",
  unitId: "",
  purchasePrice: "",
  sellingPrice: "",
  isActive: true,
});

const clientErrors = reactive<Record<string, string>>({});

const clearErrors = (): void => {
  for (const key of Object.keys(clientErrors)) delete clientErrors[key];
};

const resetForm = (): void => {
  form.sku = props.product?.sku ?? "";
  form.barcode = props.product?.barcode ?? "";
  form.name = props.product?.name ?? "";
  form.description = props.product?.description ?? "";
  form.categoryId = props.product?.categoryId ?? "";
  form.brandId = props.product?.brandId ?? "";
  form.unitId = props.product?.unitId ?? "";
  form.purchasePrice = props.product ? String(props.product.purchasePrice) : "";
  form.sellingPrice = props.product ? String(props.product.sellingPrice) : "";
  form.isActive = props.product?.isActive ?? true;
  clearErrors();
};

// Reset the form whenever the modal opens (create vs edit target).
watch(
  () => props.modelValue,
  (open) => {
    if (open) resetForm();
  },
);

const withInactiveLabel = (
  options: Array<{ id: string; name: string; isActive: boolean }>,
): SelectOption[] =>
  options.map((option) => ({
    value: option.id,
    label: option.isActive ? option.name : `${option.name} (nonaktif)`,
    disabled: !option.isActive,
  }));

const categorySelect = computed<SelectOption[]>(() => withInactiveLabel(props.categoryOptions));

const brandSelect = computed<SelectOption[]>(() => withInactiveLabel(props.brandOptions));

const unitSelect = computed<SelectOption[]>(() =>
  withInactiveLabel(
    props.unitOptions.map((option) => ({
      id: option.id,
      name: `${option.name} (${option.symbol})`,
      isActive: option.isActive,
    })),
  ),
);

const errorFor = (field: string): string | undefined =>
  clientErrors[field] ?? props.errors[field]?.[0];

// Prices are whole rupiah: strip everything that is not a digit ("Rp 15.000" -> 15000).
const parsePrice = (value: string): number | null => {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
};

const validate = (): boolean => {
  clearErrors();

  if (!form.sku.trim()) clientErrors.sku = "SKU wajib diisi.";
  if (!form.name.trim()) clientErrors.name = "Nama produk wajib diisi.";
  if (!form.categoryId) clientErrors.categoryId = "Kategori wajib dipilih.";
  if (!form.unitId) clientErrors.unitId = "Unit wajib dipilih.";

  const purchasePrice = parsePrice(form.purchasePrice);
  if (purchasePrice === null || purchasePrice < 0) {
    clientErrors.purchasePrice = "Harga beli harus berupa angka positif.";
  }

  const sellingPrice = parsePrice(form.sellingPrice);
  if (sellingPrice === null || sellingPrice < 0) {
    clientErrors.sellingPrice = "Harga jual harus berupa angka positif.";
  }

  return Object.keys(clientErrors).length === 0;
};

const handleSubmit = (): void => {
  if (!validate()) return;

  emit("submit", {
    sku: form.sku.trim(),
    barcode: form.barcode.trim() || null,
    name: form.name.trim(),
    description: form.description.trim() || null,
    categoryId: form.categoryId,
    brandId: form.brandId || null,
    unitId: form.unitId,
    purchasePrice: parsePrice(form.purchasePrice) ?? 0,
    sellingPrice: parsePrice(form.sellingPrice) ?? 0,
    isActive: form.isActive,
  });
};
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="product ? 'Edit Produk' : 'Tambah Produk'"
    description="Data barang yang dijual di toko."
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form class="space-y-5 px-6 py-5" novalidate @submit.prevent="handleSubmit">
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <BaseInput
          v-model="form.sku"
          label="SKU"
          placeholder="Contoh: SMB-BR-001"
          required
          :error="errorFor('sku')"
          :disabled="busy"
          :maxlength="64"
        />

        <BaseInput
          v-model="form.barcode"
          label="Barcode"
          placeholder="Barcode opsional"
          :error="errorFor('barcode')"
          :disabled="busy"
          :maxlength="64"
        />
      </div>

      <BaseInput
        v-model="form.name"
        label="Nama Produk"
        placeholder="Contoh: Beras Premium 5kg"
        required
        :error="errorFor('name')"
        :disabled="busy"
        :maxlength="200"
      />

      <BaseTextarea
        v-model="form.description"
        label="Deskripsi"
        placeholder="Deskripsi opsional"
        :error="errorFor('description')"
        :disabled="busy"
        :rows="2"
        :maxlength="2000"
      />

      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <BaseSelect
          v-model="form.categoryId"
          label="Kategori"
          :options="categorySelect"
          placeholder="Pilih kategori"
          required
          :error="errorFor('categoryId')"
          :disabled="busy"
        />

        <BaseSelect
          v-model="form.brandId"
          label="Merek"
          :options="brandSelect"
          empty-label="Tanpa merek"
          :error="errorFor('brandId')"
          :disabled="busy"
        />
      </div>

      <BaseSelect
        v-model="form.unitId"
        label="Unit"
        :options="unitSelect"
        placeholder="Pilih unit"
        required
        :error="errorFor('unitId')"
        :disabled="busy"
      />

      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <BaseInput
          v-model="form.purchasePrice"
          label="Harga Beli (Rp)"
          type="text"
          inputmode="numeric"
          placeholder="Contoh: 15000"
          required
          :error="errorFor('purchasePrice')"
          :disabled="busy"
        />

        <BaseInput
          v-model="form.sellingPrice"
          label="Harga Jual (Rp)"
          type="text"
          inputmode="numeric"
          placeholder="Contoh: 18000"
          required
          :error="errorFor('sellingPrice')"
          :disabled="busy"
        />
      </div>

      <label class="flex items-center gap-3">
        <input
          v-model="form.isActive"
          type="checkbox"
          class="h-4 w-4 accent-brand"
          :disabled="busy"
        />
        <span class="text-sm font-medium text-ink-2">Produk aktif (dijual di kasir)</span>
      </label>

      <div class="flex justify-end gap-3 border-t border-line/70 pt-5">
        <BaseButton variant="secondary" :disabled="busy" @click="emit('update:modelValue', false)">
          Batal
        </BaseButton>
        <BaseButton type="submit" :loading="busy">
          {{ product ? "Simpan Perubahan" : "Tambah Produk" }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
