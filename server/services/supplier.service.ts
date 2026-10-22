import { z } from "zod";
import type {
  CreateSupplierInput,
  PaginatedResponse,
  Supplier,
  SupplierListQuery,
  UpdateSupplierInput,
} from "~~/types";
import type { Prisma } from "../../prisma/generated/client";
import { conflictError, notFoundError, toHttpError } from "../utils/api";
import { prisma } from "../utils/db";
import { paginationQuerySchema, statusFilterSchema } from "../utils/validation";

// ---------------------------------------------------------------------------
// Validation schemas (shared with API route handlers)
// ---------------------------------------------------------------------------

export const supplierListQuerySchema = paginationQuerySchema.extend({
  isActive: statusFilterSchema,
});

const createSupplierFields = z.object({
  code: z.string().trim().max(40, "Kode supplier terlalu panjang.").nullish(),
  name: z
    .string()
    .trim()
    .min(1, "Nama supplier wajib diisi.")
    .max(150, "Nama supplier terlalu panjang."),
  contactPerson: z.string().trim().max(120, "Nama kontak terlalu panjang.").nullish(),
  email: z.email("Format email tidak valid.").max(150, "Email terlalu panjang.").nullish(),
  phone: z.string().trim().max(30, "Nomor telepon terlalu panjang.").nullish(),
  address: z.string().trim().max(500, "Alamat terlalu panjang.").nullish(),
  notes: z.string().trim().max(1000, "Catatan terlalu panjang.").nullish(),
  isActive: z.boolean().optional(),
});

export const createSupplierSchema = createSupplierFields;

export const updateSupplierSchema = createSupplierFields
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Minimal satu field harus diperbarui.",
  });

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

type SupplierRecord = NonNullable<Awaited<ReturnType<typeof prisma.supplier.findFirst>>>;

const mapSupplier = (record: SupplierRecord): Supplier => ({
  id: record.id,
  code: record.code,
  name: record.name,
  contactPerson: record.contactPerson,
  email: record.email,
  phone: record.phone,
  address: record.address,
  notes: record.notes,
  isActive: record.isActive,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const buildWhere = (query: SupplierListQuery): Prisma.SupplierWhereInput => ({
  ...(query.search
    ? {
        OR: [
          { name: { contains: query.search, mode: "insensitive" as const } },
          { code: { contains: query.search, mode: "insensitive" as const } },
          { phone: { contains: query.search } },
          { email: { contains: query.search, mode: "insensitive" as const } },
        ],
      }
    : {}),
  ...(typeof query.isActive === "boolean" ? { isActive: query.isActive } : {}),
});

// ---------------------------------------------------------------------------
// Uniqueness guards
// Normalization policy: supplier codes are stored uppercase and trimmed.
// ---------------------------------------------------------------------------

const normalizeCode = (code: string | null | undefined): string | null =>
  code ? code.trim().toUpperCase() : null;

const assertCodeAvailable = async (code: string, excludeId?: string): Promise<void> => {
  const existing = await prisma.supplier.findFirst({
    where: {
      code: { equals: code, mode: "insensitive" },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });

  if (existing) throw conflictError("code", "Kode supplier sudah digunakan.");
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const listSuppliers = async (
  query: SupplierListQuery,
): Promise<PaginatedResponse<Supplier>> => {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  const where = buildWhere(query);

  const [total, records] = await prisma.$transaction([
    prisma.supplier.count({ where }),
    prisma.supplier.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    data: records.map(mapSupplier),
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

export const getSupplier = async (id: string): Promise<Supplier> => {
  const record = await prisma.supplier.findUnique({ where: { id } });
  if (!record) throw notFoundError("Supplier");
  return mapSupplier(record);
};

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const createSupplier = async (input: CreateSupplierInput): Promise<Supplier> => {
  const code = normalizeCode(input.code);
  if (code) await assertCodeAvailable(code);

  try {
    const record = await prisma.supplier.create({
      data: {
        code,
        name: input.name.trim(),
        contactPerson: input.contactPerson?.trim() || null,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        address: input.address?.trim() || null,
        notes: input.notes?.trim() || null,
        isActive: input.isActive ?? true,
      },
    });
    return mapSupplier(record);
  } catch (error) {
    throw toHttpError(error, "Supplier gagal disimpan karena data duplikat.");
  }
};

export const updateSupplier = async (
  id: string,
  input: UpdateSupplierInput,
): Promise<Supplier> => {
  const existing = await prisma.supplier.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFoundError("Supplier");

  const code = input.code !== undefined ? normalizeCode(input.code) : undefined;
  if (code) await assertCodeAvailable(code, id);

  try {
    const record = await prisma.supplier.update({
      where: { id },
      data: {
        ...(code !== undefined && { code }),
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.contactPerson !== undefined && {
          contactPerson: input.contactPerson?.trim() || null,
        }),
        ...(input.email !== undefined && { email: input.email?.trim() || null }),
        ...(input.phone !== undefined && { phone: input.phone?.trim() || null }),
        ...(input.address !== undefined && { address: input.address?.trim() || null }),
        ...(input.notes !== undefined && { notes: input.notes?.trim() || null }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });
    return mapSupplier(record);
  } catch (error) {
    throw toHttpError(error, "Supplier gagal diperbarui karena data duplikat.");
  }
};

// Suppliers are not referenced by any business module yet (purchases come in a
// later phase), so hard deletion is safe today. Deactivation remains available
// as the archival strategy once purchase transactions reference suppliers.
export const deleteSupplier = async (id: string): Promise<void> => {
  const existing = await prisma.supplier.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFoundError("Supplier");

  try {
    await prisma.supplier.delete({ where: { id } });
  } catch (error) {
    throw toHttpError(error, "Supplier gagal dihapus.");
  }
};
