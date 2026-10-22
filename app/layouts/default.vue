<script setup lang="ts">
const NAV_COLLAPSED_STORAGE_KEY = "babacang-nav-collapsed";

const isNavOpen = ref(false);
const isCollapsed = ref(false);

onMounted(() => {
  isCollapsed.value =
    localStorage.getItem(NAV_COLLAPSED_STORAGE_KEY) === "true";
});

const toggleCollapse = (): void => {
  isCollapsed.value = !isCollapsed.value;
  localStorage.setItem(NAV_COLLAPSED_STORAGE_KEY, String(isCollapsed.value));
};

const closeNav = (): void => {
  isNavOpen.value = false;
};

const shellClasses = computed(() => ({
  "is-nav-open": isNavOpen.value,
  "is-nav-collapsed": isCollapsed.value,
}));

const { title } = usePageTitle();
</script>

<template>
  <div
    class="admin-shell min-h-screen bg-paper text-ink antialiased"
    :class="shellClasses"
  >
    <AppSidebar
      :collapsed="isCollapsed"
      @toggle-collapse="toggleCollapse"
      @navigate="closeNav"
    />

    <div class="admin-overlay" aria-hidden="true" @click="closeNav" />

    <div class="admin-main">
      <AppHeader :title="title" @toggle-menu="isNavOpen = true" />

      <main class="px-4 pb-16 sm:px-6 lg:px-8">
        <slot />
      </main>
    </div>

    <AppToastList />
  </div>
</template>
