<script setup lang="ts">
import { ClipboardCheck, Plus, RefreshCw } from "@lucide/vue";
import type { BadgeTone } from "~/components/ui/BaseBadge.vue";
import type {
  PaginatedResponse,
  StockAdjustmentSummary,
  TransactionStatus,
} from "~~/types";

usePageTitle("Penyesuaian Stok");

const LIST_ROUTE = "/admin/inventory/adjustments";
const CREATE_ROUTE = "/admin/inventory/adjustments/create";

const page = ref(1);

const { data, status, refresh } = await useAsyncData(
  "stock-adjustments",
  () =>
    $fetch<PaginatedResponse<StockAdjustmentSummary>>(
      "/api/stock-adjustments",
      {
        query: { page: page.value, pageSize: 10 },
      },
    ),
  { watch: [page] },
);

const adjustments = computed(() => data.value?.data ?? []);

const STATUS_TONE: Record<TransactionStatus, BadgeTone> = {
  DRAFT: "amber",
  POSTED: "brand",
  CANCELLED: "coral",
};

const formatDate = (value: string): string =>
  new Date(value).toLocaleDateString("id-ID");
</script>

<template>
  <div>
    <section class="flex items-end justify-between gap-4 pt-8 pb-7">
      <div>
        <p
          class="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand"
        >
          Inventori
        </p>
        <h2 class="mt-2 font-display text-3xl font-bold">Penyesuaian Stok</h2>
        <p class="mt-2 text-sm text-muted">
          Catat selisih stok fisik terhadap stok sistem beserta alasannya.
        </p>
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <BaseButton
          variant="secondary"
          :disabled="status === 'pending'"
          @click="refresh"
        >
          <RefreshCw class="h-4 w-4" />
          Muat ulang
        </BaseButton>

        <NuxtLink :to="CREATE_ROUTE">
          <BaseButton>
            <Plus class="h-4 w-4" />
            Penyesuaian Baru
          </BaseButton>
        </NuxtLink>
      </div>
    </section>

    <section
      class="overflow-hidden rounded-4xl border border-line/70 bg-surface shadow-card"
    >
      <div v-if="status === 'pending'" class="p-12 text-center text-muted">
        Memuat data…
      </div>

      <div
        v-else-if="!adjustments.length"
        class="flex flex-col items-center gap-3 p-16 text-muted"
      >
        <ClipboardCheck class="h-10 w-10" />
        <p>Belum ada penyesuaian stok.</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[760px] text-left text-sm">
          <thead class="bg-night/5 text-xs uppercase text-muted">
            <tr>
              <th class="px-5 py-4">Nomor</th>
              <th class="px-5 py-4">Tanggal</th>
              <th class="px-5 py-4">Petugas</th>
              <th class="px-5 py-4">Item</th>
              <th class="px-5 py-4">Alasan</th>
              <th class="px-5 py-4">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in adjustments"
              :key="item.id"
              class="border-t border-line/60"
            >
              <td class="px-5 py-4 font-semibold">
                <NuxtLink
                  class="text-brand hover:underline"
                  :to="`${LIST_ROUTE}/${item.id}`"
                >
                  {{ item.number }}
                </NuxtLink>
              </td>
              <td class="px-5 py-4">{{ formatDate(item.date) }}</td>
              <td class="px-5 py-4">{{ item.user.name }}</td>
              <td class="px-5 py-4">{{ item.itemCount }}</td>
              <td class="max-w-[240px] truncate px-5 py-4 text-muted">
                {{ item.reason || "—" }}
              </td>
              <td class="px-5 py-4">
                <BaseBadge :tone="STATUS_TONE[item.status]">
                  {{ item.status }}
                </BaseBadge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
