import { z } from "zod";
import type {
  CreatePurchaseInput,
  PaginatedResponse,
  Purchase,
  PurchaseListQuery,
  PurchaseSummary,
} from "~~/types";
import type { Prisma } from "../../prisma/generated/client";
import { apiError, conflictError, notFoundError } from "../utils/api";
import { prisma } from "../utils/db";
import { roundMoney, toMoney } from "../utils/money";
import { idParamSchema, isoDateInputSchema, paginationQuerySchema } from "../utils/validation";
import {
  consumeBatchStock,
  createStockBatch,
  dateInputToUtc,
  recordMovement,
} from "./stock.service";
import { nextDocumentNumber, withNumberRetry } from "./transaction-number.service";

// ---------------------------------------------------------------------------
// Validation schemas (shared with API route handlers)
// ---------------------------------------------------------------------------

export const purchaseIdParamSchema = idParamSchema;

export const purchaseListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(["DRAFT", "POSTED", "CANCELLED"]).optional(),
  supplierId: z.string().trim().max(64).optional(),
});

const nonNegativeMoney = z.coerce
  .number({ message: "Nilai harus berupa angka." })
  .nonnegative("Nilai tidak boleh negatif.")
  .max(9_999_999_999, "Nilai terlalu besar.");

const positiveInt = z.coerce
  .number({ message: "Jumlah harus berupa angka." })
  .int("Jumlah harus berupa bilangan bulat.")
  .min(1, "Jumlah minimal 1.");

const purchaseItemInputSchema = z.object({
  productId: z.string().trim().min(1, "Produk wajib dipilih.").max(64),
  quantity: positiveInt,
  unitCost: nonNegativeMoney,
  discount: nonNegativeMoney.optional(),
  batchNumber: z.string().trim().max(100).nullish(),
  expiredAt: isoDateInputSchema.nullish(),
});

export const createPurchaseSchema = z.object({
  supplierId: z.string().trim().min(1, "Supplier wajib dipilih.").max(64),
  date: isoDateInputSchema,
  notes: z.string().trim().max(2000).nullish(),
  discount: nonNegativeMoney.optional(),
  items: z
    .array(purchaseItemInputSchema)
    .min(1, "Minimal satu item pembelian."),
});

export const updatePurchaseSchema = createPurchaseSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "Minimal satu field harus diperbarui." },
);

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

const purchaseInclude = {
  supplier: { select: { id: true, name: true } },
  user: { select: { id: true, name: true } },
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          unit: { select: { symbol: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.PurchaseInclude;

type PurchaseDetailRecord = Prisma.PurchaseGetPayload<{ include: typeof purchaseInclude }>;

const mapPurchaseItem = (record: PurchaseDetailRecord["items"][number]) => ({
  id: record.id,
  productId: record.productId,
  product: {
    id: record.product.id,
    name: record.product.name,
    sku: record.product.sku,
    unitSymbol: record.product.unit.symbol,
  },
  quantity: record.quantity,
  unitCost: toMoney(record.unitCost),
  discount: toMoney(record.discount),
  subtotal: toMoney(record.subtotal),
  batchNumber: record.batchNumber,
  expiredAt: record.expiredAt?.toISOString() ?? null,
});

const mapPurchase = (record: PurchaseDetailRecord): Purchase => ({
  id: record.id,
  number: record.number,
  supplierId: record.supplierId,
  supplier: record.supplier,
  status: record.status,
  date: record.date.toISOString(),
  notes: record.notes,
  subtotal: toMoney(record.subtotal),
  discount: toMoney(record.discount),
  total: toMoney(record.total),
  user: record.user,
  items: record.items.map(mapPurchaseItem),
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

// ---------------------------------------------------------------------------
// Totals (always recomputed server-side, §5/§10)
// ---------------------------------------------------------------------------

interface TotalsInput {
  items: { quantity: number; unitCost: number; discount: number }[];
  discount: number;
}

const computeTotals = (
  input: TotalsInput,
): { subtotal: number; discount: number; total: number } => {
  const subtotal = roundMoney(
    input.items.reduce(
      (sum, item) => sum + item.quantity * item.unitCost - item.discount,
      0,
    ),
  );
  const discount = roundMoney(input.discount);
  // Header discount reduces the payable total, never the subtotal itself.
  return { subtotal, discount, total: Math.max(roundMoney(subtotal - discount), 0) };
};

// ---------------------------------------------------------------------------
// Reference validation
// ---------------------------------------------------------------------------

const assertReferences = async (input: {
  supplierId?: string;
  items?: { productId: string }[];
}): Promise<void> => {
  const details: Record<string, string[]> = {};

  if (input.supplierId !== undefined) {
    const supplier = await prisma.supplier.findUnique({
      where: { id: input.supplierId },
      select: { id: true },
    });
    if (!supplier) details.supplierId = ["Supplier tidak ditemukan."];
  }

  if (input.items) {
    const productIds = [...new Set(input.items.map((item) => item.productId))];
    const found = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    });
    const foundIds = new Set(found.map((product) => product.id));
    const missing = productIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      details.items = missing.map((id) => `Produk ${id} tidak ditemukan.`);
    }
  }

  if (Object.keys(details).length > 0) {
    throw apiError(400, "BAD_REQUEST", "Data pembelian tidak valid.", details);
  }
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const listPurchases = async (
  query: PurchaseListQuery,
): Promise<PaginatedResponse<PurchaseSummary>> => {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;

  const where: Prisma.PurchaseWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.supplierId ? { supplierId: query.supplierId } : {}),
    ...(query.search
      ? {
          OR: [
            { number: { contains: query.search, mode: "insensitive" as const } },
            { supplier: { name: { contains: query.search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [total, records] = await prisma.$transaction([
    prisma.purchase.count({ where }),
    prisma.purchase.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    data: records.map((record) => ({
      id: record.id,
      number: record.number,
      supplier: record.supplier,
      status: record.status,
      date: record.date.toISOString(),
      total: toMoney(record.total),
      itemCount: record._count.items,
      user: record.user,
      createdAt: record.createdAt.toISOString(),
    })),
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

export const getPurchase = async (id: string): Promise<Purchase> => {
  const record = await prisma.purchase.findUnique({ where: { id }, include: purchaseInclude });
  if (!record) throw notFoundError("Pembelian");
  return mapPurchase(record);
};

// ---------------------------------------------------------------------------
// Mutations — draft lifecycle
// ---------------------------------------------------------------------------

interface ItemCalculation {
  productId: string;
  quantity: number;
  unitCost: number;
  discount: number;
  subtotal: number;
  batchNumber: string | null;
  expiredAt: Date | null;
}

const calculateItems = (items: CreatePurchaseInput["items"]): ItemCalculation[] =>
  items.map((item) => {
    const discount = item.discount ?? 0;
    return {
      productId: item.productId,
      quantity: item.quantity,
      unitCost: item.unitCost,
      discount,
      subtotal: roundMoney(item.quantity * item.unitCost - discount),
      batchNumber: item.batchNumber || null,
      expiredAt: item.expiredAt ? dateInputToUtc(item.expiredAt) : null,
    };
  });

export const createPurchase = async (
  userId: string,
  input: CreatePurchaseInput,
): Promise<Purchase> => {
  await assertReferences({ supplierId: input.supplierId, items: input.items });

  const date = dateInputToUtc(input.date);
  const items = calculateItems(input.items);
  const totals = computeTotals({
    items,
    discount: input.discount ?? 0,
  });

  // The number is computed inside the transaction; the unique index rejects
  // races and withNumberRetry recomputes a fresh number on P2002.
  const record = await withNumberRetry(() =>
    prisma.$transaction(async (tx) => {
      const number = await nextDocumentNumber(tx, "PO", "purchase", date);
      return tx.purchase.create({
        data: {
          number,
          supplierId: input.supplierId,
          date,
          notes: input.notes || null,
          subtotal: totals.subtotal,
          discount: totals.discount,
          total: totals.total,
          userId,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              discount: item.discount,
              subtotal: item.subtotal,
              batchNumber: item.batchNumber,
              expiredAt: item.expiredAt,
            })),
          },
        },
        include: purchaseInclude,
      });
    }),
  );

  return mapPurchase(record);
};

export const updatePurchase = async (
  id: string,
  input: Partial<CreatePurchaseInput>,
): Promise<Purchase> => {
  const existing = await prisma.purchase.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!existing) throw notFoundError("Pembelian");
  if (existing.status !== "DRAFT") {
    throw conflictError("status", "Pembelian yang sudah diposting tidak dapat diedit.");
  }

  await assertReferences({
    ...(input.supplierId !== undefined && { supplierId: input.supplierId }),
    ...(input.items !== undefined && { items: input.items }),
  });

  const data: Prisma.PurchaseUpdateInput = {
    ...(input.supplierId !== undefined && { supplier: { connect: { id: input.supplierId } } }),
    ...(input.date !== undefined && { date: dateInputToUtc(input.date) }),
    ...(input.notes !== undefined && { notes: input.notes || null }),
  };

  if (input.items !== undefined) {
    const items = calculateItems(input.items);
    const discount = input.discount ?? 0;
    const totals = computeTotals({ items, discount });
    data.subtotal = totals.subtotal;
    data.discount = totals.discount;
    data.total = totals.total;
    // Draft items have no lifecycle of their own — replace the whole set.
    data.items = { deleteMany: {}, create: items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitCost: item.unitCost,
      discount: item.discount,
      subtotal: item.subtotal,
      batchNumber: item.batchNumber,
      expiredAt: item.expiredAt,
    })) };
  } else if (input.discount !== undefined) {
    const record = await prisma.purchase.findUniqueOrThrow({
      where: { id },
      include: { items: true },
    });
    const totals = computeTotals({
      items: record.items.map((item) => ({
        quantity: item.quantity,
        unitCost: toMoney(item.unitCost),
        discount: toMoney(item.discount),
      })),
      discount: input.discount,
    });
    data.discount = totals.discount;
    data.total = totals.total;
  }

  const record = await prisma.purchase.update({ where: { id }, data, include: purchaseInclude });
  return mapPurchase(record);
};

/** Drafts only: nothing references them yet, so hard deletion is safe. */
export const deletePurchase = async (id: string): Promise<void> => {
  const existing = await prisma.purchase.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!existing) throw notFoundError("Pembelian");
  if (existing.status !== "DRAFT") {
    throw conflictError("status", "Hanya pembelian berstatus draft yang dapat dihapus.");
  }
  await prisma.purchase.delete({ where: { id } });
};

// ---------------------------------------------------------------------------
// Posting — creates batches + inbound movements (idempotent claim, §4/§10)
// ---------------------------------------------------------------------------

export const postPurchase = async (id: string, userId: string): Promise<Purchase> => {
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!purchase) throw notFoundError("Pembelian");

  await prisma.$transaction(async (tx) => {
    // Idempotency claim: only one concurrent post can flip DRAFT → POSTED.
    const claimed = await tx.purchase.updateMany({
      where: { id, status: "DRAFT" },
      data: { status: "POSTED" },
    });
    if (claimed.count !== 1) {
      const current = await tx.purchase.findUnique({
        where: { id },
        select: { status: true },
      });
      if (!current) throw notFoundError("Pembelian");
      throw conflictError(
        "status",
        `Pembelian tidak dapat diposting (status saat ini: ${current.status}).`,
      );
    }

    for (const item of purchase.items) {
      // Net acquisition cost per unit (line discount amortized) — the value
      // FIFO/COGS will use when this batch is later sold.
      const netUnitCost = roundMoney(
        (item.quantity * toMoney(item.unitCost) - toMoney(item.discount)) / item.quantity,
      );

      await createStockBatch(tx, {
        productId: item.productId,
        purchaseItemId: item.id,
        batchNumber: item.batchNumber,
        receivedAt: purchase.date,
        expiredAt: item.expiredAt,
        quantity: item.quantity,
        unitCost: netUnitCost,
      });

      await recordMovement(tx, {
        productId: item.productId,
        type: "PURCHASE",
        quantity: item.quantity,
        userId,
        referenceType: "Purchase",
        referenceId: purchase.id,
        note: `Penerimaan pembelian ${purchase.number}`,
        occurredAt: purchase.date,
      });
    }
  });

  return getPurchase(id);
};

// ---------------------------------------------------------------------------
// Cancellation — auditable compensation, never deletion (§10)
// ---------------------------------------------------------------------------

export const cancelPurchase = async (id: string, userId: string): Promise<Purchase> => {
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: { items: { include: { batch: true } } },
  });
  if (!purchase) throw notFoundError("Pembelian");
  if (purchase.status !== "POSTED") {
    throw conflictError("status", "Hanya pembelian berstatus posted yang dapat dibatalkan.");
  }

  // The goods must not have moved on yet: a batch that was sold, returned
  // out, or adjusted cannot be silently un-received (that would create
  // negative stock or erase history).
  const touched = purchase.items.find(
    (item) =>
      item.batch && item.batch.quantityRemain !== item.batch.quantityInitial,
  );
  if (touched) {
    throw conflictError(
      "status",
      "Pembelian tidak dapat dibatalkan karena stok penerimaannya sudah dipakai transaksi lain. Gunakan retur pembelian atau penyesuaian stok.",
    );
  }

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.purchase.updateMany({
      where: { id, status: "POSTED" },
      data: { status: "CANCELLED" },
    });
    if (claimed.count !== 1) {
      throw conflictError("status", "Pembelian gagal dibatalkan (status berubah di tengah jalan).");
    }

    for (const item of purchase.items) {
      if (!item.batch) continue;

      const consumed = await consumeBatchStock(tx, item.batch.id, item.batch.quantityRemain);
      if (!consumed) {
        throw apiError(
          409,
          "CONFLICT",
          "Pembatalan gagal: stok batch berubah di tengah jalan. Coba lagi.",
        );
      }

      await recordMovement(tx, {
        productId: item.productId,
        batchId: item.batch.id,
        type: "PURCHASE_CANCEL",
        quantity: -item.batch.quantityRemain,
        userId,
        referenceType: "Purchase",
        referenceId: purchase.id,
        note: `Pembatalan pembelian ${purchase.number}`,
      });
    }
  });

  return getPurchase(id);
};
