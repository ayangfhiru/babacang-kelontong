<script setup lang="ts">
import {
  ArrowLeft,
  LoaderCircle,
  PackagePlus,
  Plus,
  ScanBarcode,
  Trash2,
} from "@lucide/vue";
import type {
  BarcodeCheckProduct,
  CreateStockAdjustmentInput,
  PaginatedResponse,
  Product,
  StockAdjustment,
  StockAvailability,
} from "~~/types";
import type { SelectOption } from "~/components/ui/BaseSelect.vue";
import ProductBarcodeScannerModal from "~/components/product/ProductBarcodeScannerModal.vue";

usePageTitle("Penyesuaian Stok Baru");

const LIST_ROUTE = "/admin/inventory/adjustments";

const notify = useNotify();
const isSaving = ref(false);
const isScannerOpen = ref(false);
const formError = ref("");

const form = reactive({
  date: toLocalDateInputValue(),
  reason: "",
  notes: "",
});

/**
 * One adjustment line. Quantities stay strings until submit so an empty or
 * half-typed input is never coerced with `Number()` (§6 PROMT.md).
 */
interface AdjustmentLine {
  productId: string;
  physicalQty: string;
  unitCost: string;
  reason: string;
}

const items = ref<AdjustmentLine[]>([
  { productId: "", physicalQty: "", unitCost: "", reason: "" },
]);

const lineErrors = ref<Record<number, Record<string, string>>>({});

// ---------------------------------------------------------------------------
// Products + system stock (server-computed truth, §25.1)
// ---------------------------------------------------------------------------

const products = ref<Product[]>([]);
/** Extra options for scanned products outside the loaded list page. */
const extraOptions = ref<SelectOption[]>([]);
/** productId → system stock across all batches (from the availability API). */
const systemQtyCache = new Map<string, number>();

const loadProducts = async (): Promise<void> => {
  const response = await $fetch<PaginatedResponse<Product>>("/api/products", {
    query: { page: 1, pageSize: 100, isActive: "true" },
  });
  products.value = response.data;
};

await loadProducts();

const productOptions = computed<SelectOption[]>(() => [
  ...products.value.map((product) => ({
    value: product.id,
    label: `${product.sku} — ${product.name}`,
  })),
  ...extraOptions.value,
]);

const systemQtyOf = (line: AdjustmentLine): number | null =>
  line.productId ? (systemQtyCache.get(line.productId) ?? null) : null;

const differenceOf = (line: AdjustmentLine): number | null => {
  const systemQty = systemQtyOf(line);
  if (systemQty === null) return null;

  const physicalQty = parseNonNegativeInt(line.physicalQty);
  if (physicalQty === null) return null;

  return physicalQty - systemQty;
};

const formatDifference = (line: AdjustmentLine): string => {
  const difference = differenceOf(line);
  if (difference === null) return "—";

  return `${difference > 0 ? "+" : ""}${difference}`;
};

const differenceClass = (line: AdjustmentLine): string => {
  const difference = differenceOf(line);
  if (difference === null || difference === 0) return "text-muted";
  return difference > 0 ? "text-brand" : "text-coral";
};

const prefetchSystemQty = async (): Promise<void> => {
  const missing = [
    ...new Set(
      items.value
        .map((line) => line.productId)
        .filter((id) => id && !systemQtyCache.has(id)),
    ),
  ];

  await Promise.all(
    missing.map(async (productId) => {
      try {
        const availability = await $fetch<StockAvailability>(
          "/api/stock/availability",
          { query: { productId } },
        );
        systemQtyCache.set(productId, availability.systemTotal);
      } catch {
        // Submit validation blocks rows whose system stock never loaded.
      }
    }),
  );
};

watch(
  () => items.value.map((line) => line.productId).join(","),
  () => {
    void prefetchSystemQty();
  },
);

// ---------------------------------------------------------------------------
// Item helpers
// ---------------------------------------------------------------------------

const addItem = (): void => {
  items.value.push({ productId: "", physicalQty: "", unitCost: "", reason: "" });
};

const removeItem = (index: number): void => {
  if (items.value.length > 1) items.value.splice(index, 1);
  delete lineErrors.value[index];
};

// ---------------------------------------------------------------------------
// Barcode scanner flow (§4 PROMT.md): scan only selects the product — stock
// is never changed until the user reviews and saves the whole document.
// ---------------------------------------------------------------------------

const handleScannerFound = (product: BarcodeCheckProduct): void => {
  isScannerOpen.value = false;

  if (!products.value.some((entry) => entry.id === product.id)) {
    extraOptions.value.push({
      value: product.id,
      label: `${product.sku} — ${product.name}`,
    });
  }
  systemQtyCache.set(product.id, product.stock);

  const existing = items.value.find((line) => line.productId === product.id);
  if (!existing) {
    const emptyLine = items.value.find((line) => !line.productId);
    if (emptyLine) {
      emptyLine.productId = product.id;
    } else {
      items.value.push({
        productId: product.id,
        physicalQty: "",
        unitCost: "",
        reason: "",
      });
    }
  }

  notify.success(`Produk "${product.name}" dipilih. Masukkan stok fisik.`);
};

// ---------------------------------------------------------------------------
// Validation + submit
// ---------------------------------------------------------------------------

const validate = (): boolean => {
  const errors: Record<number, Record<string, string>> = {};
  let docReasonMissing = false;

  items.value.forEach((line, index) => {
    const row: Record<string, string> = {};

    if (!line.productId) {
      row.productId = "Produk wajib dipilih.";
    } else if (systemQtyOf(line) === null) {
      row.productId = "Stok sistem gagal dimuat. Muat ulang halaman.";
    }

    const physicalQty = parseNonNegativeInt(line.physicalQty);
    if (physicalQty === null) {
      row.physicalQty = "Stok fisik harus berupa bilangan bulat tidak negatif.";
    }

    const systemQty = systemQtyOf(line);
    if (row.productId || physicalQty === null || systemQty === null) {
      if (Object.keys(row).length > 0) errors[index] = row;
      return;
    }

    const difference = physicalQty - systemQty;

    if (difference > 0) {
      const unitCost = parseNonNegativeMoney(line.unitCost);
      if (unitCost === null || unitCost <= 0) {
        row.unitCost = "Biaya satuan wajib diisi untuk stok bertambah.";
      }
    } else if (difference < 0 && !line.reason.trim() && !form.reason.trim()) {
      row.reason = "Alasan wajib diisi untuk stok berkurang.";
      docReasonMissing = true;
    }

    if (Object.keys(row).length > 0) errors[index] = row;
  });

  lineErrors.value = errors;
  formError.value = docReasonMissing
    ? "Alasan penyesuaian wajib diisi untuk item yang stoknya berkurang."
    : "";

  return Object.keys(errors).length === 0;
};

const submit = async (): Promise<void> => {
  if (isSaving.value) return;
  formError.value = "";

  if (!validate()) return;

  isSaving.value = true;

  try {
    const payload: CreateStockAdjustmentInput = {
      date: form.date,
      reason: form.reason.trim() || null,
      notes: form.notes.trim() || null,
      items: items.value.map((line) => {
        const systemQty = systemQtyOf(line) ?? 0;
        const physicalQty = parseNonNegativeInt(line.physicalQty) ?? 0;
        const difference = physicalQty - systemQty;
        const unitCost = parseNonNegativeMoney(line.unitCost);

        return {
          productId: line.productId,
          physicalQty,
          // Only meaningful (and validated) for additions.
          ...(difference > 0 && unitCost !== null ? { unitCost } : {}),
          reason: line.reason.trim() || null,
        };
      }),
    };

    const created = await $fetch<StockAdjustment>("/api/stock-adjustments", {
      method: "POST",
      body: payload,
    });

    notify.success(
      "Draft penyesuaian stok tersimpan. Periksa detail lalu posting untuk menerapkan perubahan stok.",
    );
    await navigateTo(`${LIST_ROUTE}/${created.id}`);
  } catch (error) {
    formError.value = getApiErrorPayload(error).message;
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <div>
    <section class="flex items-center gap-4 pt-8 pb-7">
      <NuxtLink :to="LIST_ROUTE" aria-label="Kembali ke daftar penyesuaian">
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink>
      <div class="flex-1">
        <p
          class="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand"
        >
          Inventori
        </p>
        <h2 class="mt-2 font-display text-3xl font-bold">
          Penyesuaian Stok Baru
        </h2>
        <p class="mt-2 text-sm text-muted">
          Stok berubah setelah draft diposting. Selisih negatif mengikuti
          alokasi FIFO.
        </p>
      </div>
      <BaseButton variant="secondary" @click="isScannerOpen = true">
        <ScanBarcode class="h-4 w-4" />
        Scan Barcode
      </BaseButton>
    </section>

    <form class="space-y-6" @submit.prevent="submit">
      <!-- Document fields -->
      <section
        class="grid gap-4 rounded-4xl border border-line/70 bg-surface p-6 shadow-card sm:grid-cols-3"
      >
        <BaseInput v-model="form.date" label="Tanggal" type="date" required />
        <div class="sm:col-span-2">
          <BaseInput v-model="form.reason" label="Alasan (berlaku untuk semua item)" />
        </div>
        <div class="sm:col-span-3">
          <BaseInput v-model="form.notes" label="Catatan" />
        </div>
      </section>

      <!-- Items -->
      <section class="rounded-4xl border border-line/70 bg-surface p-6 shadow-card">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="font-semibold">Item Penyesuaian</h3>
          <BaseButton type="button" variant="secondary" @click="addItem">
            <Plus class="h-4 w-4" />
            Tambah Item
          </BaseButton>
        </div>

        <div class="space-y-6">
          <article
            v-for="(line, index) in items"
            :key="index"
            class="rounded-3xl border border-line/60 bg-surface-2/40 p-4"
          >
            <div class="mb-3 flex items-center justify-between">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted">
                Item {{ index + 1 }}
              </p>
              <button
                v-if="items.length > 1"
                type="button"
                class="text-coral"
                aria-label="Hapus item"
                @click="removeItem(index)"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </div>

            <BaseSelect
              v-model="line.productId"
              label="Produk"
              :options="productOptions"
              placeholder="Pilih produk atau gunakan Scan Barcode"
              required
              :error="lineErrors[index]?.productId"
            />

            <div class="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <p class="mb-1.5 block text-sm font-semibold text-ink-2">
                  Stok Sistem
                </p>
                <p class="rounded-2xl border border-line bg-surface px-4 py-2.5 text-sm text-ink">
                  <template v-if="systemQtyOf(line) !== null">
                    {{ systemQtyOf(line) }}
                  </template>
                  <template v-else-if="line.productId">
                    <LoaderCircle class="mr-1 inline h-4 w-4 animate-spin" />
                    Memuat…
                  </template>
                  <template v-else>—</template>
                </p>
              </div>

              <BaseInput
                v-model="line.physicalQty"
                label="Stok Fisik"
                type="number"
                inputmode="numeric"
                :min="0"
                placeholder="0"
                required
                :error="lineErrors[index]?.physicalQty"
                hint="Hasil hitung fisik di rak."
              />

              <div>
                <p class="mb-1.5 block text-sm font-semibold text-ink-2">
                  Selisih
                </p>
                <p
                  class="rounded-2xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold"
                  :class="differenceClass(line)"
                >
                  {{ formatDifference(line) }}
                </p>
              </div>
            </div>

            <div v-if="(differenceOf(line) ?? 0) > 0" class="mt-4">
              <BaseInput
                v-model="line.unitCost"
                label="Biaya Satuan (Rp)"
                type="text"
                inputmode="decimal"
                placeholder="0"
                required
                :error="lineErrors[index]?.unitCost"
                hint="Harga perolehan barang yang ditemukan."
              />
            </div>

            <div v-else-if="(differenceOf(line) ?? 0) < 0" class="mt-4">
              <BaseInput
                v-model="line.reason"
                label="Alasan Pengurangan"
                :error="lineErrors[index]?.reason"
                hint="Wajib diisi bila alasan umum di atas kosong."
              />
            </div>
          </article>
        </div>
      </section>

      <!-- Submit -->
      <section
        class="flex flex-col items-end gap-3 rounded-4xl border border-line/70 bg-surface p-6 shadow-card"
      >
        <p v-if="formError" class="text-sm font-medium text-coral">
          {{ formError }}
        </p>

        <p class="w-full max-w-md text-xs text-muted">
          Simpan sebagai draft terlebih dahulu. Stok FIFO baru diperbarui saat
          penyesuaian diposting dari halaman detail.
        </p>

        <BaseButton type="submit" :loading="isSaving">
          <PackagePlus class="h-4 w-4" />
          Simpan Draft
        </BaseButton>
      </section>
    </form>

    <!-- Barcode scanner -->
    <ProductBarcodeScannerModal
      v-model="isScannerOpen"
      found-action-label="Gunakan Produk"
      @found="handleScannerFound"
    />
  </div>
</template>
