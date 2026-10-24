<script setup lang="ts">
import { computed, reactive } from "vue";
import type {
  BrandOption,
  CategoryOption,
  CreateProductInput,
  Product,
  UnitOption,
} from "~~/types";
import type { SelectOption } from "~/components/ui/BaseSelect.vue";

interface Props {
  product?: Product | null;
  /**
   * Barcode prefilled from the scanner flow on the create page.
   * Kept as a string so leading zeros survive; ignored when editing.
   */
  initialBarcode?: string;
  categoryOptions: CategoryOption[];
  brandOptions: BrandOption[];
  unitOptions: UnitOption[];
  busy?: boolean;
  errors?: Record<string, string[]>;
}

const props = withDefaults(defineProps<Props>(), {
  product: null,
  initialBarcode: "",
  busy: false,
  errors: () => ({}),
});

const emit = defineEmits<{
  submit: [values: CreateProductInput];
  cancel: [];
}>();

const form = reactive({
  sku: props.product?.sku ?? "",
  barcode: props.product?.barcode ?? props.initialBarcode ?? "",
  name: props.product?.name ?? "",
  description: props.product?.description ?? "",
  categoryId: props.product?.categoryId ?? "",
  brandId: props.product?.brandId ?? "",
  unitId: props.product?.unitId ?? "",
  purchasePrice: props.product ? String(props.product.purchasePrice) : "",
  sellingPrice: props.product ? String(props.product.sellingPrice) : "",
  isActive: props.product?.isActive ?? true,
});

const clientErrors = reactive<Record<string, string>>({});

const clearErrors = (): void => {
  for (const key of Object.keys(clientErrors)) delete clientErrors[key];
};

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
  // Guard against double submits while a save is in flight.
  if (props.busy) return;
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
  <form class="space-y-6" novalidate @submit.prevent="handleSubmit">
    <!-- Main information -->
    <section
      class="overflow-hidden rounded-4xl border border-line/70 bg-surface shadow-card"
    >
      <header class="border-b border-line/70 px-6 py-4">
        <h3 class="text-base font-semibold text-ink">Informasi Utama</h3>
        <p class="mt-0.5 text-sm text-muted">
          Identitas produk yang digunakan di daftar dan kasir.
        </p>
      </header>

      <div class="space-y-5 p-6">
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
          :rows="3"
          :maxlength="2000"
        />
      </div>
    </section>

    <!-- Relations -->
    <section
      class="overflow-hidden rounded-4xl border border-line/70 bg-surface shadow-card"
    >
      <header class="border-b border-line/70 px-6 py-4">
        <h3 class="text-base font-semibold text-ink">Kategori, Merek & Satuan</h3>
        <p class="mt-0.5 text-sm text-muted">
          Pengelompokan produk. Merek bersifat opsional.
        </p>
      </header>

      <div class="space-y-5 p-6">
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
      </div>
    </section>

    <!-- Pricing -->
    <section
      class="overflow-hidden rounded-4xl border border-line/70 bg-surface shadow-card"
    >
      <header class="border-b border-line/70 px-6 py-4">
        <h3 class="text-base font-semibold text-ink">Harga</h3>
        <p class="mt-0.5 text-sm text-muted">
          Harga beli dan jual dalam rupiah (bilangan bulat).
        </p>
      </header>

      <div class="space-y-5 p-6">
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
          <span class="text-sm font-medium text-ink-2"
            >Produk aktif (dijual di kasir)</span
          >
        </label>
      </div>
    </section>

    <!-- Actions -->
    <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <BaseButton variant="secondary" :disabled="busy" @click="emit('cancel')">
        Batal
      </BaseButton>
      <BaseButton type="submit" :loading="busy">
        {{ product ? "Simpan Perubahan" : "Tambah Produk" }}
      </BaseButton>
    </div>
  </form>
</template>
