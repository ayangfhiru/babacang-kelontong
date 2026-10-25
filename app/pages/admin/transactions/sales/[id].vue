<script setup lang="ts">
import { ArrowLeft, Ban, Check } from "@lucide/vue";
import type { Sales } from "~~/types";
usePageTitle("Detail Penjualan");
const route = useRoute();
const notify = useNotify();
const { data, refresh } = await useAsyncData(`sales-${route.params.id}`, () =>
  $fetch<Sales>(`/api/sales/${route.params.id}`),
);
const sales = computed(() => data.value);
const busy = ref(false);
const action = async (type: "post" | "cancel") => {
  busy.value = true;
  try {
    await $fetch(`/api/sales/${route.params.id}/${type}`, { method: "POST" });
    notify.success(
      type === "post"
        ? "Penjualan berhasil diposting."
        : "Penjualan berhasil dibatalkan.",
    );
    await refresh();
  } catch (error) {
    notify.error(getApiErrorPayload(error).message);
  } finally {
    busy.value = false;
  }
};
</script>
<template>
  <div v-if="sales">
    <section class="flex items-center justify-between pt-8 pb-7">
      <div class="flex items-center gap-4">
        <NuxtLink to="/admin/transactions/sales"
          ><ArrowLeft class="h-5 w-5"
        /></NuxtLink>
        <div>
          <p
            class="text-[11px] font-semibold uppercase tracking-[.14em] text-brand"
          >
            Penjualan
          </p>
          <h2 class="mt-2 font-display text-3xl font-bold">
            {{ sales.number }}
          </h2>
        </div>
      </div>
      <div class="flex gap-2">
        <BaseButton
          v-if="sales.status === 'DRAFT'"
          :disabled="busy"
          @click="action('post')"
          ><Check class="h-4 w-4" /> Posting</BaseButton
        ><BaseButton
          v-if="sales.status === 'DRAFT'"
          variant="danger"
          :disabled="busy"
          @click="action('cancel')"
          ><Ban class="h-4 w-4" /> Batalkan</BaseButton
        >
      </div>
    </section>
    <section
      class="mb-6 grid gap-4 rounded-4xl border border-line/70 bg-surface p-6 shadow-card sm:grid-cols-3"
    >
      <div>
        <p class="text-xs text-muted">Petugas</p>
        <p class="mt-1 font-semibold">{{ sales.user.name }}</p>
      </div>
      <div>
        <p class="text-xs text-muted">Tanggal</p>
        <p class="mt-1 font-semibold">
          {{ new Date(sales.date).toLocaleDateString("id-ID") }}
        </p>
      </div>
      <div>
        <p class="text-xs text-muted">Status</p>
        <BaseBadge>{{ sales.status }}</BaseBadge>
      </div>
    </section>
    <section
      class="overflow-x-auto rounded-4xl border border-line/70 bg-surface p-6 shadow-card"
    >
      <table class="w-full text-left text-sm">
        <thead class="text-xs uppercase text-muted">
          <tr>
            <th class="p-3">Produk</th>
            <th class="p-3">Qty</th>
            <th class="p-3">Harga</th>
            <th class="p-3 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in sales.items"
            :key="item.id"
            class="border-t border-line/60"
          >
            <td class="p-3">
              {{ item.product.name
              }}<span class="block text-xs text-muted">{{
                item.product.sku
              }}</span>
            </td>
            <td class="p-3">
              {{ item.quantity }} {{ item.product.unitSymbol }}
            </td>
            <td class="p-3">Rp {{ item.unitPrice.toLocaleString("id-ID") }}</td>
            <td class="p-3 text-right">
              Rp {{ item.subtotal.toLocaleString("id-ID") }}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" class="p-3 text-right font-bold">Total</td>
            <td class="p-3 text-right text-lg font-bold">
              Rp {{ sales.total.toLocaleString("id-ID") }}
            </td>
          </tr>
        </tfoot>
      </table>
    </section>
  </div>
  <div v-else class="p-12 text-center text-muted">Memuat detail…</div>
</template>
