import { z } from "zod";
import type {
  BarcodeCheckResponse,
  CreateProductInput,
  PaginatedResponse,
  Product,
  ProductListQuery,
  UpdateProductInput,
} from "~~/types";
import type { Prisma } from "../../prisma/generated/client";
import { apiError, conflictError, notFoundError, toHttpError } from "../utils/api";
import { prisma } from "../utils/db";
import { paginationQuerySchema, statusFilterSchema } from "../utils/validation";

// ---------------------------------------------------------------------------
// Validation schemas (shared with API route handlers)
// ---------------------------------------------------------------------------

export const productListQuerySchema = paginationQuerySchema.extend({
  categoryId: z.string().trim().max(64).optional(),
  brandId: z.string().trim().max(64).optional(),
  unitId: z.string().trim().max(64).optional(),
  isActive: statusFilterSchema,
});

const nonNegativePrice = z.coerce
  .number({ message: "Harga harus berupa angka." })
  .nonnegative("Harga tidak boleh negatif.")
  .max(9_999_999_999, "Harga terlalu besar.");

const createProductFields = z.object({
  sku: z
    .string()
    .trim()
    .min(1, "SKU wajib diisi.")
    .max(64, "SKU terlalu panjang."),
  barcode: z.string().trim().max(64, "Barcode terlalu panjang.").nullish(),
  name: z
    .string()
    .trim()
    .min(1, "Nama produk wajib diisi.")
    .max(200, "Nama produk terlalu panjang."),
  description: z.string().trim().max(2000, "Deskripsi terlalu panjang.").nullish(),
  categoryId: z.string().trim().min(1, "Kategori wajib dipilih.").max(64),
  brandId: z.string().trim().max(64).nullish(),
  unitId: z.string().trim().min(1, "Unit wajib dipilih.").max(64),
  purchasePrice: nonNegativePrice,
  sellingPrice: nonNegativePrice,
  isActive: z.boolean().optional(),
});

export const createProductSchema = createProductFields;

export const updateProductSchema = createProductFields
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Minimal satu field harus diperbarui.",
  });

/** Route param schema for `:barcode` (scanner input, kept as a string). */
export const barcodeParamSchema = z
  .string()
  .trim()
  .min(1, "Barcode wajib diisi.")
  .max(64, "Barcode terlalu panjang.");

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

const productInclude = {
  category: { select: { id: true, name: true } },
  brand: { select: { id: true, name: true } },
  unit: { select: { id: true, name: true, symbol: true } },
} satisfies Prisma.ProductInclude;

type ProductRecord = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

const mapProduct = (record: ProductRecord): Product => ({
  id: record.id,
  sku: record.sku,
  barcode: record.barcode,
  name: record.name,
  description: record.description,
  categoryId: record.categoryId,
  category: record.category,
  brandId: record.brandId,
  brand: record.brand,
  unitId: record.unitId,
  unit: record.unit,
  // Prisma Decimal is serialized to a plain number for the JSON API.
  purchasePrice: Number(record.purchasePrice),
  sellingPrice: Number(record.sellingPrice),
  image: record.image,
  isActive: record.isActive,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const buildWhere = (query: ProductListQuery): Prisma.ProductWhereInput => ({
  ...(query.search
    ? {
        OR: [
          { name: { contains: query.search, mode: "insensitive" as const } },
          { sku: { contains: query.search, mode: "insensitive" as const } },
          { barcode: { contains: query.search } },
        ],
      }
    : {}),
  ...(query.categoryId ? { categoryId: query.categoryId } : {}),
  ...(query.brandId ? { brandId: query.brandId } : {}),
  ...(query.unitId ? { unitId: query.unitId } : {}),
  ...(typeof query.isActive === "boolean" ? { isActive: query.isActive } : {}),
});

// ---------------------------------------------------------------------------
// Normalization + uniqueness guards
// Normalization policy: SKU and barcode are stored uppercase and trimmed.
// ---------------------------------------------------------------------------

const normalizeCode = (value: string | null | undefined): string | null =>
  value ? value.trim().toUpperCase() : null;

const assertUniqueCodes = async (
  codes: { sku?: string; barcode?: string | null },
  excludeId?: string,
): Promise<void> => {
  if (codes.sku !== undefined) {
    const existing = await prisma.product.findFirst({
      where: {
        sku: { equals: codes.sku, mode: "insensitive" },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (existing) throw conflictError("sku", "SKU sudah digunakan.");
  }

  if (codes.barcode) {
    const existing = await prisma.product.findFirst({
      where: {
        barcode: { equals: codes.barcode },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (existing) throw conflictError("barcode", "Barcode sudah digunakan.");
  }
};

/** Validate that referenced master records exist before writing. */
const assertReferences = async (input: {
  categoryId?: string;
  brandId?: string | null;
  unitId?: string;
}): Promise<void> => {
  const details: Record<string, string[]> = {};

  if (input.categoryId !== undefined) {
    const category = await prisma.category.findUnique({
      where: { id: input.categoryId },
      select: { id: true },
    });
    if (!category) details.categoryId = ["Kategori tidak ditemukan."];
  }

  if (input.unitId !== undefined) {
    const unit = await prisma.unit.findUnique({
      where: { id: input.unitId },
      select: { id: true },
    });
    if (!unit) details.unitId = ["Unit tidak ditemukan."];
  }

  if (input.brandId) {
    const brand = await prisma.brand.findUnique({
      where: { id: input.brandId },
      select: { id: true },
    });
    if (!brand) details.brandId = ["Merek tidak ditemukan."];
  }

  if (Object.keys(details).length > 0) {
    throw apiError(400, "BAD_REQUEST", "Relasi produk tidak valid.", details);
  }
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const listProducts = async (
  query: ProductListQuery,
): Promise<PaginatedResponse<Product>> => {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  const where = buildWhere(query);

  const [total, records] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    data: records.map(mapProduct),
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

export const getProduct = async (id: string): Promise<Product> => {
  const record = await prisma.product.findUnique({ where: { id }, include: productInclude });
  if (!record) throw notFoundError("Produk");
  return mapProduct(record);
};

/**
 * Barcode lookup used by the product scanner (§4 of PROMT.md).
 * The barcode is normalized exactly like the create/update path so the query
 * hits the unique index and matches what is stored in the database.
 */
export const checkBarcode = async (rawBarcode: string): Promise<BarcodeCheckResponse> => {
  const barcode = normalizeCode(rawBarcode);

  if (!barcode) {
    throw apiError(400, "BAD_REQUEST", "Barcode tidak valid.", {
      barcode: ["Barcode tidak valid."],
    });
  }

  const product = await prisma.product.findFirst({
    where: { barcode: { equals: barcode, mode: "insensitive" } },
    select: { id: true, name: true, barcode: true },
  });

  if (!product) return { success: true, exists: false, data: null };

  return {
    success: true,
    exists: true,
    data: { id: product.id, name: product.name, barcode: product.barcode ?? barcode },
  };
};

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const createProduct = async (input: CreateProductInput): Promise<Product> => {
  const sku = normalizeCode(input.sku);
  const barcode = normalizeCode(input.barcode);

  if (!sku) throw apiError(400, "BAD_REQUEST", "SKU wajib diisi.", { sku: ["SKU wajib diisi."] });

  await assertUniqueCodes({ sku, barcode });
  await assertReferences({ categoryId: input.categoryId, brandId: input.brandId, unitId: input.unitId });

  try {
    const record = await prisma.product.create({
      data: {
        sku,
        barcode,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        categoryId: input.categoryId,
        brandId: input.brandId || null,
        unitId: input.unitId,
        purchasePrice: input.purchasePrice,
        sellingPrice: input.sellingPrice,
        isActive: input.isActive ?? true,
      },
      include: productInclude,
    });
    return mapProduct(record);
  } catch (error) {
    throw toHttpError(error, "Produk gagal disimpan karena data duplikat.");
  }
};

export const updateProduct = async (
  id: string,
  input: UpdateProductInput,
): Promise<Product> => {
  const existing = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFoundError("Produk");

  const sku = input.sku !== undefined ? normalizeCode(input.sku) : undefined;
  const barcode = input.barcode !== undefined ? normalizeCode(input.barcode) : undefined;

  if (sku !== undefined && !sku) {
    throw apiError(400, "BAD_REQUEST", "SKU wajib diisi.", { sku: ["SKU wajib diisi."] });
  }

  await assertUniqueCodes({ sku, barcode }, id);
  await assertReferences({
    ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
    ...(input.brandId !== undefined && { brandId: input.brandId }),
    ...(input.unitId !== undefined && { unitId: input.unitId }),
  });

  try {
    const record = await prisma.product.update({
      where: { id },
      data: {
        ...(sku !== undefined && { sku }),
        ...(barcode !== undefined && { barcode }),
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.description !== undefined && {
          description: input.description?.trim() || null,
        }),
        ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
        ...(input.brandId !== undefined && { brandId: input.brandId || null }),
        ...(input.unitId !== undefined && { unitId: input.unitId }),
        ...(input.purchasePrice !== undefined && { purchasePrice: input.purchasePrice }),
        ...(input.sellingPrice !== undefined && { sellingPrice: input.sellingPrice }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
      include: productInclude,
    });
    return mapProduct(record);
  } catch (error) {
    throw toHttpError(error, "Produk gagal diperbarui karena data duplikat.");
  }
};

// No business module references products yet (sales/purchases come in later
// phases), so hard deletion is safe today. Deactivation remains available as
// the archival strategy once transactions reference products.
export const deleteProduct = async (id: string): Promise<void> => {
  const existing = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFoundError("Produk");

  try {
    await prisma.product.delete({ where: { id } });
  } catch (error) {
    throw toHttpError(error, "Produk gagal dihapus karena masih dirujuk transaksi.");
  }
};
