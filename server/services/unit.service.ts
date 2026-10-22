import { z } from "zod";
import type {
  CreateUnitInput,
  PaginatedResponse,
  Unit,
  UnitListQuery,
  UnitOption,
  UpdateUnitInput,
} from "~~/types";
import type { Prisma } from "../../prisma/generated/client";
import { conflictError, inUseError, notFoundError, toHttpError } from "../utils/api";
import { prisma } from "../utils/db";
import { paginationQuerySchema, statusFilterSchema } from "../utils/validation";

// ---------------------------------------------------------------------------
// Validation schemas (shared with API route handlers)
// ---------------------------------------------------------------------------

export const unitListQuerySchema = paginationQuerySchema.extend({
  isActive: statusFilterSchema,
});

const createUnitFields = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama unit wajib diisi.")
    .max(60, "Nama unit terlalu panjang."),
  symbol: z
    .string()
    .trim()
    .min(1, "Simbol unit wajib diisi.")
    .max(20, "Simbol unit terlalu panjang."),
  description: z.string().trim().max(500, "Deskripsi terlalu panjang.").nullish(),
  isActive: z.boolean().optional(),
});

export const createUnitSchema = createUnitFields;

export const updateUnitSchema = createUnitFields
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Minimal satu field harus diperbarui.",
  });

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

type UnitRecord = NonNullable<Awaited<ReturnType<typeof prisma.unit.findFirst>>>;

const mapUnit = (record: UnitRecord): Unit => ({
  id: record.id,
  name: record.name,
  symbol: record.symbol,
  description: record.description,
  isActive: record.isActive,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const buildWhere = (query: UnitListQuery): Prisma.UnitWhereInput => ({
  ...(query.search
    ? {
        OR: [
          { name: { contains: query.search, mode: "insensitive" as const } },
          { symbol: { contains: query.search, mode: "insensitive" as const } },
        ],
      }
    : {}),
  ...(typeof query.isActive === "boolean" ? { isActive: query.isActive } : {}),
});

// ---------------------------------------------------------------------------
// Uniqueness guards
// Normalization policy: symbols are stored uppercase and trimmed; names are
// stored trimmed as entered. Both are compared case-insensitively.
// ---------------------------------------------------------------------------

const normalizeSymbol = (symbol: string): string => symbol.trim().toUpperCase();

const assertNameAndSymbolAvailable = async (
  data: { name?: string; symbol?: string },
  excludeId?: string,
): Promise<void> => {
  if (data.name !== undefined) {
    const existing = await prisma.unit.findFirst({
      where: {
        name: { equals: data.name, mode: "insensitive" },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (existing) throw conflictError("name", "Nama unit sudah digunakan.");
  }

  if (data.symbol !== undefined) {
    const existing = await prisma.unit.findFirst({
      where: {
        symbol: { equals: data.symbol, mode: "insensitive" },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (existing) throw conflictError("symbol", "Simbol unit sudah digunakan.");
  }
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const listUnits = async (query: UnitListQuery): Promise<PaginatedResponse<Unit>> => {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  const where = buildWhere(query);

  const [total, records] = await prisma.$transaction([
    prisma.unit.count({ where }),
    prisma.unit.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    data: records.map(mapUnit),
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

export const getUnit = async (id: string): Promise<Unit> => {
  const record = await prisma.unit.findUnique({ where: { id } });
  if (!record) throw notFoundError("Unit");
  return mapUnit(record);
};

/** Lightweight options for select inputs — includes inactive records. */
export const listUnitOptions = async (): Promise<UnitOption[]> =>
  prisma.unit.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, symbol: true, isActive: true },
  });

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const createUnit = async (input: CreateUnitInput): Promise<Unit> => {
  const name = input.name.trim();
  const symbol = normalizeSymbol(input.symbol);
  await assertNameAndSymbolAvailable({ name, symbol });

  try {
    const record = await prisma.unit.create({
      data: {
        name,
        symbol,
        description: input.description?.trim() || null,
        isActive: input.isActive ?? true,
      },
    });
    return mapUnit(record);
  } catch (error) {
    throw toHttpError(error, "Unit gagal disimpan karena data duplikat.");
  }
};

export const updateUnit = async (id: string, input: UpdateUnitInput): Promise<Unit> => {
  const existing = await prisma.unit.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFoundError("Unit");

  const name = input.name !== undefined ? input.name.trim() : undefined;
  const symbol = input.symbol !== undefined ? normalizeSymbol(input.symbol) : undefined;
  await assertNameAndSymbolAvailable({ name, symbol }, id);

  try {
    const record = await prisma.unit.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(symbol !== undefined && { symbol }),
        ...(input.description !== undefined && {
          description: input.description?.trim() || null,
        }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });
    return mapUnit(record);
  } catch (error) {
    throw toHttpError(error, "Unit gagal diperbarui karena data duplikat.");
  }
};

export const deleteUnit = async (id: string): Promise<void> => {
  const existing = await prisma.unit.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFoundError("Unit");

  const productCount = await prisma.product.count({ where: { unitId: id } });
  if (productCount > 0) throw inUseError("Unit", productCount);

  try {
    await prisma.unit.delete({ where: { id } });
  } catch (error) {
    throw toHttpError(error, "Unit gagal dihapus.");
  }
};
