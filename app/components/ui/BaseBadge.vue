<script setup lang="ts">
import { computed } from "vue";

export type BadgeTone = "brand" | "amber" | "coral" | "neutral";

interface Props {
  tone?: BadgeTone;
}

const props = withDefaults(defineProps<Props>(), { tone: "neutral" });

const TONE_CLASSES: Record<BadgeTone, string> = {
  brand: "bg-mint-soft text-brand",
  amber: "bg-amber-soft text-amber",
  coral: "bg-coral-soft text-coral",
  neutral: "border border-line bg-surface-2 text-ink-2",
};

const classes = computed(() => TONE_CLASSES[props.tone]);
</script>

<template>
  <span
    :class="classes"
    class="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold"
  >
    <slot />
  </span>
</template>
