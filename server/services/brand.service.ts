import { z } from "zod";
import type {
  Brand,
  BrandListQuery,
  BrandOption,
  CreateBrandInput,
  PaginatedResponse,
  UpdateBrandInput,
} from "~~/types";
import type { Prisma } from "../../prisma/generated/client";
import { conflictError, inUseError, notFoundError, toHttpError } from "../utils/api";
import { prisma } from "../utils/db";
import { paginationQuerySchema, statusFilterSchema } from "../utils/validation";

// ---------------------------------------------------------------------------
// Validation schemas (shared with API route handlers)
// ---------------------------------------------------------------------------

export const brandListQuerySchema = paginationQuerySchema.extend({
  isActive: statusFilterSchema,
});

const createBrandFields = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama merek wajib diisi.")
    .max(120, "Nama merek terlalu panjang."),
  description: z.string().trim().max(1000, "Deskripsi terlalu panjang.").nullish(),
  isActive: z.boolean().optional(),
});

export const createBrandSchema = createBrandFields;

export const updateBrandSchema = createBrandFields
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Minimal satu field harus diperbarui.",
  });

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

type BrandRecord = NonNullable<Awaited<ReturnType<typeof prisma.brand.findFirst>>>;

const mapBrand = (record: BrandRecord): Brand => ({
  id: record.id,
  name: record.name,
  description: record.description,
  logo: record.logo,
  isActive: record.isActive,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const buildWhere = (query: BrandListQuery): Prisma.BrandWhereInput => ({
  // Brand names are compared case-insensitively (normalization policy:
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
  const existing = await prisma.brand.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });

  if (existing) throw conflictError("name", "Nama merek sudah digunakan.");
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const listBrands = async (query: BrandListQuery): Promise<PaginatedResponse<Brand>> => {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  const where = buildWhere(query);

  const [total, records] = await prisma.$transaction([
    prisma.brand.count({ where }),
    prisma.brand.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    data: records.map(mapBrand),
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

export const getBrand = async (id: string): Promise<Brand> => {
  const record = await prisma.brand.findUnique({ where: { id } });
  if (!record) throw notFoundError("Merek");
  return mapBrand(record);
};

/** Lightweight options for select inputs — includes inactive records. */
export const listBrandOptions = async (): Promise<BrandOption[]> =>
  prisma.brand.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, isActive: true },
  });

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const createBrand = async (input: CreateBrandInput): Promise<Brand> => {
  const name = input.name.trim();
  await assertNameAvailable(name);

  try {
    const record = await prisma.brand.create({
      data: {
        name,
        description: input.description?.trim() || null,
        isActive: input.isActive ?? true,
      },
    });
    return mapBrand(record);
  } catch (error) {
    throw toHttpError(error, "Merek gagal disimpan karena data duplikat.");
  }
};

export const updateBrand = async (id: string, input: UpdateBrandInput): Promise<Brand> => {
  const existing = await prisma.brand.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFoundError("Merek");

  if (input.name !== undefined) await assertNameAvailable(input.name.trim(), id);

  try {
    const record = await prisma.brand.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.description !== undefined && {
          description: input.description?.trim() || null,
        }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });
    return mapBrand(record);
  } catch (error) {
    throw toHttpError(error, "Merek gagal diperbarui karena data duplikat.");
  }
};

export const deleteBrand = async (id: string): Promise<void> => {
  const existing = await prisma.brand.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFoundError("Merek");

  const productCount = await prisma.product.count({ where: { brandId: id } });
  if (productCount > 0) throw inUseError("Merek", productCount);

  try {
    await prisma.brand.delete({ where: { id } });
  } catch (error) {
    throw toHttpError(error, "Merek gagal dihapus.");
  }
};
