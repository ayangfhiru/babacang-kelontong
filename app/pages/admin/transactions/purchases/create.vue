<script setup lang="ts">
import { ArrowLeft, Pencil, Plus, Trash2 } from "@lucide/vue";
import type {
  PaginatedResponse,
  Product,
  PurchaseItemDraft,
  PurchaseItemFormPayload,
  Supplier,
} from "~~/types";

usePageTitle("Pembelian Baru");

const notify = useNotify();
const saving = ref(false);

const suppliers = ref<Supplier[]>([]);
const products = ref<Product[]>([]);

const form = reactive({
  supplierId: "",
  date: new Date().toISOString().slice(0, 10),
  notes: "",
  /** Kept as a string so half-typed input is never coerced by `Number("")`. */
  discount: "0",
});

// ---------------------------------------------------------------------------
// Temporary item list (never persisted before the transaction is submitted)
// ---------------------------------------------------------------------------

const items = ref<PurchaseItemDraft[]>([]);

const itemModalOpen = ref(false);
const editingKey = ref<string | null>(null);
const deleteTarget = ref<PurchaseItemDraft | null>(null);

const productById = computed(
  () => new Map(products.value.map((product) => [product.id, product])),
);

const productOf = (item: PurchaseItemDraft): Product | undefined =>
  productById.value.get(item.productId);

const lineSubtotal = (item: PurchaseItemDraft): number =>
  item.quantity * item.unitCost - item.discount;

const itemCount = computed(() => items.value.length);

const totalQuantity = computed(() =>
  items.value.reduce((sum, item) => sum + item.quantity, 0),
);

const subtotal = computed(() =>
  items.value.reduce((sum, item) => sum + lineSubtotal(item), 0),
);

/** Transaction-level discount; invalid input shows as 0 and is caught on submit. */
const headerDiscount = computed(() => {
  const raw = form.discount.trim();
  return raw === "" ? 0 : (parseNonNegativeMoney(raw) ?? 0);
});

const total = computed(() => Math.max(subtotal.value - headerDiscount.value, 0));

const createKey = (): string => crypto.randomUUID();

const openAddItem = (): void => {
  editingKey.value = null;
  itemModalOpen.value = true;
};

const openEditItem = (item: PurchaseItemDraft): void => {
  editingKey.value = item.key;
  itemModalOpen.value = true;
};

const editingItem = computed(
  () => items.value.find((item) => item.key === editingKey.value) ?? null,
);

/** Runs when the modal saves: update in place, or append a brand-new line. */
const saveItem = (payload: PurchaseItemFormPayload): void => {
  const key = editingKey.value;

  if (key) {
    const index = items.value.findIndex((item) => item.key === key);
    if (index !== -1) items.value.splice(index, 1, { key, ...payload });
    notify.success("Item pembelian diperbarui.");
  } else {
    items.value.push({ key: createKey(), ...payload });
    notify.success("Item pembelian ditambahkan.");
  }

  editingKey.value = null;
};

const requestDeleteItem = (item: PurchaseItemDraft): void => {
  deleteTarget.value = item;
};

/** Local state only — nothing is sent to the API for an unsaved draft line. */
const confirmDeleteItem = (): void => {
  const target = deleteTarget.value;
  if (!target) return;

  items.value = items.value.filter((item) => item.key !== target.key);
  deleteTarget.value = null;
  notify.success("Item dihapus dari daftar.");
};

// ---------------------------------------------------------------------------
// Lookup data
// ---------------------------------------------------------------------------

// During SSR the outgoing request carries no browser cookies, so the session
// cookie must be forwarded explicitly — otherwise `requireSession` answers 401
// and the whole page fails to render.
const requestHeaders = import.meta.server
  ? useRequestHeaders(["cookie"])
  : undefined;

const load = async () => {
  const [supplierResponse, productResponse] = await Promise.all([
    $fetch<PaginatedResponse<Supplier>>("/api/suppliers", {
      query: { page: 1, pageSize: 100, isActive: "true" },
      headers: requestHeaders,
    }),
    $fetch<PaginatedResponse<Product>>("/api/products", {
      query: { page: 1, pageSize: 100, isActive: "true" },
      headers: requestHeaders,
    }),
  ]);
  suppliers.value = supplierResponse.data;
  products.value = productResponse.data;
};
await load();

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------

const submit = async (): Promise<void> => {
  if (saving.value) return;

  if (!form.supplierId) {
    notify.error("Supplier wajib dipilih.");
    return;
  }
  if (!form.date) {
    notify.error("Tanggal wajib diisi.");
    return;
  }
  if (items.value.length === 0) {
    notify.error("Minimal satu item pembelian. Tambahkan item terlebih dahulu.");
    return;
  }

  const rawDiscount = form.discount.trim();
  const discount = rawDiscount === "" ? 0 : parseNonNegativeMoney(rawDiscount);
  if (discount === null) {
    notify.error("Diskon transaksi tidak valid (angka ≥ 0).");
    return;
  }

  saving.value = true;
  try {
    await $fetch("/api/purchases", {
      method: "POST",
      body: {
        supplierId: form.supplierId,
        date: form.date,
        notes: form.notes,
        discount,
        items: items.value.map(
          ({
            productId,
            quantity,
            unitCost,
            discount: itemDiscount,
            batchNumber,
            expiredAt,
          }) => ({
            productId,
            quantity,
            unitCost,
            discount: itemDiscount,
            batchNumber: batchNumber || null,
            expiredAt: expiredAt || null,
          }),
        ),
      },
    });
    notify.success("Draft pembelian berhasil dibuat.");
    await navigateTo("/admin/transactions/purchases");
  } catch (error) {
    const payload = getApiErrorPayload(error);
    const detailMessages = payload.details
      ? Object.values(payload.details).flat()
      : [];
    notify.error([payload.message, ...detailMessages].join(" "));
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div>
    <section class="flex items-center gap-4 pt-8 pb-7">
      <NuxtLink to="/admin/transactions/purchases"
        ><ArrowLeft class="h-5 w-5"
      /></NuxtLink>
      <div>
        <p
          class="text-[11px] font-semibold uppercase tracking-[.14em] text-brand"
        >
          Transaksi
        </p>
        <h2 class="mt-2 font-display text-3xl font-bold">Pembelian Baru</h2>
      </div>
    </section>

    <form class="space-y-6" @submit.prevent="submit">
      <!-- Transaction header -->
      <section
        class="grid gap-4 rounded-4xl border border-line/70 bg-surface p-6 shadow-card sm:grid-cols-3"
      >
        <BaseSelect
          v-model="form.supplierId"
          label="Supplier"
          :options="suppliers.map((s) => ({ value: s.id, label: s.name }))"
          required
        />
        <BaseInput v-model="form.date" label="Tanggal" type="date" required />
        <BaseInput v-model="form.notes" label="Catatan" />
      </section>

      <!-- Items -->
      <section
        class="rounded-4xl border border-line/70 bg-surface p-6 shadow-card"
      >
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 class="font-semibold">Item Pembelian</h3>
            <p class="mt-1 text-sm text-muted">
              {{ itemCount }} item · {{ totalQuantity }} total kuantitas
            </p>
          </div>
          <BaseButton type="button" variant="secondary" @click="openAddItem">
            <Plus class="h-4 w-4" /> Tambah Item
          </BaseButton>
        </div>

        <!-- Empty state -->
        <div
          v-if="items.length === 0"
          class="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line px-6 py-10 text-center"
        >
          <p class="text-sm text-muted">Belum ada item pembelian.</p>
          <BaseButton type="button" variant="secondary" @click="openAddItem">
            <Plus class="h-4 w-4" /> Tambah Item Pertama
          </BaseButton>
        </div>

        <template v-else>
          <!-- Cards: phones and tablets -->
          <ul class="space-y-3 lg:hidden">
            <li
              v-for="item in items"
              :key="item.key"
              class="rounded-3xl border border-line/70 bg-surface-2/40 p-4"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="break-words font-medium text-ink">
                    {{ productOf(item)?.name ?? "Produk" }}
                  </p>
                  <p class="mt-0.5 break-words text-xs text-muted">
                    {{ productOf(item)?.sku ?? "-" }}
                    <template v-if="item.batchNumber">
                      · Batch {{ item.batchNumber }}</template
                    >
                  </p>
                </div>
                <div class="flex shrink-0 gap-2">
                  <button
                    type="button"
                    class="grid h-11 w-11 place-items-center rounded-2xl border border-line bg-surface text-ink-2 transition-colors hover:border-brand/40 hover:text-brand"
                    :aria-label="`Edit ${productOf(item)?.name ?? 'item'}`"
                    @click="openEditItem(item)"
                  >
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    class="grid h-11 w-11 place-items-center rounded-2xl border border-line bg-surface text-coral transition-colors hover:border-coral/50"
                    :aria-label="`Hapus ${productOf(item)?.name ?? 'item'}`"
                    @click="requestDeleteItem(item)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </div>

              <dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt class="text-xs text-muted">Jumlah</dt>
                  <dd class="mt-0.5">
                    {{ item.quantity }}
                    {{ productOf(item)?.unit.symbol ?? "" }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-muted">Harga beli</dt>
                  <dd class="mt-0.5">{{ formatCurrency(item.unitCost) }}</dd>
                </div>
                <div v-if="item.discount > 0">
                  <dt class="text-xs text-muted">Diskon</dt>
                  <dd class="mt-0.5 text-coral">
                    -{{ formatCurrency(item.discount) }}
                  </dd>
                </div>
                <div v-if="item.expiredAt">
                  <dt class="text-xs text-muted">Kedaluwarsa</dt>
                  <dd class="mt-0.5">{{ formatDate(item.expiredAt) }}</dd>
                </div>
                <div
                  class="col-span-2 flex items-center justify-between border-t border-line/70 pt-2 font-semibold"
                >
                  <dt>Subtotal</dt>
                  <dd>{{ formatCurrency(lineSubtotal(item)) }}</dd>
                </div>
              </dl>
            </li>
          </ul>

          <!-- Table: desktop and wide tablets -->
          <div class="hidden overflow-x-auto lg:block">
            <table class="w-full min-w-[880px] text-sm">
              <thead class="text-left text-muted">
                <tr>
                  <th class="p-2">Produk</th>
                  <th class="p-2">Qty</th>
                  <th class="p-2">Harga beli</th>
                  <th class="p-2">Diskon</th>
                  <th class="p-2">Batch</th>
                  <th class="p-2">Kedaluwarsa</th>
                  <th class="p-2 text-right">Subtotal</th>
                  <th class="p-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in items"
                  :key="item.key"
                  class="border-t border-line/70"
                >
                  <td class="p-2">
                    <span class="block font-medium text-ink">
                      {{ productOf(item)?.name ?? "Produk" }}
                    </span>
                    <span class="block text-xs text-muted">
                      {{ productOf(item)?.sku ?? "-" }}
                    </span>
                  </td>
                  <td class="p-2">
                    {{ item.quantity }}
                    {{ productOf(item)?.unit.symbol ?? "" }}
                  </td>
                  <td class="p-2">{{ formatCurrency(item.unitCost) }}</td>
                  <td class="p-2">
                    {{ item.discount > 0 ? formatCurrency(item.discount) : "—" }}
                  </td>
                  <td class="p-2">{{ item.batchNumber || "—" }}</td>
                  <td class="p-2">
                    {{ item.expiredAt ? formatDate(item.expiredAt) : "—" }}
                  </td>
                  <td class="p-2 text-right font-semibold">
                    {{ formatCurrency(lineSubtotal(item)) }}
                  </td>
                  <td class="p-2">
                    <div class="flex justify-end gap-2">
                      <button
                        type="button"
                        class="grid h-11 w-11 place-items-center rounded-2xl border border-line bg-surface text-ink-2 transition-colors hover:border-brand/40 hover:text-brand"
                        :aria-label="`Edit ${productOf(item)?.name ?? 'item'}`"
                        @click="openEditItem(item)"
                      >
                        <Pencil class="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        class="grid h-11 w-11 place-items-center rounded-2xl border border-line bg-surface text-coral transition-colors hover:border-coral/50"
                        :aria-label="`Hapus ${productOf(item)?.name ?? 'item'}`"
                        @click="requestDeleteItem(item)"
                      >
                        <Trash2 class="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </section>

      <!-- Summary -->
      <section
        class="rounded-4xl border border-line/70 bg-surface p-6 shadow-card"
      >
        <div
          class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between"
        >
          <div class="w-full lg:max-w-xs">
            <BaseInput
              v-model="form.discount"
              label="Diskon transaksi"
              type="number"
              inputmode="decimal"
              :min="0"
            />
          </div>

          <dl class="w-full space-y-2 text-sm lg:max-w-sm">
            <div class="flex justify-between">
              <dt class="text-muted">Jumlah item</dt>
              <dd>{{ itemCount }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted">Total kuantitas</dt>
              <dd>{{ totalQuantity }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted">Subtotal</dt>
              <dd>{{ formatCurrency(subtotal) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted">Diskon transaksi</dt>
              <dd>{{ formatCurrency(headerDiscount) }}</dd>
            </div>
            <div
              class="flex items-center justify-between border-t border-line/70 pt-3 text-lg font-bold"
            >
              <dt>Total</dt>
              <dd>{{ formatCurrency(total) }}</dd>
            </div>
          </dl>
        </div>

        <div class="mt-5 flex justify-end border-t border-line/70 pt-5">
          <BaseButton
            type="submit"
            class="w-full sm:w-auto"
            :disabled="saving"
          >
            {{ saving ? "Menyimpan…" : "Simpan Draft" }}
          </BaseButton>
        </div>
      </section>
    </form>

    <PurchaseItemModal
      v-model="itemModalOpen"
      :products="products"
      :item="editingItem"
      @save="saveItem"
    />

    <BaseConfirmDialog
      :model-value="Boolean(deleteTarget)"
      title="Hapus item?"
      :message="
        `Item ${deleteTarget ? productOf(deleteTarget)?.name ?? '' : ''} akan dihapus dari daftar.`
      "
      confirm-label="Hapus"
      @update:model-value="deleteTarget = null"
      @confirm="confirmDeleteItem"
    />
  </div>
</template>
