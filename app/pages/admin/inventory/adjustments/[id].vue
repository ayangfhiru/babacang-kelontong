<script setup lang="ts">
import { ArrowLeft, Ban, Check, Trash2, TriangleAlert } from "@lucide/vue";
import type { BadgeTone } from "~/components/ui/BaseBadge.vue";
import { getApiErrorPayload } from "~/utils/api/error";
import type {
  ApiErrorPayload,
  StockAdjustment,
  TransactionStatus,
} from "~~/types";

usePageTitle("Detail Penyesuaian Stok");

const LIST_ROUTE = "/admin/inventory/adjustments";

const route = useRoute();
const notify = useNotify();

const adjustmentId = computed(() => String(route.params.id));

const {
  data: adjustment,
  error,
  refresh,
} = await useAsyncData(
  () => `stock-adjustment-${adjustmentId.value}`,
  () =>
    $fetch<StockAdjustment>(
      `/api/stock-adjustments/${encodeURIComponent(adjustmentId.value)}`,
    ),
  { watch: [adjustmentId] },
);

const busy = ref(false);
const isDeleteOpen = ref(false);

const STATUS_TONE: Record<TransactionStatus, BadgeTone> = {
  DRAFT: "amber",
  POSTED: "brand",
  CANCELLED: "coral",
};

const errorMessage = computed<ApiErrorPayload | null>(() =>
  error.value ? getApiErrorPayload(error.value) : null,
);

const formatMoney = (value: number): string =>
  `Rp ${value.toLocaleString("id-ID")}`;

const formatDate = (value: string): string =>
  new Date(value).toLocaleDateString("id-ID");

const deleteMessage = computed(
  () =>
    `Hapus draft ${adjustment.value?.number ?? ""}? Tindakan ini tidak memengaruhi stok karena draft belum diposting.`,
);

const runAction = async (
  action: "post" | "cancel" | "delete",
): Promise<void> => {
  if (busy.value) return;
  busy.value = true;

  try {
    if (action === "delete") {
      await $fetch(`/api/stock-adjustments/${adjustmentId.value}`, {
        method: "DELETE",
      });
      notify.success("Draft penyesuaian stok dihapus.");
      await navigateTo(LIST_ROUTE);
      return;
    }

    await $fetch(`/api/stock-adjustments/${adjustmentId.value}/${action}`, {
      method: "POST",
    });
    notify.success(
      action === "post"
        ? "Penyesuaian stok berhasil diposting. Stok FIFO telah diperbarui."
        : "Penyesuaian stok dibatalkan. Pergerakan kompensasi telah dicatat.",
    );
    await refresh();
  } catch (actionError) {
    notify.error(getApiErrorPayload(actionError).message);
  } finally {
    busy.value = false;
  }
};

const handleDelete = async (): Promise<void> => {
  isDeleteOpen.value = false;
  await runAction("delete");
};
</script>

<template>
  <div v-if="adjustment">
    <section class="flex items-center justify-between gap-4 pt-8 pb-7">
      <div class="flex items-center gap-4">
        <NuxtLink :to="LIST_ROUTE" aria-label="Kembali ke daftar penyesuaian">
          <ArrowLeft class="h-5 w-5" />
        </NuxtLink>
        <div>
          <p
            class="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand"
          >
            Penyesuaian Stok
          </p>
          <h2 class="mt-2 font-display text-3xl font-bold">
            {{ adjustment.number }}
          </h2>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <BaseButton
          v-if="adjustment.status === 'DRAFT'"
          :disabled="busy"
          @click="runAction('post')"
        >
          <Check class="h-4 w-4" />
          Posting
        </BaseButton>
        <BaseButton
          v-if="adjustment.status === 'POSTED'"
          variant="danger"
          :disabled="busy"
          @click="runAction('cancel')"
        >
          <Ban class="h-4 w-4" />
          Batalkan
        </BaseButton>
        <BaseButton
          v-if="adjustment.status === 'DRAFT'"
          variant="danger"
          :disabled="busy"
          @click="isDeleteOpen = true"
        >
          <Trash2 class="h-4 w-4" />
          Hapus
        </BaseButton>
      </div>
    </section>

    <p
      v-if="adjustment.status === 'DRAFT'"
      class="mb-6 flex items-start gap-2 rounded-3xl border border-amber/40 bg-amber-soft p-4 text-sm text-ink-2"
    >
      <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0 text-amber" />
      Draft ini belum memengaruhi stok. Tekan Posting setelah data diperiksa —
      stok berkurang akan dialokasikan ke batch FIFO dari yang paling lama.
    </p>

    <!-- Document info -->
    <section
      class="mb-6 grid gap-4 rounded-4xl border border-line/70 bg-surface p-6 shadow-card sm:grid-cols-3"
    >
      <div>
        <p class="text-xs text-muted">Tanggal</p>
        <p class="mt-1 font-semibold">{{ formatDate(adjustment.date) }}</p>
      </div>
      <div>
        <p class="text-xs text-muted">Petugas</p>
        <p class="mt-1 font-semibold">{{ adjustment.user.name }}</p>
      </div>
      <div>
        <p class="text-xs text-muted">Status</p>
        <p class="mt-1">
          <BaseBadge :tone="STATUS_TONE[adjustment.status]">
            {{ adjustment.status }}
          </BaseBadge>
        </p>
      </div>
      <div class="sm:col-span-3">
        <p class="text-xs text-muted">Alasan</p>
        <p class="mt-1 text-sm">{{ adjustment.reason || "—" }}</p>
      </div>
      <div class="sm:col-span-3">
        <p class="text-xs text-muted">Catatan</p>
        <p class="mt-1 text-sm">{{ adjustment.notes || "—" }}</p>
      </div>
    </section>

    <!-- Items -->
    <section
      class="overflow-x-auto rounded-4xl border border-line/70 bg-surface p-6 shadow-card"
    >
      <h3 class="mb-4 font-semibold">Item Penyesuaian</h3>

      <table class="w-full min-w-[860px] text-left text-sm">
        <thead class="text-xs uppercase text-muted">
          <tr>
            <th class="p-3">Produk</th>
            <th class="p-3">Stok Sistem</th>
            <th class="p-3">Stok Fisik</th>
            <th class="p-3">Selisih</th>
            <th class="p-3">Biaya Satuan</th>
            <th class="p-3">Batch</th>
            <th class="p-3">Alasan</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in adjustment.items"
            :key="item.id"
            class="border-t border-line/60"
          >
            <td class="p-3 font-semibold">
              {{ item.product.name }}
              <span class="block text-xs font-normal text-muted">
                {{ item.product.sku }} · {{ item.product.unitSymbol }}
              </span>
            </td>
            <td class="p-3">{{ item.systemQty }}</td>
            <td class="p-3">{{ item.physicalQty }}</td>
            <td
              class="p-3 font-semibold"
              :class="{
                'text-brand': item.difference > 0,
                'text-coral': item.difference < 0,
                'text-muted': item.difference === 0,
              }"
            >
              {{ item.difference > 0 ? "+" : "" }}{{ item.difference }}
            </td>
            <td class="p-3">
              {{ item.difference > 0 ? formatMoney(item.unitCost) : "—" }}
            </td>
            <td class="p-3 font-mono text-xs">
              {{ item.batchNumber || "—" }}
            </td>
            <td class="p-3 text-muted">{{ item.reason || "—" }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Delete confirmation -->
    <BaseConfirmDialog
      v-model="isDeleteOpen"
      title="Hapus Penyesuaian Stok"
      :message="deleteMessage"
      confirm-label="Hapus Draft"
      :loading="busy"
      @confirm="handleDelete"
    />
  </div>

  <!-- Fetch failed (401/404/network) or still loading -->
  <div v-else class="pt-8">
    <NuxtLink
      :to="LIST_ROUTE"
      class="inline-flex items-center gap-2 text-sm text-brand hover:underline"
    >
      <ArrowLeft class="h-4 w-4" />
      Kembali ke daftar penyesuaian
    </NuxtLink>

    <div
      class="mt-8 flex flex-col items-center gap-3 rounded-4xl border border-line/70 bg-surface p-16 text-center shadow-card"
    >
      <template v-if="errorMessage">
        <TriangleAlert class="h-10 w-10 text-coral" />
        <p class="font-semibold">{{ errorMessage.message }}</p>
      </template>
      <template v-else>
        <p class="text-muted">Memuat detail penyesuaian…</p>
      </template>
    </div>
  </div>
</template>
