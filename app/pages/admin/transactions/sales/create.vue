<script setup lang="ts">
import { ArrowLeft, Plus, Trash2 } from "@lucide/vue";
import type { PaginatedResponse, Product } from "~~/types";

usePageTitle("Penjualan Baru");

const LIST_ROUTE = "/admin/transactions/sales";

interface Line {
  productId: string;
  quantity: string;
  unitPrice: string;
  discount: string;
}

const notify = useNotify();
const saving = ref(false);
const products = ref<Product[]>([]);

const form = reactive({
  // The API expects an ISO datetime from <input type="datetime-local">.
  date: toLocalDateTimeInputValue(),
  notes: "",
  discount: "0",
  tax: "0",
});

const items = ref<Line[]>([
  { productId: "", quantity: "1", unitPrice: "0", discount: "0" },
]);

const subtotal = computed(() =>
  items.value.reduce((sum, item) => {
    const quantity = parsePositiveInt(item.quantity);
    const unitPrice = parseNonNegativeMoney(item.unitPrice);
    const discount = parseNonNegativeMoney(item.discount) ?? 0;
    if (quantity === null || unitPrice === null) return sum;

    return sum + quantity * unitPrice - discount;
  }, 0),
);

const total = computed(() =>
  Math.max(
    subtotal.value -
      (parseNonNegativeMoney(form.discount) ?? 0) +
      (parseNonNegativeMoney(form.tax) ?? 0),
    0,
  ),
);

const addItem = (): void => {
  items.value.push({
    productId: "",
    quantity: "1",
    unitPrice: "0",
    discount: "0",
  });
};

const removeItem = (index: number): void => {
  if (items.value.length > 1) items.value.splice(index, 1);
};

const productOptions = computed(() =>
  products.value.map((product) => ({
    value: product.id,
    label: `${product.sku} — ${product.name}`,
  })),
);

const load = async (): Promise<void> => {
  const response = await $fetch<PaginatedResponse<Product>>("/api/products", {
    query: { page: 1, pageSize: 100, isActive: "true" },
  });
  products.value = response.data;
};

await load();

// Prefill the selling price from the product master when a product is picked.
watch(
  () => items.value.map((item) => item.productId).join(","),
  () => {
    for (const item of items.value) {
      if ((parseNonNegativeMoney(item.unitPrice) ?? 0) > 0) continue;
      const product = products.value.find(
        (entry) => entry.id === item.productId,
      );
      if (product) item.unitPrice = String(product.sellingPrice);
    }
  },
);

const submit = async (): Promise<void> => {
  if (saving.value) return;
  saving.value = true;

  try {
    await $fetch("/api/sales", {
      method: "POST",
      body: {
        date: form.date,
        notes: form.notes.trim() || null,
        discount: parseNonNegativeMoney(form.discount) ?? 0,
        tax: parseNonNegativeMoney(form.tax) ?? 0,
        items: items.value.map((item) => ({
          productId: item.productId,
          quantity: parsePositiveInt(item.quantity) ?? 0,
          unitPrice: parseNonNegativeMoney(item.unitPrice) ?? 0,
          discount: parseNonNegativeMoney(item.discount) ?? 0,
        })),
      },
    });
    notify.success("Draft penjualan berhasil dibuat.");
    await navigateTo(LIST_ROUTE);
  } catch (error) {
    notify.error(getApiErrorPayload(error).message);
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div>
    <section class="flex items-center gap-4 pt-8 pb-7">
      <NuxtLink :to="LIST_ROUTE" aria-label="Kembali ke daftar penjualan">
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink>
      <div>
        <p
          class="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand"
        >
          Transaksi
        </p>
        <h2 class="mt-2 font-display text-3xl font-bold">Penjualan Baru</h2>
        <p class="mt-2 text-sm text-muted">
          Stok dialokasikan FIFO saat transaksi diposting.
        </p>
      </div>
    </section>

    <form class="space-y-6" @submit.prevent="submit">
      <section
        class="grid gap-4 rounded-4xl border border-line/70 bg-surface p-6 shadow-card sm:grid-cols-3"
      >
        <BaseInput
          v-model="form.date"
          label="Tanggal & Waktu"
          type="datetime-local"
          required
        />
        <BaseInput
          v-model="form.discount"
          label="Diskon (Rp)"
          type="number"
          :min="0"
        />
        <BaseInput
          v-model="form.tax"
          label="Pajak (Rp)"
          type="number"
          :min="0"
        />
        <div class="sm:col-span-3">
          <BaseInput v-model="form.notes" label="Catatan" />
        </div>
      </section>

      <section
        class="overflow-x-auto rounded-4xl border border-line/70 bg-surface p-6 shadow-card"
      >
        <div class="mb-4 flex items-center justify-between">
          <h3 class="font-semibold">Item Penjualan</h3>
          <BaseButton type="button" variant="secondary" @click="addItem">
            <Plus class="h-4 w-4" />
            Tambah Item
          </BaseButton>
        </div>

        <table class="w-full min-w-[720px] text-sm">
          <thead class="text-left text-muted">
            <tr>
              <th class="p-2">Produk</th>
              <th class="p-2">Qty</th>
              <th class="p-2">Harga jual</th>
              <th class="p-2">Diskon</th>
              <th class="p-2" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in items" :key="index">
              <td class="p-2">
                <BaseSelect
                  class="w-[300px]"
                  v-model="item.productId"
                  :options="productOptions"
                />
              </td>
              <td class="p-2">
                <BaseInput v-model="item.quantity" type="number" :min="1" />
              </td>
              <td class="p-2">
                <BaseInput v-model="item.unitPrice" type="number" :min="0" />
              </td>
              <td class="p-2">
                <BaseInput v-model="item.discount" type="number" :min="0" />
              </td>
              <td class="p-2">
                <button
                  type="button"
                  class="text-coral"
                  aria-label="Hapus item"
                  @click="removeItem(index)"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section
        class="flex flex-col items-end gap-3 rounded-4xl border border-line/70 bg-surface p-6 shadow-card"
      >
        <div class="w-full max-w-xs space-y-2">
          <p class="flex justify-between text-sm">
            <span class="text-muted">Subtotal</span>
            <span class="font-mono font-semibold">
              Rp {{ subtotal.toLocaleString("id-ID") }}
            </span>
          </p>
          <p class="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span class="font-mono"
              >Rp {{ total.toLocaleString("id-ID") }}</span
            >
          </p>
        </div>

        <BaseButton type="submit" :loading="saving">Simpan Draft</BaseButton>
      </section>
    </form>
  </div>
</template>
