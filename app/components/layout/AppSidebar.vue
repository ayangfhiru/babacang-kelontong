<script setup lang="ts">
import {
  Package,
  ShoppingCart,
  ShoppingBag,
  RotateCcw,
  ClipboardCheck,
  Warehouse,
  PanelLeftClose,
  PanelLeftOpen,
  Ruler,
  Tag,
  Tags,
  Truck,
} from "@lucide/vue";
import type { Component } from "vue";

interface NavItem {
  label: string;
  to: string;
  icon: Component;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface Props {
  collapsed: boolean;
}

defineProps<Props>();

defineEmits<{
  "toggle-collapse": [];
  navigate: [];
}>();

const sections: NavSection[] = [
  {
    title: "Master Data",
    items: [
      { label: "Produk", to: "/admin/master-data/products", icon: Package },
      { label: "Kategori", to: "/admin/master-data/categories", icon: Tags },
      { label: "Merek", to: "/admin/master-data/brands", icon: Tag },
      { label: "Unit", to: "/admin/master-data/units", icon: Ruler },
      { label: "Supplier", to: "/admin/master-data/suppliers", icon: Truck },
    ],
  },
  {
    title: "Transaksi",
    items: [
      { label: "Pembelian", to: "/admin/transactions/purchases", icon: ShoppingBag },
      { label: "Penjualan", to: "/admin/transactions/sales", icon: ShoppingCart },
      { label: "Retur", to: "/admin/transactions/returns", icon: RotateCcw },
    ],
  },
  {
    title: "Inventori",
    items: [
      { label: "Stok", to: "/admin/inventory", icon: Warehouse },
      { label: "Penyesuaian Stok", to: "/admin/inventory/adjustments", icon: ClipboardCheck },
    ],
  },
];
</script>

<template>
  <aside
    class="admin-sidebar flex flex-col border-r border-white/10 bg-night text-white dark:border-line"
  >
    <!-- Brand -->
    <div
      class="sidebar-brand flex h-[76px] shrink-0 items-center gap-3 border-b border-white/10 px-5"
    >
      <div
        class="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-mint font-display text-xl font-bold text-night"
      >
        B
      </div>
      <div class="collapse-hide min-w-0">
        <p class="font-display text-lg font-bold leading-none tracking-tight">
          Babacang
        </p>
        <p
          class="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-mint/80"
        >
          Kelontong
        </p>
      </div>
    </div>

    <!-- Nav -->
    <nav class="flex-1 space-y-1 overflow-y-auto px-3.5 py-5">
      <template v-for="section in sections" :key="section.title">
        <p
          class="nav-section px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35"
        >
          {{ section.title }}
        </p>

        <NuxtLink
          v-for="item in section.items"
          :key="item.to"
          :to="item.to"
          class="nav-item relative flex items-center gap-3 rounded-2xl px-3.5 py-3 text-[15px] font-medium transition-colors"
          :class="
            $route.path === item.to
              ? 'bg-white/10 text-white'
              : 'text-white/65 hover:bg-white/10 hover:text-white'
          "
          :title="collapsed ? item.label : null"
          @click="$emit('navigate')"
        >
          <span
            v-if="$route.path === item.to"
            class="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-mint"
          />
          <component
            :is="item.icon"
            class="h-5 w-5 shrink-0"
            :class="$route.path === item.to ? 'text-mint' : ''"
          />
          <!-- `.nav-label` is display:none via CSS only in collapsed desktop
               mode, so icons stay visible and mobile drawer keeps labels -->
          <span class="nav-label">{{ item.label }}</span>
        </NuxtLink>
      </template>
    </nav>

    <!-- Sidebar footer -->
    <div class="shrink-0 space-y-2 border-t border-white/10 p-3.5">
      <div
        class="sidebar-user flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-2.5"
      >
        <div
          class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mint font-semibold text-night"
        >
          AD
        </div>
        <div class="collapse-hide min-w-0">
          <p class="truncate text-sm font-semibold">Admin</p>
          <p class="truncate text-xs text-white/50">Pemilik Toko</p>
        </div>
      </div>

      <!-- Toggle stays visible in both modes: close icon when expanded, open icon when collapsed -->
      <button
        type="button"
        class="hidden w-full items-center justify-center gap-2 rounded-2xl border border-white/10 py-2.5 text-xs font-semibold text-white/60 transition-colors hover:bg-white/10 hover:text-white md:flex"
        :aria-label="collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'"
        :aria-expanded="collapsed ? 'false' : 'true'"
        @click="$emit('toggle-collapse')"
      >
        <template v-if="collapsed">
          <PanelLeftOpen class="h-4 w-4 shrink-0" />
        </template>
        <template v-else>
          <PanelLeftClose class="h-4 w-4 shrink-0" />
          <span>Ciutkan menu</span>
        </template>
      </button>
    </div>
  </aside>
</template>
