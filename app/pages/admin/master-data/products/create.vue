<script setup lang="ts">
import { ArrowLeft, ScanBarcode } from "@lucide/vue";
import type {
  BrandOption,
  CategoryOption,
  CollectionResponse,
  CreateProductInput,
  UnitOption,
} from "~~/types";

usePageTitle("Tambah Produk");

const LIST_ROUTE = "/admin/master-data/products";

const route = useRoute();
const notify = useNotify();
const isSubmitting = ref(false);
const formErrors = ref<Record<string, string[]>>({});

// Prefilled by the scanner flow (`?barcode=...`). Kept as a string so leading
// zeros are never converted to a number.
const scannedBarcode =
  typeof route.query.barcode === "string" ? route.query.barcode : "";

const { data: categoryData } = await useAsyncData(
  "admin-product-create-categories",
  () => $fetch<CollectionResponse<CategoryOption>>("/api/categories/options"),
);

const { data: brandData } = await useAsyncData(
  "admin-product-create-brands",
  () => $fetch<CollectionResponse<BrandOption>>("/api/brands/options"),
);

const { data: unitData } = await useAsyncData(
  "admin-product-create-units",
  () => $fetch<CollectionResponse<UnitOption>>("/api/units/options"),
);

const categoryOptions = computed(() => categoryData.value?.data ?? []);
const brandOptions = computed(() => brandData.value?.data ?? []);
const unitOptions = computed(() => unitData.value?.data ?? []);

const handleCancel = (): void => {
  navigateTo(LIST_ROUTE);
};

const handleSubmit = async (values: CreateProductInput): Promise<void> => {
  if (isSubmitting.value) return;
  isSubmitting.value = true;
  formErrors.value = {};

  try {
    await $fetch("/api/products", { method: "POST", body: values });
    notify.success("Produk baru berhasil ditambahkan.");
    await navigateTo(LIST_ROUTE);
  } catch (err) {
    const payload = getApiErrorPayload(err);
    formErrors.value = payload.details ?? {};
    notify.error(payload.message);
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div>
    <section class="pt-8 pb-7">
      <NuxtLink
        :to="LIST_ROUTE"
        class="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft class="h-4 w-4" />
        Kembali ke daftar produk
      </NuxtLink>

      <p class="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
        Master Data
      </p>
      <h2 class="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Tambah Produk
      </h2>
      <p class="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
        Isi seluruh data barang yang dijual di toko. Field bertanda
        <span class="text-coral">*</span> wajib diisi.
      </p>
    </section>

    <p
      v-if="scannedBarcode"
      class="mb-5 inline-flex items-center gap-2 rounded-2xl border border-brand/40 bg-brand-soft px-4 py-2.5 text-sm text-ink-2"
    >
      <ScanBarcode class="h-4 w-4 shrink-0 text-brand" />
      Barcode
      <span class="font-mono font-semibold text-ink">{{ scannedBarcode }}</span>
      diisi otomatis dari hasil scan.
    </p>

    <ProductForm
      :initial-barcode="scannedBarcode"
      :category-options="categoryOptions"
      :brand-options="brandOptions"
      :unit-options="unitOptions"
      :busy="isSubmitting"
      :errors="formErrors"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />
  </div>
</template>
