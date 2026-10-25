<script setup lang="ts">
import { ChevronLeft, ChevronRight } from "@lucide/vue";
import { computed } from "vue";

interface Props {
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  /** Unit label for the total count, e.g. `produk`. */
  totalLabel?: string;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  totalLabel: "data",
  loading: false,
});

const emit = defineEmits<{ "update:page": [page: number] }>();

const rangeStart = computed(() =>
  props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1,
);
const rangeEnd = computed(() =>
  Math.min(props.page * props.pageSize, props.total),
);
const totalPagesLabel = computed(() => Math.max(props.totalPages, 1));
</script>

<template>
  <div
    class="flex flex-col items-center justify-between gap-4 border-t border-line/70 px-5 py-4 sm:flex-row sm:px-7"
  >
    <p class="text-sm text-muted">
      <span class="font-semibold text-ink-2">{{ rangeStart }}</span>
      -
      <span class="font-semibold text-ink-2">{{ rangeEnd }}</span>
      of <span class="font-semibold text-ink-2">{{ total }}</span>
      {{ totalLabel }}
    </p>

    <div class="flex items-center gap-2">
      <button
        type="button"
        :disabled="page <= 1 || loading"
        class="inline-flex h-10 items-center gap-1 rounded-2xl border border-line bg-surface px-3.5 text-sm font-semibold text-ink-2 transition-colors hover:border-brand/40 disabled:cursor-not-allowed disabled:opacity-50"
        @click="emit('update:page', page - 1)"
      >
        <ChevronLeft class="h-4 w-4" />
        Sebelumnya
      </button>

      <span
        class="px-2 font-mono text-sm font-semibold tabular-nums text-ink-2"
      >
        {{ page }} / {{ totalPagesLabel }}
      </span>

      <button
        type="button"
        :disabled="page >= totalPages || loading"
        class="inline-flex h-10 items-center gap-1 rounded-2xl border border-line bg-surface px-3.5 text-sm font-semibold text-ink-2 transition-colors hover:border-brand/40 disabled:cursor-not-allowed disabled:opacity-50"
        @click="emit('update:page', page + 1)"
      >
        Berikutnya
        <ChevronRight class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>
