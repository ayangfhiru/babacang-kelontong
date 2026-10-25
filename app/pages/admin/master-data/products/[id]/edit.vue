<script setup lang="ts">
import {
  ArrowLeft,
  LoaderCircle,
  PackageOpen,
  TriangleAlert,
} from "@lucide/vue";
import type {
  BrandOption,
  CategoryOption,
  CollectionResponse,
  CreateProductInput,
  Product,
  UnitOption,
} from "~~/types";

usePageTitle("Edit Produk");

const LIST_ROUTE = "/admin/master-data/products";

const route = useRoute();
const notify = useNotify();

const productId = Array.isArray(route.params.id)
  ? route.params.id[0]
  : (route.params.id ?? "");

const isSubmitting = ref(false);
const formErrors = ref<Record<string, string[]>>({});

const {
  data: productData,
  error: productError,
  status: productStatus,
  refresh: refreshProduct,
} = await useAsyncData(
  `admin-product-edit-${productId}`,
  () => $fetch<Product>(`/api/products/${productId}`),
  { watch: [] },
);

const { data: categoryData } = await useAsyncData(
  "admin-product-edit-categories",
  () => $fetch<CollectionResponse<CategoryOption>>("/api/options/categories"),
);

const { data: brandData } = await useAsyncData(
  "admin-product-edit-brands",
  () => $fetch<CollectionResponse<BrandOption>>("/api/options/brands"),
);

const { data: unitData } = await useAsyncData("admin-product-edit-units", () =>
  $fetch<CollectionResponse<UnitOption>>("/api/options/units"),
);

const product = computed(() => productData.value ?? null);
const categoryOptions = computed(() => categoryData.value?.data ?? []);
const brandOptions = computed(() => brandData.value?.data ?? []);
const unitOptions = computed(() => unitData.value?.data ?? []);

const isLoading = computed(() => productStatus.value === "pending");

// The API answers 400 (malformed id) or 404 (missing record) — both mean the
// edit target is unusable, so they share the same friendly state.
const isTargetMissing = computed(() => {
  const code = productError.value?.statusCode;
  return code === 400 || code === 404;
});

const loadFailed = computed(
  () => Boolean(productError.value) && !isTargetMissing.value,
);

const handleCancel = (): void => {
  navigateTo(LIST_ROUTE);
};

const handleSubmit = async (values: CreateProductInput): Promise<void> => {
  if (isSubmitting.value || !product.value) return;
  isSubmitting.value = true;
  formErrors.value = {};

  try {
    await $fetch(`/api/products/${product.value.id}`, {
      method: "PATCH",
      body: values,
    });
    notify.success("Perubahan produk berhasil disimpan.");
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

      <p
        class="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand"
      >
        Master Data
      </p>
      <h2
        class="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl"
      >
        Edit Produk
      </h2>
      <p class="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
        Perbarui data barang yang dijual di toko. Field bertanda
        <span class="text-coral">*</span> wajib diisi.
      </p>
    </section>

    <!-- Loading -->
    <div
      v-if="isLoading"
      class="flex items-center justify-center gap-3 rounded-4xl border border-line/70 bg-surface py-16 text-muted shadow-card"
    >
      <LoaderCircle class="h-5 w-5 animate-spin" />
      <span class="text-sm font-medium">Memuat data produk…</span>
    </div>

    <!-- Invalid id / missing record -->
    <div
      v-else-if="isTargetMissing || !product"
      class="flex flex-col items-center gap-4 rounded-4xl border border-line/70 bg-surface py-16 text-center shadow-card"
    >
      <span
        class="grid h-12 w-12 place-items-center rounded-2xl bg-coral-soft text-coral"
      >
        <PackageOpen class="h-5 w-5" />
      </span>
      <div>
        <p class="text-sm font-semibold text-ink">Produk tidak ditemukan</p>
        <p class="mt-1 text-sm text-muted">
          Produk mungkin sudah dihapus, atau tautan yang dibuka tidak valid.
        </p>
      </div>
      <BaseButton variant="secondary" @click="navigateTo(LIST_ROUTE)">
        Kembali ke daftar produk
      </BaseButton>
    </div>

    <!-- Load failure -->
    <div
      v-else-if="loadFailed"
      class="flex flex-col items-center gap-4 rounded-4xl border border-line/70 bg-surface py-16 text-center shadow-card"
    >
      <span
        class="grid h-12 w-12 place-items-center rounded-2xl bg-coral-soft text-coral"
      >
        <TriangleAlert class="h-5 w-5" />
      </span>
      <p class="text-sm font-medium text-ink-2">
        Gagal memuat data produk. Silakan coba lagi.
      </p>
      <BaseButton variant="secondary" @click="refreshProduct()"
        >Muat ulang</BaseButton
      >
    </div>

    <ProductForm
      v-else
      :product="product"
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
