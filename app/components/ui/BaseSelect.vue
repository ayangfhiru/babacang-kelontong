<script setup lang="ts">
import { ChevronDown } from "@lucide/vue";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

type OptionValue = string | number;

export interface SelectOption {
  value?: OptionValue;
  label?: string;
  disabled?: boolean;
  [key: string]: string | number | boolean | undefined;
}

interface Props {
  /** Field label. `title` is kept as a legacy alias. */
  label?: string;
  title?: string;
  options: SelectOption[];
  valueKey?: string;
  labelKey?: string;
  required?: boolean;
  id?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  /** Label for the empty "none" entry (optional relations such as brand). */
  emptyLabel?: string;
  error?: string;
  disabled?: boolean;
  maxVisibleOptions?: number;
}

const props = withDefaults(defineProps<Props>(), {
  label: "",
  title: "",
  valueKey: "value",
  labelKey: "label",
  required: false,
  placeholder: "Pilih pilihan",
  searchPlaceholder: "Cari pilihan...",
  emptyLabel: "",
  error: "",
  disabled: false,
  maxVisibleOptions: 5,
});

const emit = defineEmits<{
  "clear-error": [];
}>();

const model = defineModel<OptionValue>({ default: "" });

const isOpen = ref(false);
const search = ref("");

const fieldLabel = computed(() => props.label || props.title);

const inputId = computed(
  () =>
    props.id ??
    `select-${(fieldLabel.value || "option").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
);

const errorId = computed(() => `${inputId.value}-error`);

const selectedOption = computed(() =>
  props.options.find((option) => option[props.valueKey] === model.value),
);

const filteredOptions = computed(() => {
  const keyword = search.value.toLowerCase().trim();

  if (!keyword) return props.options;

  return props.options.filter((option) =>
    String(option[props.labelKey] ?? "")
      .toLowerCase()
      .includes(keyword),
  );
});

const optionHeight = 40;

const dropdownMaxHeight = computed(() => {
  return `${props.maxVisibleOptions * optionHeight}px`;
});

const selectedLabel = computed(() => {
  if (model.value === "" && props.emptyLabel) return props.emptyLabel;

  const label = selectedOption.value?.[props.labelKey];
  if (typeof label === "string" || typeof label === "number") {
    return String(label);
  }

  return props.placeholder;
});

const hasSelection = computed(
  () => model.value !== "" || Boolean(selectedOption.value),
);

const selectOption = (option: SelectOption): void => {
  if (option.disabled) return;

  const value = option[props.valueKey];
  if (typeof value !== "string" && typeof value !== "number") return;

  model.value = value;
  search.value = "";
  isOpen.value = false;

  if (props.error) {
    emit("clear-error");
  }
};

/** Clear an optional relation (renders the `emptyLabel` entry). */
const selectEmpty = (): void => {
  model.value = "";
  search.value = "";
  isOpen.value = false;

  if (props.error) {
    emit("clear-error");
  }
};

const openSelect = (): void => {
  if (props.disabled) {
    return;
  }

  isOpen.value = true;
};

const closeSelect = (): void => {
  isOpen.value = false;
  search.value = "";
};

const handleClickOutside = (event: MouseEvent): void => {
  const target = event.target as HTMLElement;

  if (!target.closest(`#${inputId.value}`)) {
    closeSelect();
  }
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
  <div :id="inputId" class="relative" @keydown.esc="closeSelect">
    <label
      :for="`${inputId}-button`"
      class="mb-1.5 block text-sm font-semibold text-ink-2"
    >
      {{ fieldLabel }}

      <span v-if="props.required" class="text-coral">*</span>
    </label>

    <!-- Trigger -->
    <button
      :id="`${inputId}-button`"
      type="button"
      role="combobox"
      :aria-expanded="isOpen"
      aria-haspopup="listbox"
      :aria-invalid="Boolean(props.error)"
      :disabled="props.disabled"
      class="flex w-full items-center justify-between rounded-2xl border bg-surface px-4 py-2.5 text-left text-sm text-ink outline-none transition-colors disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted"
      :class="
        props.error
          ? 'border-coral'
          : 'border-line hover:border-brand/40 focus:border-brand/50'
      "
      @click.stop="openSelect"
    >
      <span
        class="truncate"
        :class="hasSelection ? 'text-ink' : 'text-muted'"
      >
        {{ selectedLabel }}
      </span>

      <ChevronDown
        class="h-4 w-4 shrink-0 text-muted transition"
        :class="{ 'rotate-180': isOpen }"
        aria-hidden="true"
      />
    </button>

    <!-- Dropdown -->
    <div
      v-if="isOpen"
      role="listbox"
      class="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-pop"
    >
      <!-- Search -->
      <div class="border-b border-line/70 p-2">
        <input
          v-model="search"
          type="text"
          :placeholder="props.searchPlaceholder"
          class="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-brand/50"
          @click.stop
        />
      </div>

      <!-- Options -->
      <div
        class="overflow-y-auto p-1"
        :style="{ maxHeight: dropdownMaxHeight }"
      >
        <button
          v-if="props.emptyLabel && !search"
          type="button"
          class="w-full rounded-xl px-3 py-2 text-left text-sm transition"
          :class="
            model === ''
              ? 'bg-brand-soft font-medium text-brand'
              : 'text-ink-2 hover:bg-surface-2'
          "
          @click="selectEmpty"
        >
          {{ props.emptyLabel }}
        </button>

        <button
          v-for="option in filteredOptions"
          :key="String(option[props.valueKey])"
          type="button"
          role="option"
          :aria-selected="model === option[props.valueKey]"
          :disabled="option.disabled"
          class="w-full rounded-xl px-3 py-2 text-left text-sm transition"
          :class="
            option.disabled
              ? 'cursor-not-allowed text-muted'
              : model === option[props.valueKey]
                ? 'bg-brand-soft font-medium text-brand'
                : 'text-ink-2 hover:bg-surface-2'
          "
          @click="selectOption(option)"
        >
          {{ option[props.labelKey] }}
        </button>

        <div
          v-if="filteredOptions.length === 0"
          class="px-3 py-4 text-center text-sm text-muted"
        >
          Data tidak ditemukan
        </div>
      </div>
    </div>

    <!-- Error -->
    <p
      v-if="props.error"
      :id="errorId"
      class="mt-1.5 text-xs font-medium text-coral"
      role="alert"
    >
      {{ props.error }}
    </p>
  </div>
</template>
