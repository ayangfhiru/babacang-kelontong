<script setup lang="ts">
import { ChevronDown } from "@lucide/vue";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  useId,
  watch,
} from "vue";

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

/**
 * The panel is teleported to `<body>` and positioned with `fixed` viewport
 * coordinates, so ancestors with `overflow-hidden` / `overflow-x-auto` can
 * never clip it and it can stack above modals (z-[110] > BaseModal's z-[100]).
 */
const rootRef = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLButtonElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);

interface PanelStyle {
  top: string;
  left: string;
  width: string;
  maxHeight: string;
}

const panelStyle = ref<PanelStyle>({
  top: "0px",
  left: "0px",
  width: "0px",
  maxHeight: "0px",
});

const PANEL_GAP = 8;
const VIEWPORT_EDGE = 8;
const OPTION_HEIGHT = 40;
/** Search block: container padding + input height + divider. */
const SEARCH_BLOCK_HEIGHT = 54;
/** Inner padding of the option list. */
const LIST_PADDING = 10;
/** Below this many free pixels the panel flips above the trigger. */
const MIN_PANEL_HEIGHT = 140;

const uid = useId();

const fieldLabel = computed(() => props.label || props.title);

const inputId = computed(() => {
  if (props.id) return props.id;

  const slug = (fieldLabel.value || "option")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  // `uid` keeps ids unique across instances that share the same label.
  return `select-${slug || "option"}-${uid}`;
});

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

/**
 * Recompute the panel geometry from the live trigger rect.
 *
 * - Flips above the trigger when the space below is cramped.
 * - Caps the height to the free space so the last option always stays
 *   reachable and the panel never overflows the viewport.
 * - Tracks `visualViewport`, which shrinks when the mobile keyboard opens.
 */
const updatePosition = (): void => {
  const trigger = triggerRef.value;
  if (!trigger) return;

  const rect = trigger.getBoundingClientRect();
  const viewport = window.visualViewport;
  // Fixed coordinates are relative to the layout viewport, so the keyboard
  // offset must be added when `visualViewport` is smaller than the window.
  const topLimit = viewport?.offsetTop ?? 0;
  const bottomLimit = topLimit + (viewport?.height ?? window.innerHeight);
  const layoutWidth = document.documentElement.clientWidth;

  const availableSpace = Math.max(
    bottomLimit - topLimit - VIEWPORT_EDGE * 2,
    0,
  );
  const desired = Math.min(
    SEARCH_BLOCK_HEIGHT +
      Math.max(props.maxVisibleOptions, 1) * OPTION_HEIGHT +
      LIST_PADDING,
    availableSpace,
  );
  const spaceBelow = bottomLimit - rect.bottom - PANEL_GAP - VIEWPORT_EDGE;
  const spaceAbove = rect.top - PANEL_GAP - VIEWPORT_EDGE - topLimit;
  const flip = spaceBelow < MIN_PANEL_HEIGHT && spaceAbove > spaceBelow;
  const height = Math.max(
    Math.min(desired, flip ? spaceAbove : spaceBelow),
    Math.min(MIN_PANEL_HEIGHT, availableSpace),
  );

  const width = Math.min(
    Math.max(rect.width, 180),
    layoutWidth - VIEWPORT_EDGE * 2,
  );
  const left = Math.min(
    Math.max(rect.left, VIEWPORT_EDGE),
    Math.max(VIEWPORT_EDGE, layoutWidth - width - VIEWPORT_EDGE),
  );
  const top = Math.min(
    Math.max(
      flip ? rect.top - PANEL_GAP - height : rect.bottom + PANEL_GAP,
      topLimit + VIEWPORT_EDGE,
    ),
    Math.max(topLimit + VIEWPORT_EDGE, bottomLimit - height - VIEWPORT_EDGE),
  );

  panelStyle.value = {
    top: `${Math.round(top)}px`,
    left: `${Math.round(left)}px`,
    width: `${Math.round(width)}px`,
    maxHeight: `${Math.round(height)}px`,
  };
};

const closeSelect = (): void => {
  isOpen.value = false;
};

const toggleSelect = (): void => {
  if (props.disabled) return;

  isOpen.value = !isOpen.value;
};

const handleDocumentClick = (event: MouseEvent): void => {
  const target = event.target as Node | null;
  if (!target) return;

  if (rootRef.value?.contains(target) || panelRef.value?.contains(target)) {
    return;
  }

  closeSelect();
};

const handleDocumentKeydown = (event: KeyboardEvent): void => {
  if (event.key !== "Escape") return;

  closeSelect();
  // The first Escape only closes the dropdown: stop it here so it does not
  // also close an ancestor overlay (BaseModal listens on `window`).
  event.stopPropagation();
};

/** Listeners run only while the panel is open, and are always removable. */
const startTracking = (): void => {
  // Capture phase: scroll events do not bubble, but a capturing window
  // listener still observes scrolling inside any scrollable ancestor.
  window.addEventListener("scroll", updatePosition, true);
  window.addEventListener("resize", updatePosition);
  window.visualViewport?.addEventListener("resize", updatePosition);
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", handleDocumentKeydown);
};

const stopTracking = (): void => {
  window.removeEventListener("scroll", updatePosition, true);
  window.removeEventListener("resize", updatePosition);
  window.visualViewport?.removeEventListener("resize", updatePosition);
  document.removeEventListener("click", handleDocumentClick);
  document.removeEventListener("keydown", handleDocumentKeydown);
};

const selectOption = (option: SelectOption): void => {
  if (option.disabled) return;

  const value = option[props.valueKey];
  if (typeof value !== "string" && typeof value !== "number") return;

  model.value = value;
  closeSelect();

  if (props.error) {
    emit("clear-error");
  }
};

/** Clear an optional relation (renders the `emptyLabel` entry). */
const selectEmpty = (): void => {
  model.value = "";
  closeSelect();

  if (props.error) {
    emit("clear-error");
  }
};

watch(isOpen, async (open) => {
  if (!open) {
    stopTracking();
    search.value = "";
    return;
  }

  startTracking();
  await nextTick();
  updatePosition();
});

onBeforeUnmount(stopTracking);
</script>

<template>
  <div ref="rootRef" class="relative" @keydown.esc="closeSelect">
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
      ref="triggerRef"
      type="button"
      role="combobox"
      :aria-expanded="isOpen"
      aria-haspopup="listbox"
      :aria-controls="isOpen ? `${inputId}-panel` : undefined"
      :aria-invalid="Boolean(props.error)"
      :disabled="props.disabled"
      class="flex min-h-11 w-full items-center justify-between rounded-2xl border bg-surface px-4 py-2.5 text-left text-sm text-ink outline-none transition-colors disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted"
      :class="
        props.error
          ? 'border-coral'
          : 'border-line hover:border-brand/40 focus:border-brand/50'
      "
      @click.stop="toggleSelect"
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

    <!-- Dropdown (teleported to <body>) -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        :id="`${inputId}-panel`"
        ref="panelRef"
        role="listbox"
        :aria-label="fieldLabel"
        :style="panelStyle"
        class="fixed z-[110] flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-pop"
        @click.stop
        @keydown.esc="closeSelect"
      >
        <!-- Search -->
        <div class="shrink-0 border-b border-line/70 p-2">
          <input
            v-model="search"
            type="text"
            :placeholder="props.searchPlaceholder"
            class="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-brand/50"
          />
        </div>

        <!-- Options -->
        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1">
          <button
            v-if="props.emptyLabel && !search"
            type="button"
            class="w-full rounded-xl px-3 py-2.5 text-left text-sm transition"
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
            class="w-full rounded-xl px-3 py-2.5 text-left text-sm transition"
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
    </Teleport>

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
