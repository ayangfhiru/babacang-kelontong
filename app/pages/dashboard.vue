<script setup lang="ts">
import { Package, Receipt, ShoppingCart, Warehouse } from "@lucide/vue";
import type { Component } from "vue";

usePageTitle("Dashboard");

const auth = useAuth();
const { data: session } = await auth.useSession(useFetch);

const displayName = computed(
  () => session.value?.user?.name || session.value?.user?.email || "Pengguna",
);
const roleLabel = computed(() =>
  session.value?.user?.role === "ADMIN" ? "Admin" : "Staf",
);

interface QuickLink {
  label: string;
  description: string;
  to: string;
  icon: Component;
}

const quickLinks: QuickLink[] = [
  {
    label: "Penjualan",
    description: "Buat dan kelola transaksi penjualan.",
    to: "/admin/transactions/sales",
    icon: ShoppingCart,
  },
  {
    label: "Pembelian",
    description: "Catat pemasukan barang dari supplier.",
    to: "/admin/transactions/purchases",
    icon: Receipt,
  },
  {
    label: "Inventori",
    description: "Pantau stok dan penyesuaian barang.",
    to: "/admin/inventory",
    icon: Warehouse,
  },
  {
    label: "Master Data",
    description: "Kelola produk dan data pendukung.",
    to: "/admin/master-data/products",
    icon: Package,
  },
];
</script>

<template>
  <div class="space-y-6">
    <section class="rounded-3xl border border-line/70 bg-surface p-6 mt-6">
      <p
        class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
      >
        Beranda
      </p>
      <h2 class="mt-2 font-display text-2xl font-bold">
        Selamat datang kembali, {{ displayName }}!
      </h2>
      <p class="mt-2 text-sm text-muted">
        Anda masuk sebagai {{ roleLabel }}. Pilih menu cepat di bawah untuk
        mulai bekerja.
      </p>
    </section>

    <section class="grid gap-4 sm:grid-cols-2">
      <NuxtLink
        v-for="link in quickLinks"
        :key="link.to"
        :to="link.to"
        class="group rounded-3xl border border-line/70 bg-surface p-5 transition-colors hover:border-brand/40"
      >
        <span
          class="grid h-11 w-11 place-items-center rounded-2xl bg-brand-soft text-brand transition-colors group-hover:bg-brand group-hover:text-white"
        >
          <component :is="link.icon" class="h-5 w-5" />
        </span>
        <h3 class="mt-4 font-display text-lg font-bold">{{ link.label }}</h3>
        <p class="mt-1 text-sm text-muted">{{ link.description }}</p>
      </NuxtLink>
    </section>
  </div>
</template>
