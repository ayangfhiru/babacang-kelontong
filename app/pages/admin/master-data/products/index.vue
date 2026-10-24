<script setup lang="ts">
import {
  LoaderCircle,
  PackageOpen,
  Pencil,
  Plus,
  ScanBarcode,
  Search,
  Trash2,
  TriangleAlert,
} from "@lucide/vue";
import type {
  BarcodeCheckProduct,
  BrandOption,
  CategoryOption,
  CollectionResponse,
  PaginatedResponse,
  Product,
  UnitOption,
} from "~~/types";
import ProductBarcodeScannerModal from "~/components/product/ProductBarcodeScannerModal.vue";

usePageTitle("Produk");

const notify = useNotify();
const PAGE_SIZE = 10;

const DEFAULT_META = { page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 0 };

// ---------------------------------------------------------------------------
// List state (search + filters)
// ---------------------------------------------------------------------------

const searchInput = ref("");
const search = useDebouncedRef(searchInput);

const filters = reactive({
  page: 1,
  categoryId: "",
  brandId: "",
  unitId: "",
  isActive: "",
});

watch(search, () => {
  filters.page = 1;
});

watch(
  () => [filters.categoryId, filters.brandId, filters.unitId, filters.isActive],
  () => {
    filters.page = 1;
  },
);

const listQuery = computed(() => ({
  page: filters.page,
  pageSize: PAGE_SIZE,
  search: search.value || undefined,
  categoryId: filters.categoryId || undefined,
  brandId: filters.brandId || undefined,
  unitId: filters.unitId || undefined,
  isActive: filters.isActive || undefined,
}));

const { data, status, error, refresh } = await useAsyncData<
  PaginatedResponse<Product>
>(
  "admin-products-list",
  () =>
    $fetch<PaginatedResponse<Product>>("/api/products", {
      query: listQuery.value,
    }),
  {
    watch: [listQuery],
    default: () => ({ data: [], meta: DEFAULT_META }),
  },
);

const isLoading = computed(() => status.value === "pending");
const products = computed(() => data.value?.data ?? []);
const meta = computed(() => data.value?.meta ?? DEFAULT_META);
const isRefreshing = computed(
  () => status.value === "pending" && products.value.length > 0,
);

const loadFailed = computed(() => Boolean(error.value));

// ---------------------------------------------------------------------------
// Select options (relations)
// ---------------------------------------------------------------------------

const { data: categoryOptionsData } = await useAsyncData(
  "admin-product-category-options",
  () => $fetch<CollectionResponse<CategoryOption>>("/api/categories/options"),
);

const { data: brandOptionsData } = await useAsyncData(
  "admin-product-brand-options",
  () => $fetch<CollectionResponse<BrandOption>>("/api/brands/options"),
);

const { data: unitOptionsData } = await useAsyncData(
  "admin-product-unit-options",
  () => $fetch<CollectionResponse<UnitOption>>("/api/units/options"),
);

const categoryOptions = computed(() => categoryOptionsData.value?.data ?? []);
const brandOptions = computed(() => brandOptionsData.value?.data ?? []);
const unitOptions = computed(() => unitOptionsData.value?.data ?? []);

const statusOptions = [
  { value: "", label: "Semua status" },
  { value: "true", label: "Aktif" },
  { value: "false", label: "Nonaktif" },
];

const filterCategoryOptions = computed(() => [
  { value: "", label: "Semua kategori" },
  ...categoryOptions.value.map((option) => ({
    value: option.id,
    label: option.name,
  })),
]);

const filterBrandOptions = computed(() => [
  { value: "", label: "Semua merek" },
  ...brandOptions.value.map((option) => ({
    value: option.id,
    label: option.name,
  })),
]);

const filterUnitOptions = computed(() => [
  { value: "", label: "Semua unit" },
  ...unitOptions.value.map((option) => ({
    value: option.id,
    label: `${option.name} (${option.symbol})`,
  })),
]);

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

const deleteTarget = ref<Product | null>(null);
const deleteMessage = computed(() =>
  deleteTarget.value
    ? `Produk "${deleteTarget.value.name}" akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`
    : "",
);
const isDeleting = ref(false);

// The confirm dialog works with a boolean flag while the target record keeps
// the context (name) for the confirmation message.
const isDeleteOpen = computed({
  get: () => deleteTarget.value !== null,
  set: (open: boolean) => {
    if (!open) deleteTarget.value = null;
  },
});

const handleDelete = async (): Promise<void> => {
  if (!deleteTarget.value) return;

  isDeleting.value = true;

  try {
    await $fetch(`/api/products/${deleteTarget.value.id}`, {
      method: "DELETE",
    });
    notify.success(`Produk "${deleteTarget.value.name}" berhasil dihapus.`);
    deleteTarget.value = null;
    await refresh();
  } catch (err) {
    notify.error(getApiErrorPayload(err).message);
  } finally {
    isDeleting.value = false;
  }
};

const goToPage = (page: number): void => {
  filters.page = page;
};

// ---------------------------------------------------------------------------
// Barcode scanner
// ---------------------------------------------------------------------------

const isScannerOpen = ref(false);

// Barcode already registered: stay on the list and only inform the user (§3A).
const handleBarcodeExists = (product: BarcodeCheckProduct): void => {
  notify.success(`Barcode sudah terdaftar. Produk: ${product.name}.`);
};

// Barcode is free: open the existing create form prefilled with the scan (§3B).
const handleBarcodeAvailable = async (barcode: string): Promise<void> => {
  isScannerOpen.value = false;

  try {
    await navigateTo({
      path: "/admin/master-data/products/create",
      query: { barcode },
    });
  } catch {
    notify.error("Gagal membuka halaman tambah produk. Silakan coba lagi.");
  }
};
</script>

<template>
  <div>
    <!-- Page heading -->
    <section
      class="flex flex-col gap-4 pt-8 pb-7 sm:flex-row sm:items-end sm:justify-between"
    >
      <div class="max-w-2xl">
        <p
          class="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand"
        >
          Master Data
        </p>
        <h2
          class="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl"
        >
          Produk
        </h2>
        <p class="mt-2 text-sm leading-relaxed text-muted">
          Kelola daftar barang yang dijual, termasuk kategori, merek, unit, dan
          harganya.
        </p>
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <BaseButton
          variant="secondary"
          @click="isScannerOpen = true"
        >
          <ScanBarcode class="h-4 w-4" />
          Scan Barcode
        </BaseButton>

        <BaseButton @click="navigateTo('/admin/master-data/products/create')">
          <Plus class="h-4 w-4" />
          Tambah Produk
        </BaseButton>
      </div>
    </section>

    <!-- List -->
    <section
      class="overflow-hidden rounded-4xl border border-line/70 bg-surface shadow-card"
    >
      <!-- Toolbar -->
      <div
        class="flex flex-col gap-3 border-b border-line/70 p-5 lg:flex-row lg:items-center"
      >
        <div class="relative flex-1">
          <Search
            class="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted"
          />
          <input
            v-model="searchInput"
            type="search"
            placeholder="Cari nama, SKU, atau barcode…"
            class="w-full rounded-2xl border border-line bg-surface py-2.5 pl-11 pr-4 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-brand/50"
          />
        </div>

        <div
          class="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:w-auto lg:shrink-0"
        >
          <BaseSelect
            v-model="filters.categoryId"
            :options="filterCategoryOptions"
          />
          <BaseSelect v-model="filters.brandId" :options="filterBrandOptions" />
          <BaseSelect v-model="filters.unitId" :options="filterUnitOptions" />
        </div>

        <div class="sm:w-40">
          <BaseSelect v-model="filters.isActive" :options="statusOptions" />
        </div>
      </div>

      <!-- Loading -->
      <div
        v-if="isLoading"
        class="flex items-center justify-center gap-3 py-16 text-muted"
      >
        <LoaderCircle class="h-5 w-5 animate-spin" />
        <span class="text-sm font-medium">Memuat data produk…</span>
      </div>

      <!-- Error -->
      <div
        v-else-if="loadFailed"
        class="flex flex-col items-center gap-4 py-16 text-center"
      >
        <span
          class="grid h-12 w-12 place-items-center rounded-2xl bg-coral-soft text-coral"
        >
          <TriangleAlert class="h-5 w-5" />
        </span>
        <p class="text-sm font-medium text-ink-2">
          Gagal memuat data produk. Silakan coba lagi.
        </p>
        <BaseButton variant="secondary" @click="refresh()"
          >Muat ulang</BaseButton
        >
      </div>

      <!-- Empty -->
      <div
        v-else-if="products.length === 0"
        class="flex flex-col items-center gap-4 py-16 text-center"
      >
        <span
          class="grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand"
        >
          <PackageOpen class="h-5 w-5" />
        </span>
        <div>
          <p class="text-sm font-semibold text-ink">Belum ada produk</p>
          <p class="mt-1 text-sm text-muted">
            {{
              search ||
              filters.categoryId ||
              filters.brandId ||
              filters.unitId ||
              filters.isActive
                ? "Tidak ada produk yang cocok dengan pencarian atau filter."
                : "Tambahkan produk pertama tokomu."
            }}
          </p>
        </div>
        <BaseButton
          v-if="!search"
          variant="secondary"
          @click="navigateTo('/admin/master-data/products/create')"
        >
          <Plus class="h-4 w-4" />
          Tambah Produk
        </BaseButton>
      </div>

      <template v-else>
        <!-- Desktop table -->
        <div
          class="hidden overflow-x-auto lg:block"
          :class="{ 'opacity-60': isRefreshing }"
        >
          <table class="w-full text-left">
            <thead>
              <tr
                class="border-b border-line/70 bg-surface-2/70 text-[11px] uppercase tracking-[0.12em] text-muted"
              >
                <th class="px-7 py-3.5 font-semibold">Produk</th>
                <th class="px-4 py-3.5 font-semibold">Kategori</th>
                <th class="px-4 py-3.5 font-semibold">Merek</th>
                <th class="px-4 py-3.5 font-semibold">Unit</th>
                <th class="px-4 py-3.5 font-semibold">Harga Beli</th>
                <th class="px-4 py-3.5 font-semibold">Harga Jual</th>
                <th class="px-4 py-3.5 font-semibold">Status</th>
                <th class="px-7 py-3.5 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line/60">
              <tr
                v-for="product in products"
                :key="product.id"
                class="transition-colors hover:bg-surface-2/60"
              >
                <td class="px-7 py-4">
                  <p class="text-sm font-semibold">{{ product.name }}</p>
                  <p class="mt-0.5 font-mono text-xs text-muted">
                    SKU · {{ product.sku }}
                    <span v-if="product.barcode"> · {{ product.barcode }}</span>
                  </p>
                </td>
                <td class="px-4 py-4 text-sm text-ink-2">
                  {{ product.category.name }}
                </td>
                <td class="px-4 py-4 text-sm text-ink-2">
                  {{ product.brand?.name ?? "—" }}
                </td>
                <td class="px-4 py-4">
                  <BaseBadge>{{ product.unit.symbol }}</BaseBadge>
                </td>
                <td class="px-4 py-4 font-mono text-sm tabular-nums text-ink-2">
                  {{ formatCurrency(product.purchasePrice) }}
                </td>
                <td
                  class="px-4 py-4 font-mono text-sm font-semibold tabular-nums"
                >
                  {{ formatCurrency(product.sellingPrice) }}
                </td>
                <td class="px-4 py-4">
                  <BaseBadge :tone="product.isActive ? 'brand' : 'neutral'">
                    {{ product.isActive ? "Aktif" : "Nonaktif" }}
                  </BaseBadge>
                </td>
                <td class="px-7 py-4">
                  <div class="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      class="grid h-9 w-9 place-items-center rounded-xl text-muted transition-colors hover:bg-brand-soft hover:text-brand"
                      :aria-label="`Edit ${product.name}`"
                      @click="navigateTo(`/admin/master-data/products/${product.id}/edit`)"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      class="grid h-9 w-9 place-items-center rounded-xl text-muted transition-colors hover:bg-coral-soft hover:text-coral"
                      :aria-label="`Hapus ${product.name}`"
                      @click="deleteTarget = product"
                    >
                      <Trash2 class="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile & tablet cards -->
        <div
          class="divide-y divide-line/60 lg:hidden"
          :class="{ 'opacity-60': isRefreshing }"
        >
          <div
            v-for="product in products"
            :key="product.id"
            class="space-y-3 p-5"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold">{{ product.name }}</p>
                <p class="mt-0.5 font-mono text-xs text-muted">
                  SKU · {{ product.sku }}
                </p>
              </div>
              <BaseBadge :tone="product.isActive ? 'brand' : 'neutral'">
                {{ product.isActive ? "Aktif" : "Nonaktif" }}
              </BaseBadge>
            </div>

            <div
              class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted"
            >
              <span>{{ product.category.name }}</span>
              <span v-if="product.brand">· {{ product.brand.name }}</span>
              <span>· {{ product.unit.symbol }}</span>
            </div>

            <div class="flex items-center justify-between gap-3">
              <p class="font-mono text-sm font-semibold tabular-nums">
                {{ formatCurrency(product.sellingPrice) }}
                <span class="text-xs font-normal text-muted">
                  (beli {{ formatCurrency(product.purchasePrice) }})
                </span>
              </p>

              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  class="grid h-9 w-9 place-items-center rounded-xl border border-line text-muted transition-colors hover:text-brand"
                  :aria-label="`Edit ${product.name}`"
                  @click="navigateTo(`/admin/master-data/products/${product.id}/edit`)"
                >
                  <Pencil class="h-4 w-4" />
                </button>
                <button
                  type="button"
                  class="grid h-9 w-9 place-items-center rounded-xl border border-line text-muted transition-colors hover:text-coral"
                  :aria-label="`Hapus ${product.name}`"
                  @click="deleteTarget = product"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <BasePagination
          :page="meta.page"
          :page-size="meta.pageSize"
          :total-pages="meta.totalPages"
          :total="meta.total"
          total-label="produk"
          :loading="isRefreshing"
          @update:page="goToPage"
        />
      </template>
    </section>

    <!-- Delete confirmation -->
    <BaseConfirmDialog
      v-model="isDeleteOpen"
      title="Hapus Produk"
      :message="deleteMessage"
      confirm-label="Hapus Produk"
      :loading="isDeleting"
      @confirm="handleDelete"
    />

    <!-- Barcode scanner -->
    <ProductBarcodeScannerModal
      v-model="isScannerOpen"
      @exists="handleBarcodeExists"
      @available="handleBarcodeAvailable"
    />
  </div>
</template>
