import { z } from "zod";
import type {
  CreateSalesInput,
  PaginatedResponse,
  Sales,
  SalesListQuery,
  SalesSummary,
} from "~~/types";
import type { Prisma } from "../../prisma/generated/client";
import { apiError, conflictError, notFoundError } from "../utils/api";
import { prisma } from "../utils/db";
import { roundMoney, toMoney } from "../utils/money";
import { idParamSchema, isoDateTimeInputSchema, paginationQuerySchema } from "../utils/validation";
import {
  allocateFifo,
  consumeBatchStock,
  recordMovement,
  restoreBatchStock,
  startOfTodayUtc,
} from "./stock.service";
import { nextDocumentNumber, withNumberRetry } from "./transaction-number.service";

// ---------------------------------------------------------------------------
// Validation schemas (shared with API route handlers)
// ---------------------------------------------------------------------------

export const salesIdParamSchema = idParamSchema;

export const salesListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(["DRAFT", "POSTED", "CANCELLED"]).optional(),
});

const nonNegativeMoney = z.coerce
  .number({ message: "Nilai harus berupa angka." })
  .nonnegative("Nilai tidak boleh negatif.")
  .max(9_999_999_999, "Nilai terlalu besar.");

const positiveInt = z.coerce
  .number({ message: "Jumlah harus berupa angka." })
  .int("Jumlah harus berupa bilangan bulat.")
  .min(1, "Jumlah minimal 1.");

const salesItemInputSchema = z.object({
  productId: z.string().trim().min(1, "Produk wajib dipilih.").max(64),
  quantity: positiveInt,
  unitPrice: nonNegativeMoney,
  discount: nonNegativeMoney.optional(),
});

export const createSalesSchema = z.object({
  date: isoDateTimeInputSchema,
  notes: z.string().trim().max(2000).nullish(),
  discount: nonNegativeMoney.optional(),
  tax: nonNegativeMoney.optional(),
  items: z.array(salesItemInputSchema).min(1, "Minimal satu item penjualan."),
});

export const updateSalesSchema = createSalesSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "Minimal satu field harus diperbarui." },
);

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

const salesInclude = {
  user: { select: { id: true, name: true } },
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          sellingPrice: true,
          unit: { select: { symbol: true } },
        },
      },
      allocations: {
        include: { batch: { select: { id: true, batchNumber: true, receivedAt: true } } },
        orderBy: { createdAt: "asc" as const },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.SalesInclude;

type SalesDetailRecord = Prisma.SalesGetPayload<{ include: typeof salesInclude }>;

const mapSalesItem = (record: SalesDetailRecord["items"][number]) => ({
  id: record.id,
  productId: record.productId,
  product: {
    id: record.product.id,
    name: record.product.name,
    sku: record.product.sku,
    unitSymbol: record.product.unit.symbol,
    sellingPrice: toMoney(record.product.sellingPrice),
  },
  quantity: record.quantity,
  unitPrice: toMoney(record.unitPrice),
  discount: toMoney(record.discount),
  subtotal: toMoney(record.subtotal),
  cogs: toMoney(record.cogs),
  allocations: record.allocations.map((allocation) => ({
    id: allocation.id,
    batchId: allocation.batchId,
    batchNumber: allocation.batch.batchNumber,
    receivedAt: allocation.batch.receivedAt.toISOString(),
    quantity: allocation.quantity,
    unitCost: toMoney(allocation.unitCost),
    totalCost: toMoney(allocation.totalCost),
  })),
});

const mapSales = (record: SalesDetailRecord): Sales => ({
  id: record.id,
  number: record.number,
  status: record.status,
  date: record.date.toISOString(),
  notes: record.notes,
  subtotal: toMoney(record.subtotal),
  discount: toMoney(record.discount),
  tax: toMoney(record.tax),
  total: toMoney(record.total),
  cogs: toMoney(record.cogs),
  grossProfit: record.status === "POSTED" ? toMoney(record.total) - toMoney(record.cogs) : null,
  user: record.user,
  items: record.items.map(mapSalesItem),
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

// ---------------------------------------------------------------------------
// Totals (always recomputed server-side — the client is never trusted, §5)
// ---------------------------------------------------------------------------

interface TotalsInput {
  items: { quantity: number; unitPrice: number; discount: number }[];
  discount: number;
  tax: number;
}

const computeTotals = (
  input: TotalsInput,
): { subtotal: number; discount: number; tax: number; total: number } => {
  const subtotal = roundMoney(
    input.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice - item.discount,
      0,
    ),
  );
  const discount = roundMoney(input.discount);
  const tax = roundMoney(input.tax);
  return {
    subtotal,
    discount,
    tax,
    total: Math.max(roundMoney(subtotal - discount + tax), 0),
  };
};

// ---------------------------------------------------------------------------
// Reference validation
// ---------------------------------------------------------------------------

const assertReferences = async (items: { productId: string }[]): Promise<void> => {
  const productIds = [...new Set(items.map((item) => item.productId))];
  const found = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, isActive: true },
  });
  const byId = new Map(found.map((product) => [product.id, product]));

  const details: Record<string, string[]> = {};
  for (const productId of productIds) {
    const product = byId.get(productId);
    if (!product) details[productId] = ["Produk tidak ditemukan."];
    else if (!product.isActive) details[productId] = ["Produk tidak aktif."];
  }
  if (Object.keys(details).length > 0) {
    throw apiError(400, "BAD_REQUEST", "Item penjualan tidak valid.", details);
  }
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const listSales = async (
  query: SalesListQuery,
): Promise<PaginatedResponse<SalesSummary>> => {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;

  const where: Prisma.SalesWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? { number: { contains: query.search, mode: "insensitive" as const } }
      : {}),
  };

  const [total, records] = await prisma.$transaction([
    prisma.sales.count({ where }),
    prisma.sales.findMany({
      where,
      include: {
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
      status: record.status,
      date: record.date.toISOString(),
      total: toMoney(record.total),
      cogs: toMoney(record.cogs),
      itemCount: record._count.items,
      user: record.user,
      createdAt: record.createdAt.toISOString(),
    })),
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

export const getSales = async (id: string): Promise<Sales> => {
  const record = await prisma.sales.findUnique({ where: { id }, include: salesInclude });
  if (!record) throw notFoundError("Penjualan");
  return mapSales(record);
};

// ---------------------------------------------------------------------------
// Mutations — draft lifecycle
// ---------------------------------------------------------------------------

interface ItemCalculation {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
}

const calculateItems = (items: CreateSalesInput["items"]): ItemCalculation[] =>
  items.map((item) => {
    const discount = item.discount ?? 0;
    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount,
      subtotal: roundMoney(item.quantity * item.unitPrice - discount),
    };
  });

export const createSales = async (
  userId: string,
  input: CreateSalesInput,
): Promise<Sales> => {
  await assertReferences(input.items);

  const date = new Date(input.date);
  const items = calculateItems(input.items);
  const totals = computeTotals({ items, discount: input.discount ?? 0, tax: input.tax ?? 0 });

  const record = await withNumberRetry(() =>
    prisma.$transaction(async (tx) => {
      const number = await nextDocumentNumber(tx, "INV", "sales", date);
      return tx.sales.create({
        data: {
          number,
          date,
          notes: input.notes || null,
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          total: totals.total,
          userId,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              subtotal: item.subtotal,
            })),
          },
        },
        include: salesInclude,
      });
    }),
  );

  return mapSales(record);
};

export const updateSales = async (
  id: string,
  input: Partial<CreateSalesInput>,
): Promise<Sales> => {
  const existing = await prisma.sales.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!existing) throw notFoundError("Penjualan");
  if (existing.status !== "DRAFT") {
    throw conflictError("status", "Penjualan yang sudah diposting tidak dapat diedit.");
  }

  if (input.items !== undefined) await assertReferences(input.items);

  const data: Prisma.SalesUpdateInput = {
    ...(input.date !== undefined && { date: new Date(input.date) }),
    ...(input.notes !== undefined && { notes: input.notes || null }),
  };

  if (input.items !== undefined) {
    const items = calculateItems(input.items);
    const totals = computeTotals({
      items,
      discount: input.discount ?? 0,
      tax: input.tax ?? 0,
    });
    data.subtotal = totals.subtotal;
    data.discount = totals.discount;
    data.tax = totals.tax;
    data.total = totals.total;
    // Draft items have no allocations yet — safe to replace wholesale.
    data.items = {
      deleteMany: {},
      create: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        subtotal: item.subtotal,
      })),
    };
  } else if (input.discount !== undefined || input.tax !== undefined) {
    const record = await prisma.sales.findUniqueOrThrow({ where: { id }, include: { items: true } });
    const totals = computeTotals({
      items: record.items.map((item) => ({
        quantity: item.quantity,
        unitPrice: toMoney(item.unitPrice),
        discount: toMoney(item.discount),
      })),
      discount: input.discount ?? toMoney(record.discount),
      tax: input.tax ?? toMoney(record.tax),
    });
    data.discount = totals.discount;
    data.tax = totals.tax;
    data.total = totals.total;
  }

  const record = await prisma.sales.update({ where: { id }, data, include: salesInclude });
  return mapSales(record);
};

/** Drafts only: no allocations or movements exist yet, so hard deletion is safe. */
export const deleteSales = async (id: string): Promise<void> => {
  const existing = await prisma.sales.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!existing) throw notFoundError("Penjualan");
  if (existing.status !== "DRAFT") {
    throw conflictError("status", "Hanya penjualan berstatus draft yang dapat dihapus.");
  }
  await prisma.sales.delete({ where: { id } });
};

// ---------------------------------------------------------------------------
// Posting — FIFO allocation + COGS in one transaction (§5)
// ---------------------------------------------------------------------------

export const postSales = async (id: string, userId: string): Promise<Sales> => {
  const sales = await prisma.sales.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!sales) throw notFoundError("Penjualan");

  const today = startOfTodayUtc();

  await prisma.$transaction(async (tx) => {
    // Idempotency claim: only one concurrent post can flip DRAFT → POSTED.
    const claimed = await tx.sales.updateMany({
      where: { id, status: "DRAFT" },
      data: { status: "POSTED" },
    });
    if (claimed.count !== 1) {
      const current = await tx.sales.findUnique({ where: { id }, select: { status: true } });
      if (!current) throw notFoundError("Penjualan");
      throw conflictError(
        "status",
        `Penjualan tidak dapat diposting (status saat ini: ${current.status}).`,
      );
    }

    let totalCogs = 0;

    for (const item of sales.items) {
      const allocations = await allocateFifo(tx, item.productId, item.quantity, today);
      let lineCogs = 0;

      for (const allocation of allocations) {
        // Conditional decrement: fails loudly if a concurrent transaction
        // consumed the same batch first (rolls the whole sale back).
        const consumed = await consumeBatchStock(tx, allocation.batchId, allocation.quantity);
        if (!consumed) {
          throw apiError(
            409,
            "CONFLICT",
            "Stok batch berubah di tengah posting. Silakan coba lagi.",
            { [item.productId]: ["Stok berubah saat posting. Coba lagi."] },
          );
        }

        await tx.stockAllocation.create({
          data: {
            salesItemId: item.id,
            batchId: allocation.batchId,
            quantity: allocation.quantity,
            unitCost: allocation.unitCost,
            totalCost: allocation.totalCost,
          },
        });

        lineCogs += allocation.totalCost;
      }

      lineCogs = roundMoney(lineCogs);

      await tx.salesItem.update({
        where: { id: item.id },
        data: { cogs: lineCogs },
      });

      await recordMovement(tx, {
        productId: item.productId,
        type: "SALE",
        quantity: -item.quantity,
        userId,
        referenceType: "Sales",
        referenceId: sales.id,
        note: `Penjualan ${sales.number}`,
        occurredAt: sales.date,
      });

      totalCogs += lineCogs;
    }

    await tx.sales.update({
      where: { id },
      data: { cogs: roundMoney(totalCogs) },
    });
  });

  return getSales(id);
};

// ---------------------------------------------------------------------------
// Cancellation — reverses allocations with auditable compensation (§10)
// ---------------------------------------------------------------------------

export const cancelSales = async (id: string, userId: string): Promise<Sales> => {
  const sales = await prisma.sales.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          allocations: true,
          returnItems: { include: { return: { select: { status: true } } } },
        },
      },
    },
  });
  if (!sales) throw notFoundError("Penjualan");
  if (sales.status !== "POSTED") {
    throw conflictError("status", "Hanya penjualan berstatus posted yang dapat dibatalkan.");
  }

  // Posted returns already reversed part of this sale's stock — cancelling
  // the whole document on top of that would double-count. Block it.
  const hasPostedReturn = sales.items.some((item) =>
    item.returnItems.some((returnItem) => returnItem.return.status === "POSTED"),
  );
  if (hasPostedReturn) {
    throw conflictError(
      "status",
      "Penjualan memiliki retur terposted dan tidak dapat dibatalkan. Proses retur yang sudah ada tetap berlaku.",
    );
  }

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.sales.updateMany({
      where: { id, status: "POSTED" },
      data: { status: "CANCELLED" },
    });
    if (claimed.count !== 1) {
      throw conflictError("status", "Penjualan gagal dibatalkan (status berubah di tengah jalan).");
    }

    for (const item of sales.items) {
      for (const allocation of item.allocations) {
        await restoreBatchStock(tx, allocation.batchId, allocation.quantity);

        await recordMovement(tx, {
          productId: item.productId,
          batchId: allocation.batchId,
          type: "SALE_CANCEL",
          quantity: allocation.quantity,
          userId,
          referenceType: "Sales",
          referenceId: sales.id,
          note: `Pembatalan penjualan ${sales.number}`,
        });
      }
    }
  });

  return getSales(id);
};
