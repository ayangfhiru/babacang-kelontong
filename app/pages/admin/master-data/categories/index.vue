<script setup lang="ts">
import { LoaderCircle, Pencil, Plus, Search, Tags, Trash2, TriangleAlert } from "@lucide/vue";
import type {
  Category,
  CreateCategoryInput,
  PaginatedResponse,
} from "~~/types";

usePageTitle("Kategori");

const notify = useNotify();
const PAGE_SIZE = 10;

const DEFAULT_META = { page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 0 };

// ---------------------------------------------------------------------------
// List state (search + status filter)
// ---------------------------------------------------------------------------

const searchInput = ref("");
const search = useDebouncedRef(searchInput);

const filters = reactive({
  page: 1,
  isActive: "",
});

watch(search, () => {
  filters.page = 1;
});

watch(
  () => filters.isActive,
  () => {
    filters.page = 1;
  },
);

const listQuery = computed(() => ({
  page: filters.page,
  pageSize: PAGE_SIZE,
  search: search.value || undefined,
  isActive: filters.isActive || undefined,
}));

const { data, status, error, refresh } = await useAsyncData<PaginatedResponse<Category>>(
  "admin-categories-list",
  () => $fetch<PaginatedResponse<Category>>("/api/categories", { query: listQuery.value }),
  {
    watch: [listQuery],
    default: () => ({ data: [], meta: DEFAULT_META }),
  },
);

const isLoading = computed(() => status.value === "pending");
const categories = computed(() => data.value?.data ?? []);
const meta = computed(() => data.value?.meta ?? DEFAULT_META);
const isRefreshing = computed(() => status.value === "pending" && categories.value.length > 0);
const loadFailed = computed(() => Boolean(error.value));

const statusOptions = [
  { value: "", label: "Semua status" },
  { value: "true", label: "Aktif" },
  { value: "false", label: "Nonaktif" },
];

// ---------------------------------------------------------------------------
// Create / edit
// ---------------------------------------------------------------------------

const isFormOpen = ref(false);
const isSubmitting = ref(false);
const formErrors = ref<Record<string, string[]>>({});
const editing = ref<Category | null>(null);

const openCreate = (): void => {
  editing.value = null;
  formErrors.value = {};
  isFormOpen.value = true;
};

const openEdit = (category: Category): void => {
  editing.value = category;
  formErrors.value = {};
  isFormOpen.value = true;
};

const handleFormSubmit = async (values: CreateCategoryInput): Promise<void> => {
  isSubmitting.value = true;
  formErrors.value = {};

  try {
    if (editing.value) {
      await $fetch(`/api/categories/${editing.value.id}`, { method: "PATCH", body: values });
      notify.success("Perubahan kategori berhasil disimpan.");
    } else {
      await $fetch("/api/categories", { method: "POST", body: values });
      notify.success("Kategori baru berhasil ditambahkan.");
    }

    isFormOpen.value = false;
    await refresh();
  } catch (err) {
    const payload = getApiErrorPayload(err);
    formErrors.value = payload.details ?? {};
    notify.error(payload.message);
  } finally {
    isSubmitting.value = false;
  }
};

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

const deleteTarget = ref<Category | null>(null);
const deleteMessage = computed(() =>
  deleteTarget.value
    ? `Kategori "${deleteTarget.value.name}" akan dihapus permanen. Kategori yang masih dipakai produk tidak bisa dihapus.`
    : "",
);
const isDeleting = ref(false);

const isDeleteOpen = computed({
  get: () => deleteTarget.value !== null,
  set: (open: boolean) => {
    if (!open) deleteTarget.value = null;
  },
});

const handleDelete = async (): Promise<void> => {
  if (!deleteTarget.value) return;

  isDeleting.value = true;

  try {
    await $fetch(`/api/categories/${deleteTarget.value.id}`, { method: "DELETE" });
    notify.success(`Kategori "${deleteTarget.value.name}" berhasil dihapus.`);
    deleteTarget.value = null;
    await refresh();
  } catch (err) {
    notify.error(getApiErrorPayload(err).message);
  } finally {
    isDeleting.value = false;
  }
};

const goToPage = (page: number): void => {
  filters.page = page;
};
</script>

<template>
  <div>
    <!-- Page heading -->
    <section class="flex flex-col gap-4 pt-8 pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div class="max-w-2xl">
        <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">Master Data</p>
        <h2 class="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">Kategori</h2>
        <p class="mt-2 text-sm leading-relaxed text-muted">
          Kelompokkan produk ke dalam kategori agar mudah dicari dan dilaporkan.
        </p>
      </div>

      <BaseButton @click="openCreate">
        <Plus class="h-4 w-4" />
        Tambah Kategori
      </BaseButton>
    </section>

    <!-- List -->
    <section class="overflow-hidden rounded-4xl border border-line/70 bg-surface shadow-card">
      <div class="flex flex-col gap-3 border-b border-line/70 p-5 sm:flex-row sm:items-center">
        <div class="relative flex-1">
          <Search
            class="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted"
          />
          <input
            v-model="searchInput"
            type="search"
            placeholder="Cari nama kategori…"
            class="w-full rounded-2xl border border-line bg-surface py-2.5 pl-11 pr-4 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-brand/50"
          />
        </div>

        <div class="sm:w-44">
          <BaseSelect v-model="filters.isActive" :options="statusOptions" />
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="flex items-center justify-center gap-3 py-16 text-muted">
        <LoaderCircle class="h-5 w-5 animate-spin" />
        <span class="text-sm font-medium">Memuat data kategori…</span>
      </div>

      <!-- Error -->
      <div v-else-if="loadFailed" class="flex flex-col items-center gap-4 py-16 text-center">
        <span class="grid h-12 w-12 place-items-center rounded-2xl bg-coral-soft text-coral">
          <TriangleAlert class="h-5 w-5" />
        </span>
        <p class="text-sm font-medium text-ink-2">
          Gagal memuat data kategori. Silakan coba lagi.
        </p>
        <BaseButton variant="secondary" @click="refresh()">Muat ulang</BaseButton>
      </div>

      <!-- Empty -->
      <div
        v-else-if="categories.length === 0"
        class="flex flex-col items-center gap-4 py-16 text-center"
      >
        <span class="grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand">
          <Tags class="h-5 w-5" />
        </span>
        <div>
          <p class="text-sm font-semibold text-ink">Belum ada kategori</p>
          <p class="mt-1 text-sm text-muted">
            {{
              search || filters.isActive
                ? "Tidak ada kategori yang cocok dengan pencarian atau filter."
                : "Tambahkan kategori pertama untuk mengelompokkan produk."
            }}
          </p>
        </div>
        <BaseButton v-if="!search" variant="secondary" @click="openCreate">
          <Plus class="h-4 w-4" />
          Tambah Kategori
        </BaseButton>
      </div>

      <template v-else>
        <!-- Desktop table -->
        <div class="hidden overflow-x-auto lg:block" :class="{ 'opacity-60': isRefreshing }">
          <table class="w-full text-left">
            <thead>
              <tr
                class="border-b border-line/70 bg-surface-2/70 text-[11px] uppercase tracking-[0.12em] text-muted"
              >
                <th class="px-7 py-3.5 font-semibold">Kategori</th>
                <th class="px-4 py-3.5 font-semibold">Deskripsi</th>
                <th class="px-4 py-3.5 font-semibold">Status</th>
                <th class="px-4 py-3.5 font-semibold">Dibuat</th>
                <th class="px-7 py-3.5 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line/60">
              <tr
                v-for="category in categories"
                :key="category.id"
                class="transition-colors hover:bg-surface-2/60"
              >
                <td class="px-7 py-4">
                  <p class="text-sm font-semibold">{{ category.name }}</p>
                </td>
                <td class="max-w-xs px-4 py-4 text-sm text-muted">
                  {{ category.description || "—" }}
                </td>
                <td class="px-4 py-4">
                  <BaseBadge :tone="category.isActive ? 'brand' : 'neutral'">
                    {{ category.isActive ? "Aktif" : "Nonaktif" }}
                  </BaseBadge>
                </td>
                <td class="px-4 py-4 text-sm text-muted">
                  {{ formatDate(category.createdAt) }}
                </td>
                <td class="px-7 py-4">
                  <div class="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      class="grid h-9 w-9 place-items-center rounded-xl text-muted transition-colors hover:bg-brand-soft hover:text-brand"
                      :aria-label="`Edit ${category.name}`"
                      @click="openEdit(category)"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      class="grid h-9 w-9 place-items-center rounded-xl text-muted transition-colors hover:bg-coral-soft hover:text-coral"
                      :aria-label="`Hapus ${category.name}`"
                      @click="deleteTarget = category"
                    >
                      <Trash2 class="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile & tablet cards -->
        <div class="divide-y divide-line/60 lg:hidden" :class="{ 'opacity-60': isRefreshing }">
          <div v-for="category in categories" :key="category.id" class="space-y-3 p-5">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold">{{ category.name }}</p>
                <p class="mt-0.5 text-xs text-muted">
                  {{ category.description || "Tanpa deskripsi" }}
                </p>
              </div>
              <BaseBadge :tone="category.isActive ? 'brand' : 'neutral'">
                {{ category.isActive ? "Aktif" : "Nonaktif" }}
              </BaseBadge>
            </div>

            <div class="flex items-center justify-between gap-3">
              <p class="text-xs text-muted">Dibuat {{ formatDate(category.createdAt) }}</p>

              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  class="grid h-9 w-9 place-items-center rounded-xl border border-line text-muted transition-colors hover:text-brand"
                  :aria-label="`Edit ${category.name}`"
                  @click="openEdit(category)"
                >
                  <Pencil class="h-4 w-4" />
                </button>
                <button
                  type="button"
                  class="grid h-9 w-9 place-items-center rounded-xl border border-line text-muted transition-colors hover:text-coral"
                  :aria-label="`Hapus ${category.name}`"
                  @click="deleteTarget = category"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <BasePagination
          :page="meta.page"
          :page-size="meta.pageSize"
          :total-pages="meta.totalPages"
          :total="meta.total"
          total-label="kategori"
          :loading="isRefreshing"
          @update:page="goToPage"
        />
      </template>
    </section>

    <!-- Create / edit modal -->
    <CategoryForm
      v-model="isFormOpen"
      :category="editing"
      :busy="isSubmitting"
      :errors="formErrors"
      @submit="handleFormSubmit"
    />

    <!-- Delete confirmation -->
    <BaseConfirmDialog
      v-model="isDeleteOpen"
      title="Hapus Kategori"
      :message="deleteMessage"
      confirm-label="Hapus Kategori"
      :loading="isDeleting"
      @confirm="handleDelete"
    />
  </div>
</template>
