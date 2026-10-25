<script setup lang="ts">
import { ArrowLeft } from "@lucide/vue";
import type {
  CreateReturnInput,
  PaginatedResponse,
  Purchase,
  PurchaseSummary,
  ReturnKind,
  Sales,
  SalesSummary,
} from "~~/types";

usePageTitle("Retur Baru");

/** A line of the source document, shaped for the return quantity table. */
interface SourceItemView {
  id: string;
  quantity: number;
  product: { name: string; sku: string; unitSymbol: string };
}

interface ReturnLine {
  sourceItemId: string;
  name: string;
  sku: string;
  unitSymbol: string;
  sourceQty: number;
  quantity: number;
  restock: boolean;
}

type SourceSummary = SalesSummary | PurchaseSummary;

const notify = useNotify();
const saving = ref(false);

const kind = ref<ReturnKind | "">("");
const sourceId = ref("");
const sources = ref<SourceSummary[]>([]);
const loadingSources = ref(false);
const lines = ref<ReturnLine[]>([]);
const loadingLines = ref(false);

const form = reactive({
  date: new Date().toISOString().slice(0, 10),
  reason: "",
  condition: "",
  notes: "",
});

const kindOptions = [
  { value: "SALE", label: "Retur Penjualan (barang dari pelanggan)" },
  { value: "PURCHASE", label: "Retur Pembelian (barang ke supplier)" },
];

const isSale = computed(() => kind.value === "SALE");

const sourceOptions = computed(() =>
  sources.value.map((source) => ({
    value: source.id,
    label:
      `${source.number} · ${new Date(source.date).toLocaleDateString("id-ID")}` +
      ("supplier" in source ? ` · ${source.supplier.name}` : "") +
      ` · Rp ${source.total.toLocaleString("id-ID")}`,
  })),
);

const toLine = (item: SourceItemView): ReturnLine => ({
  sourceItemId: item.id,
  name: item.product.name,
  sku: item.product.sku,
  unitSymbol: item.product.unitSymbol,
  sourceQty: item.quantity,
  quantity: 0,
  // Conservative default: stock only re-enters a sellable batch when checked.
  restock: false,
});

/** Only posted documents can be returned (enforced server-side as well). */
const loadSources = async (): Promise<void> => {
  sources.value = [];
  sourceId.value = "";
  lines.value = [];
  if (!kind.value) return;

  loadingSources.value = true;
  try {
    const path = kind.value === "SALE" ? "/api/sales" : "/api/purchases";
    const response = await $fetch<PaginatedResponse<SourceSummary>>(path, {
      query: { status: "POSTED", page: 1, pageSize: 100 },
    });
    sources.value = response.data;
    if (sources.value.length === 0) {
      notify.error("Belum ada dokumen berstatus posted untuk diretur.");
    }
  } catch (error) {
    notify.error(getApiErrorPayload(error).message);
  } finally {
    loadingSources.value = false;
  }
};

const loadLines = async (): Promise<void> => {
  lines.value = [];
  if (!kind.value || !sourceId.value) return;

  loadingLines.value = true;
  try {
    const items: SourceItemView[] =
      kind.value === "SALE"
        ? (await $fetch<Sales>(`/api/sales/${sourceId.value}`)).items
        : (await $fetch<Purchase>(`/api/purchases/${sourceId.value}`)).items;
    lines.value = items.map(toLine);
  } catch (error) {
    notify.error(getApiErrorPayload(error).message);
  } finally {
    loadingLines.value = false;
  }
};

watch(kind, () => {
  void loadSources();
});

watch(sourceId, () => {
  void loadLines();
});

const submit = async (): Promise<void> => {
  const selectedKind = kind.value;
  if (selectedKind !== "SALE" && selectedKind !== "PURCHASE") {
    notify.error("Jenis retur wajib dipilih.");
    return;
  }
  if (!sourceId.value) {
    notify.error("Dokumen sumber wajib dipilih.");
    return;
  }

  const selectedLines = lines.value.filter(
    (line) => Number(line.quantity) > 0,
  );
  if (selectedLines.length === 0) {
    notify.error("Minimal satu item retur dengan jumlah lebih dari 0.");
    return;
  }
  const invalidLine = selectedLines.find((line) => {
    const quantity = Number(line.quantity);
    return (
      !Number.isInteger(quantity) || quantity < 1 || quantity > line.sourceQty
    );
  });
  if (invalidLine) {
    notify.error(
      `Jumlah retur "${invalidLine.name}" tidak valid (maksimal ${invalidLine.sourceQty} ${invalidLine.unitSymbol}).`,
    );
    return;
  }

  saving.value = true;
  try {
    const body: CreateReturnInput = {
      kind: selectedKind,
      sourceId: sourceId.value,
      date: form.date,
      reason: form.reason || null,
      condition: form.condition || null,
      notes: form.notes || null,
      items: selectedLines.map((line) => ({
        sourceItemId: line.sourceItemId,
        quantity: Number(line.quantity),
        ...(selectedKind === "SALE" ? { restock: line.restock } : {}),
      })),
    };
    await $fetch("/api/returns", { method: "POST", body });
    notify.success("Draft retur berhasil dibuat.");
    await navigateTo("/admin/transactions/returns");
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
      <NuxtLink to="/admin/transactions/returns"
        ><ArrowLeft class="h-5 w-5"
      /></NuxtLink>
      <div>
        <p
          class="text-[11px] font-semibold uppercase tracking-[.14em] text-brand"
        >
          Transaksi
        </p>
        <h2 class="mt-2 font-display text-3xl font-bold">Retur Baru</h2>
      </div>
    </section>
    <form class="space-y-6" @submit.prevent="submit">
      <section
        class="grid gap-4 rounded-4xl border border-line/70 bg-surface p-6 shadow-card sm:grid-cols-3"
      >
        <BaseSelect
          v-model="kind"
          label="Jenis Retur"
          :options="kindOptions"
          required
        />
        <BaseSelect
          v-model="sourceId"
          label="Dokumen Sumber"
          :options="sourceOptions"
          :disabled="!kind || loadingSources"
          :placeholder="
            !kind
              ? 'Pilih jenis retur dahulu'
              : loadingSources
                ? 'Memuat dokumen…'
                : 'Pilih dokumen posted'
          "
          required
        />
        <BaseInput v-model="form.date" label="Tanggal" type="date" required />
      </section>
      <section
        class="overflow-x-auto rounded-4xl border border-line/70 bg-surface p-6 shadow-card"
      >
        <h3 class="mb-4 font-semibold">Item Retur</h3>
        <p
          v-if="!kind || !sourceId"
          class="py-8 text-center text-sm text-muted"
        >
          Pilih jenis dan dokumen sumber untuk memuat item.
        </p>
        <div v-else-if="loadingLines" class="py-8 text-center text-sm text-muted">
          Memuat item sumber…
        </div>
        <p v-else-if="!lines.length" class="py-8 text-center text-sm text-muted">
          Dokumen sumber tidak memiliki item.
        </p>
        <table v-else class="w-full min-w-150 text-sm">
          <thead class="text-left text-muted">
            <tr>
              <th class="p-2">Produk</th>
              <th class="p-2">Qty sumber</th>
              <th class="p-2">Qty retur</th>
              <th v-if="isSale" class="p-2">Restock</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in lines" :key="line.sourceItemId">
              <td class="p-2">
                {{ line.name }}
                <span class="block text-xs text-muted">{{ line.sku }}</span>
              </td>
              <td class="p-2">{{ line.sourceQty }} {{ line.unitSymbol }}</td>
              <td class="p-2">
                <BaseInput
                  v-model="line.quantity"
                  class="w-28"
                  type="number"
                  :min="0"
                />
              </td>
              <td v-if="isSale" class="p-2">
                <input
                  v-model="line.restock"
                  type="checkbox"
                  class="h-4 w-4 accent-brand"
                  aria-label="Masukkan kembali ke stok jual"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </section>
      <section
        class="grid gap-4 rounded-4xl border border-line/70 bg-surface p-6 shadow-card sm:grid-cols-3"
      >
        <BaseTextarea
          v-model="form.reason"
          label="Alasan"
          :rows="2"
          :maxlength="2000"
        />
        <BaseTextarea
          v-model="form.condition"
          label="Kondisi barang"
          :rows="2"
          :maxlength="2000"
        />
        <BaseTextarea
          v-model="form.notes"
          label="Catatan"
          :rows="2"
          :maxlength="2000"
        />
      </section>
      <section
        class="flex justify-end rounded-4xl border border-line/70 bg-surface p-6 shadow-card"
      >
        <BaseButton type="submit" :disabled="saving">{{
          saving ? "Menyimpan…" : "Simpan Draft"
        }}</BaseButton>
      </section>
    </form>
  </div>
</template>
