<script setup lang="ts">
/**
 * Minimal layout for the standalone auth pages (`/login`, `/register`):
 * no sidebar, no dashboard header — just a centered card. The toast list is
 * rendered here too so notifications fired before a redirect (e.g. the
 * registration success message) stay visible after the layout switch.
 */
</script>

<template>
  <div class="min-h-screen bg-paper text-ink antialiased">
    <div class="flex min-h-screen items-center justify-center px-4 py-10">
      <slot />
    </div>

    <AppToastList />
  </div>
</template>
