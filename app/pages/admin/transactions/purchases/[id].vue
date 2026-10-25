<script setup lang="ts">
import { ArrowLeft, Ban, Check } from "@lucide/vue";
import type { Purchase } from "~~/types";
usePageTitle("Detail Pembelian");
const route = useRoute();
const notify = useNotify();
const { data, refresh } = await useAsyncData(
  `purchase-${route.params.id}`,
  () => $fetch<Purchase>(`/api/purchases/${route.params.id}`),
);
const purchase = computed(() => data.value);
const busy = ref(false);
const action = async (type: "post" | "cancel") => {
  busy.value = true;
  try {
    await $fetch(`/api/purchases/${route.params.id}/${type}`, {
      method: "POST",
    });
    notify.success(
      type === "post"
        ? "Pembelian berhasil diposting."
        : "Pembelian berhasil dibatalkan.",
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
  <div v-if="purchase">
    <section class="flex items-center justify-between pt-8 pb-7">
      <div class="flex items-center gap-4">
        <NuxtLink to="/admin/transactions/purchases"
          ><ArrowLeft class="h-5 w-5"
        /></NuxtLink>
        <div>
          <p
            class="text-[11px] font-semibold uppercase tracking-[.14em] text-brand"
          >
            Pembelian
          </p>
          <h2 class="mt-2 font-display text-3xl font-bold">
            {{ purchase.number }}
          </h2>
        </div>
      </div>
      <div class="flex gap-2">
        <BaseButton
          v-if="purchase.status === 'DRAFT'"
          :disabled="busy"
          @click="action('post')"
          ><Check class="h-4 w-4" /> Posting</BaseButton
        ><BaseButton
          v-if="purchase.status === 'DRAFT'"
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
        <p class="text-xs text-muted">Supplier</p>
        <p class="mt-1 font-semibold">{{ purchase.supplier.name }}</p>
      </div>
      <div>
        <p class="text-xs text-muted">Tanggal</p>
        <p class="mt-1 font-semibold">
          {{ new Date(purchase.date).toLocaleDateString("id-ID") }}
        </p>
      </div>
      <div>
        <p class="text-xs text-muted">Status</p>
        <BaseBadge>{{ purchase.status }}</BaseBadge>
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
            v-for="item in purchase.items"
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
            <td class="p-3">Rp {{ item.unitCost.toLocaleString("id-ID") }}</td>
            <td class="p-3 text-right">
              Rp {{ item.subtotal.toLocaleString("id-ID") }}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" class="p-3 text-right font-bold">Total</td>
            <td class="p-3 text-right text-lg font-bold">
              Rp {{ purchase.total.toLocaleString("id-ID") }}
            </td>
          </tr>
        </tfoot>
      </table>
    </section>
  </div>
  <div v-else class="p-12 text-center text-muted">Memuat detail…</div>
</template>
