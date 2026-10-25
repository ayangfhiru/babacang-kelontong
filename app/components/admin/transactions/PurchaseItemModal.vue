<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import type {
  Product,
  PurchaseItemDraft,
  PurchaseItemFormErrors,
  PurchaseItemFormModel,
  PurchaseItemFormPayload,
} from "~~/types";

interface Props {
  modelValue: boolean;
  products: Product[];
  /** Existing line to edit; `null` when adding a new one. */
  item: PurchaseItemDraft | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  save: [payload: PurchaseItemFormPayload];
}>();

const form = reactive<PurchaseItemFormModel>({
  productId: "",
  quantity: "1",
  unitCost: "",
  discount: "",
  batchNumber: "",
  expiredAt: "",
});

const errors = reactive<PurchaseItemFormErrors>({});

const FORM_FIELDS = [
  "productId",
  "quantity",
  "unitCost",
  "discount",
  "batchNumber",
  "expiredAt",
] as const;

const isNew = computed(() => props.item === null);

const title = computed(() =>
  isNew.value ? "Tambah Item Pembelian" : "Edit Item Pembelian",
);

const productOptions = computed(() =>
  props.products.map((product) => ({
    value: product.id,
    label: `${product.name} (${product.sku})`,
  })),
);

const selectedProduct = computed(
  () => props.products.find((product) => product.id === form.productId) ?? null,
);

const clearError = (field: keyof PurchaseItemFormErrors): void => {
  delete errors[field];
};

const clearErrors = (): void => {
  FORM_FIELDS.forEach((field) => {
    delete errors[field];
  });
};

/** Copy the edited line (or reset to defaults) every time the modal opens. */
const hydrate = (): void => {
  const item = props.item;

  form.productId = item?.productId ?? "";
  form.quantity = item ? String(item.quantity) : "1";
  form.unitCost = item ? String(item.unitCost) : "";
  form.discount = item ? String(item.discount) : "";
  form.batchNumber = item?.batchNumber ?? "";
  form.expiredAt = item?.expiredAt ?? "";
  clearErrors();
};

watch(
  () => props.modelValue,
  (open) => {
    if (open) hydrate();
  },
);

watch(
  () => form.productId,
  (productId) => {
    clearError("productId");
    if (!productId) return;

    const product = props.products.find((entry) => entry.id === productId);
    // Suggest the registered purchase price only while the field is still
    // empty — a price typed by the user is never overwritten.
    if (product && form.unitCost.trim() === "") {
      form.unitCost = String(product.purchasePrice);
    }
  },
);

/**
 * Validate and convert the form. Returns `null` when invalid (errors are
 * mirrored onto `errors`, close to their field).
 */
const parseForm = (): PurchaseItemFormPayload | null => {
  clearErrors();

  if (!form.productId) errors.productId = "Produk wajib dipilih.";

  const quantity = parsePositiveInt(form.quantity);
  if (quantity === null) {
    errors.quantity = "Jumlah harus berupa bilangan bulat lebih dari 0.";
  }

  const unitCost =
    form.unitCost.trim() === "" ? 0 : parseNonNegativeMoney(form.unitCost);
  if (unitCost === null) errors.unitCost = "Harga beli tidak valid.";

  const discount =
    form.discount.trim() === "" ? 0 : parseNonNegativeMoney(form.discount);
  if (discount === null) errors.discount = "Diskon tidak valid.";

  if (form.batchNumber.trim().length > 100) {
    errors.batchNumber = "Nomor batch terlalu panjang (maks. 100 karakter).";
  }

  if (form.expiredAt && !/^\d{4}-\d{2}-\d{2}$/.test(form.expiredAt)) {
    errors.expiredAt = "Tanggal kedaluwarsa tidak valid.";
  }

  if (
    quantity === null ||
    unitCost === null ||
    discount === null ||
    errors.productId ||
    errors.batchNumber ||
    errors.expiredAt
  ) {
    return null;
  }

  return {
    productId: form.productId,
    quantity,
    unitCost,
    discount,
    batchNumber: form.batchNumber.trim(),
    expiredAt: form.expiredAt,
  };
};

const close = (): void => {
  emit("update:modelValue", false);
};

const submit = (): void => {
  const payload = parseForm();
  if (!payload) return;

  emit("save", payload);
  close();
};
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="title"
    description="Item disimpan ke daftar sementara, bukan ke database."
    max-width="max-w-xl"
    fullscreen
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="space-y-4 px-6 py-5">
      <div>
        <BaseSelect
          v-model="form.productId"
          label="Produk"
          :options="productOptions"
          placeholder="Pilih produk"
          search-placeholder="Cari produk (nama atau SKU)..."
          required
          :error="errors.productId"
        />
        <p v-if="selectedProduct" class="mt-1.5 text-xs text-muted">
          Satuan: {{ selectedProduct.unit.symbol }} · Harga terdaftar
          {{ formatCurrency(selectedProduct.purchasePrice) }}
        </p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <BaseInput
          v-model="form.quantity"
          label="Jumlah"
          type="number"
          inputmode="numeric"
          :min="1"
          required
          :error="errors.quantity"
          @update:model-value="clearError('quantity')"
        />
        <BaseInput
          v-model="form.unitCost"
          label="Harga beli"
          type="number"
          inputmode="decimal"
          :min="0"
          hint="Kosongkan untuk 0"
          :error="errors.unitCost"
          @update:model-value="clearError('unitCost')"
        />
        <BaseInput
          v-model="form.discount"
          label="Diskon item"
          type="number"
          inputmode="decimal"
          :min="0"
          hint="Kosongkan untuk 0"
          :error="errors.discount"
          @update:model-value="clearError('discount')"
        />
        <BaseInput
          v-model="form.expiredAt"
          label="Tanggal kedaluwarsa"
          type="date"
          :error="errors.expiredAt"
          @update:model-value="clearError('expiredAt')"
        />
        <BaseInput
          v-model="form.batchNumber"
          label="Nomor batch"
          :maxlength="100"
          class="sm:col-span-2"
          hint="Opsional"
          :error="errors.batchNumber"
          @update:model-value="clearError('batchNumber')"
        />
      </div>
    </div>

    <template #footer>
      <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <BaseButton variant="secondary" @click="close">Batal</BaseButton>
        <BaseButton @click="submit">Simpan Item</BaseButton>
      </div>
    </template>
  </BaseModal>
</template>
