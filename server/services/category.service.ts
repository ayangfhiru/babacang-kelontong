import { z } from "zod";
import type {
  Category,
  CategoryListQuery,
  CategoryOption,
  CreateCategoryInput,
  PaginatedResponse,
  UpdateCategoryInput,
} from "~~/types";
import type { Prisma } from "../../prisma/generated/client";
import { conflictError, inUseError, notFoundError, toHttpError } from "../utils/api";
import { prisma } from "../utils/db";
import { paginationQuerySchema, statusFilterSchema } from "../utils/validation";

// ---------------------------------------------------------------------------
// Validation schemas (shared with API route handlers)
// ---------------------------------------------------------------------------

export const categoryListQuerySchema = paginationQuerySchema.extend({
  isActive: statusFilterSchema,
});

const createCategoryFields = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama kategori wajib diisi.")
    .max(120, "Nama kategori terlalu panjang."),
  description: z.string().trim().max(1000, "Deskripsi terlalu panjang.").nullish(),
  isActive: z.boolean().optional(),
});

export const createCategorySchema = createCategoryFields;

export const updateCategorySchema = createCategoryFields
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Minimal satu field harus diperbarui.",
  });

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

type CategoryRecord = NonNullable<Awaited<ReturnType<typeof prisma.category.findFirst>>>;

const mapCategory = (record: CategoryRecord): Category => ({
  id: record.id,
  name: record.name,
  description: record.description,
  isActive: record.isActive,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const buildWhere = (query: CategoryListQuery): Prisma.CategoryWhereInput => ({
  // Category names are compared case-insensitively (normalization policy:
  // names are stored trimmed as entered, uniqueness enforced ignoring case).
  ...(query.search
    ? { name: { contains: query.search, mode: "insensitive" as const } }
    : {}),
  ...(typeof query.isActive === "boolean" ? { isActive: query.isActive } : {}),
});

// ---------------------------------------------------------------------------
// Uniqueness guards
// ---------------------------------------------------------------------------

const assertNameAvailable = async (name: string, excludeId?: string): Promise<void> => {
  const existing = await prisma.category.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });

  if (existing) throw conflictError("name", "Nama kategori sudah digunakan.");
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const listCategories = async (
  query: CategoryListQuery,
): Promise<PaginatedResponse<Category>> => {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  const where = buildWhere(query);

  const [total, records] = await prisma.$transaction([
    prisma.category.count({ where }),
    prisma.category.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    data: records.map(mapCategory),
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

export const getCategory = async (id: string): Promise<Category> => {
  const record = await prisma.category.findUnique({ where: { id } });
  if (!record) throw notFoundError("Kategori");
  return mapCategory(record);
};

/** Lightweight options for select inputs — includes inactive records. */
export const listCategoryOptions = async (): Promise<CategoryOption[]> =>
  prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, isActive: true },
  });

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const createCategory = async (input: CreateCategoryInput): Promise<Category> => {
  const name = input.name.trim();
  await assertNameAvailable(name);

  try {
    const record = await prisma.category.create({
      data: {
        name,
        description: input.description?.trim() || null,
        isActive: input.isActive ?? true,
      },
    });
    return mapCategory(record);
  } catch (error) {
    throw toHttpError(error, "Kategori gagal disimpan karena data duplikat.");
  }
};

export const updateCategory = async (
  id: string,
  input: UpdateCategoryInput,
): Promise<Category> => {
  const existing = await prisma.category.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) throw notFoundError("Kategori");

  if (input.name !== undefined) await assertNameAvailable(input.name.trim(), id);

  try {
    const record = await prisma.category.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.description !== undefined && {
          description: input.description?.trim() || null,
        }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });
    return mapCategory(record);
  } catch (error) {
    throw toHttpError(error, "Kategori gagal diperbarui karena data duplikat.");
  }
};

export const deleteCategory = async (id: string): Promise<void> => {
  const existing = await prisma.category.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) throw notFoundError("Kategori");

  const productCount = await prisma.product.count({ where: { categoryId: id } });
  if (productCount > 0) throw inUseError("Kategori", productCount);

  try {
    await prisma.category.delete({ where: { id } });
  } catch (error) {
    throw toHttpError(error, "Kategori gagal dihapus.");
  }
};
