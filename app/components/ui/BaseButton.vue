<script setup lang="ts">
import { computed } from "vue";
import { LoaderCircle } from "@lucide/vue";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface Props {
  variant?: ButtonVariant;
  type?: "button" | "submit";
  loading?: boolean;
  disabled?: boolean;
  block?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "primary",
  type: "button",
  loading: false,
  disabled: false,
  block: false,
});

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-brand text-on-brand hover:bg-brand-deep hover:text-white",
  secondary: "border border-line bg-surface text-ink-2 hover:border-brand/40",
  ghost: "text-ink-2 hover:bg-surface-2",
  danger: "bg-coral text-white hover:bg-coral/80",
};

const classes = computed(() => [
  VARIANT_CLASSES[props.variant],
  props.block ? "w-full" : "",
]);
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="classes"
    class="inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
  >
    <LoaderCircle v-if="loading" class="h-4 w-4 animate-spin" aria-hidden="true" />
    <slot />
  </button>
</template>
