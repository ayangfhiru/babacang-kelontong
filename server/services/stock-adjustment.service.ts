import { z } from "zod";
import type {
  CreateStockAdjustmentInput,
  PaginatedResponse,
  StockAdjustment,
  StockAdjustmentListQuery,
  StockAdjustmentSummary,
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
  FIFO_ORDER,
  recordMovement,
  restoreBatchStock,
} from "./stock.service";
import { nextDocumentNumber, withNumberRetry } from "./transaction-number.service";

// ---------------------------------------------------------------------------
// Validation schemas (shared with API route handlers)
// ---------------------------------------------------------------------------

export const adjustmentIdParamSchema = idParamSchema;

export const adjustmentListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(["DRAFT", "POSTED", "CANCELLED"]).optional(),
});

const nonNegativeMoney = z.coerce
  .number({ message: "Nilai harus berupa angka." })
  .nonnegative("Nilai tidak boleh negatif.")
  .max(9_999_999_999, "Nilai terlalu besar.");

const adjustmentItemInputSchema = z.object({
  productId: z.string().trim().min(1, "Produk wajib dipilih.").max(64),
  physicalQty: z.coerce
    .number({ message: "Jumlah fisik harus berupa angka." })
    .int("Jumlah fisik harus berupa bilangan bulat.")
    .nonnegative("Jumlah fisik tidak boleh negatif."),
  // Required only when the adjustment adds stock (positive difference).
  unitCost: nonNegativeMoney.optional(),
  reason: z.string().trim().max(2000).nullish(),
});

export const createAdjustmentSchema = z.object({
  date: isoDateInputSchema,
  reason: z.string().trim().max(2000).nullish(),
  notes: z.string().trim().max(2000).nullish(),
  items: z.array(adjustmentItemInputSchema).min(1, "Minimal satu item penyesuaian."),
});

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

const adjustmentInclude = {
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
      batch: { select: { id: true, batchNumber: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.StockAdjustmentInclude;

type AdjustmentDetailRecord = Prisma.StockAdjustmentGetPayload<{
  include: typeof adjustmentInclude;
}>;

const mapAdjustment = (record: AdjustmentDetailRecord): StockAdjustment => ({
  id: record.id,
  number: record.number,
  status: record.status,
  date: record.date.toISOString(),
  reason: record.reason,
  notes: record.notes,
  user: record.user,
  items: record.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    product: {
      id: item.product.id,
      name: item.product.name,
      sku: item.product.sku,
      unitSymbol: item.product.unit.symbol,
    },
    batchId: item.batchId,
    batchNumber: item.batch?.batchNumber ?? null,
    systemQty: item.systemQty,
    physicalQty: item.physicalQty,
    difference: item.difference,
    unitCost: toMoney(item.unitCost),
    reason: item.reason,
  })),
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

// ---------------------------------------------------------------------------
// System quantity — recomputed live at post time (§7)
// ---------------------------------------------------------------------------

/** Total stock on hand across ALL batches, expired included (physical truth). */
const getSystemQty = async (tx: Prisma.TransactionClient, productId: string): Promise<number> => {
  const rows = await tx.stockBatch.findMany({
    where: { productId },
    select: { quantityRemain: true },
  });
  return rows.reduce((sum, row) => sum + row.quantityRemain, 0);
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const listAdjustments = async (
  query: StockAdjustmentListQuery,
): Promise<PaginatedResponse<StockAdjustmentSummary>> => {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;

  const where: Prisma.StockAdjustmentWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? { number: { contains: query.search, mode: "insensitive" as const } }
      : {}),
  };

  const [total, records] = await prisma.$transaction([
    prisma.stockAdjustment.count({ where }),
    prisma.stockAdjustment.findMany({
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
      reason: record.reason,
      itemCount: record._count.items,
      user: record.user,
      createdAt: record.createdAt.toISOString(),
    })),
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

export const getAdjustment = async (id: string): Promise<StockAdjustment> => {
  const record = await prisma.stockAdjustment.findUnique({
    where: { id },
    include: adjustmentInclude,
  });
  if (!record) throw notFoundError("Penyesuaian stok");
  return mapAdjustment(record);
};

// ---------------------------------------------------------------------------
// Draft creation
// ---------------------------------------------------------------------------

const assertProducts = async (productIds: string[]): Promise<void> => {
  const unique = [...new Set(productIds)];
  const found = await prisma.product.findMany({
    where: { id: { in: unique } },
    select: { id: true },
  });
  const foundIds = new Set(found.map((product) => product.id));
  const missing = unique.filter((id) => !foundIds.has(id));
  if (missing.length > 0) {
    throw apiError(
      400,
      "BAD_REQUEST",
      "Produk pada penyesuaian tidak valid.",
      { items: missing.map((id) => `Produk ${id} tidak ditemukan.`) },
    );
  }
};

export const createAdjustment = async (
  userId: string,
  input: CreateStockAdjustmentInput,
): Promise<StockAdjustment> => {
  await assertProducts(input.items.map((item) => item.productId));

  // Snapshot system quantity at draft time for display only; it is
  // recomputed authoritatively at posting (§7).
  const date = dateInputToUtc(input.date);
  const items: {
    productId: string;
    systemQty: number;
    physicalQty: number;
    difference: number;
    unitCost: number;
    reason: string | null;
  }[] = [];

  for (const item of input.items) {
    const systemQty = await getSystemQty(prisma, item.productId);
    items.push({
      productId: item.productId,
      systemQty,
      physicalQty: item.physicalQty,
      difference: item.physicalQty - systemQty,
      // Cost for additions must be stated explicitly (auditable, §7); it is
      // validated at post when the sign of the difference is finally known.
      unitCost: item.unitCost ?? 0,
      reason: item.reason || null,
    });
  }

  const record = await withNumberRetry(() =>
    prisma.$transaction(async (tx) => {
      const number = await nextDocumentNumber(tx, "ADJ", "stockAdjustment", date);
      return tx.stockAdjustment.create({
        data: {
          number,
          date,
          reason: input.reason || null,
          notes: input.notes || null,
          userId,
          items: { create: items },
        },
        include: adjustmentInclude,
      });
    }),
  );

  return mapAdjustment(record);
};

/** Drafts only: no stock effect yet, so hard deletion is safe. */
export const deleteAdjustment = async (id: string): Promise<void> => {
  const existing = await prisma.stockAdjustment.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!existing) throw notFoundError("Penyesuaian stok");
  if (existing.status !== "DRAFT") {
    throw conflictError("status", "Hanya penyesuaian berstatus draft yang dapat dihapus.");
  }
  await prisma.stockAdjustment.delete({ where: { id } });
};

// ---------------------------------------------------------------------------
// Posting — movements always; additions need an explicit cost, reductions
// consume batches FIFO including expired stock (§7)
// ---------------------------------------------------------------------------

export const postAdjustment = async (id: string, userId: string): Promise<StockAdjustment> => {
  const record = await prisma.stockAdjustment.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!record) throw notFoundError("Penyesuaian stok");

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.stockAdjustment.updateMany({
      where: { id, status: "DRAFT" },
      data: { status: "POSTED" },
    });
    if (claimed.count !== 1) {
      const current = await tx.stockAdjustment.findUnique({
        where: { id },
        select: { status: true },
      });
      if (!current) throw notFoundError("Penyesuaian stok");
      throw conflictError(
        "status",
        `Penyesuaian tidak dapat diposting (status saat ini: ${current.status}).`,
      );
    }

    for (const item of record.items) {
      // Authoritative recompute: the physical count is compared against live
      // system stock at posting, not against the draft snapshot.
      const systemQty = await getSystemQty(tx, item.productId);
      const difference = item.physicalQty - systemQty;

      if (difference === 0) {
        await tx.stockAdjustmentItem.update({
          where: { id: item.id },
          data: { systemQty, difference, unitCost: 0 },
        });
        continue;
      }

      if (difference > 0) {
        // Additions require an explicit, auditable unit cost (§7).
        // Prisma Decimal must be converted before comparing with a number.
        if (toMoney(item.unitCost) <= 0) {
          throw apiError(
            400,
            "BAD_REQUEST",
            `Selisih positif untuk produk ${item.productId} memerlukan biaya satuan yang valid.`,
            { [item.productId]: ["Biaya satuan wajib diisi untuk stok bertambah."] },
          );
        }

        const batch = await createStockBatch(tx, {
          productId: item.productId,
          batchNumber: `ADJ-${record.number}`,
          receivedAt: record.date,
          expiredAt: null,
          quantity: difference,
          unitCost: toMoney(item.unitCost),
        });

        await tx.stockAdjustmentItem.update({
          where: { id: item.id },
          data: { systemQty, difference, unitCost: toMoney(item.unitCost), batchId: batch.id },
        });

        await recordMovement(tx, {
          productId: item.productId,
          batchId: batch.id,
          type: "ADJUSTMENT",
          quantity: difference,
          userId,
          referenceType: "StockAdjustment",
          referenceId: record.id,
          note: `Penyesuaian stok ${record.number} (tambah)`,
          occurredAt: record.date,
        });
      } else {
        // Reductions must carry an auditable reason at item or document level
        // (PROMT.md §3B); enforced server-side at posting time, when the sign
        // of the difference is authoritative.
        if (!item.reason && !record.reason) {
          throw apiError(
            400,
            "BAD_REQUEST",
            `Selisih negatif untuk produk ${item.productId} memerlukan alasan penyesuaian.`,
            { [item.productId]: ["Alasan wajib diisi untuk stok berkurang."] },
          );
        }

        // Reductions consume batches FIFO — expired batches included, because
        // a physical shortage applies to everything on the shelf.
        let remaining = -difference;
        let weightedCostTotal = 0;

        const batches = await tx.stockBatch.findMany({
          where: { productId: item.productId, quantityRemain: { gt: 0 } },
          orderBy: FIFO_ORDER,
        });

        for (const batch of batches) {
          if (remaining <= 0) break;
          const take = Math.min(batch.quantityRemain, remaining);

          const consumed = await consumeBatchStock(tx, batch.id, take);
          if (!consumed) {
            throw apiError(
              409,
              "CONFLICT",
              "Stok batch berubah di tengah posting penyesuaian. Coba lagi.",
            );
          }

          weightedCostTotal += take * toMoney(batch.unitCost);

          await recordMovement(tx, {
            productId: item.productId,
            batchId: batch.id,
            type: "ADJUSTMENT",
            quantity: -take,
            userId,
            referenceType: "StockAdjustment",
            referenceId: record.id,
            note: `Penyesuaian stok ${record.number} (kurang)`,
            occurredAt: record.date,
          });

          remaining -= take;
        }

        if (remaining > 0) {
          throw apiError(
            409,
            "CONFLICT",
            `Stok tidak mencukupi untuk penyesuaian negatif produk ${item.productId}.`,
            { [item.productId]: ["Stok tidak mencukupi."] },
          );
        }

        const unitCost =
          difference !== 0 ? roundMoney(weightedCostTotal / -difference) : 0;
        await tx.stockAdjustmentItem.update({
          where: { id: item.id },
          data: { systemQty, difference, unitCost },
        });
      }
    }
  });

  return getAdjustment(id);
};

// ---------------------------------------------------------------------------
// Cancellation — compensation movements, never deletion (§10)
// ---------------------------------------------------------------------------

export const cancelAdjustment = async (id: string, userId: string): Promise<StockAdjustment> => {
  const record = await prisma.stockAdjustment.findUnique({
    where: { id },
    include: {
      items: { include: { batch: true } },
    },
  });
  if (!record) throw notFoundError("Penyesuaian stok");
  if (record.status !== "POSTED") {
    throw conflictError("status", "Hanya penyesuaian berstatus posted yang dapat dibatalkan.");
  }

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.stockAdjustment.updateMany({
      where: { id, status: "POSTED" },
      data: { status: "CANCELLED" },
    });
    if (claimed.count !== 1) {
      throw conflictError(
        "status",
        "Penyesuaian gagal dibatalkan (status berubah di tengah jalan).",
      );
    }

    for (const item of record.items) {
      if (item.difference === 0) continue;

      if (item.difference > 0) {
        // Remove the batch that this adjustment created. Conditional: if the
        // added stock was already consumed, cancellation is blocked.
        if (!item.batchId) continue;
        const consumed = await consumeBatchStock(tx, item.batchId, item.difference);
        if (!consumed) {
          throw apiError(
            409,
            "CONFLICT",
            "Penyesuaian tidak dapat dibatalkan: stok hasil penambahan sudah terpakai transaksi lain.",
            { [item.productId]: ["Stok sudah terpakai."] },
          );
        }
        await recordMovement(tx, {
          productId: item.productId,
          batchId: item.batchId,
          type: "ADJUSTMENT_CANCEL",
          quantity: -item.difference,
          userId,
          referenceType: "StockAdjustment",
          referenceId: record.id,
          note: `Pembatalan penyesuaian ${record.number} (kurang)`,
        });
      } else {
        // Re-add the shortage to the exact batches the reduction consumed,
        // taken from the posted ADJUSTMENT movements (auditable, §10).
        const movements = await tx.stockMovement.findMany({
          where: {
            referenceType: "StockAdjustment",
            referenceId: record.id,
            type: "ADJUSTMENT",
            quantity: { lt: 0 },
            productId: item.productId,
            batchId: { not: null },
          },
          orderBy: { createdAt: "asc" },
        });

        for (const movement of movements) {
          if (!movement.batchId) continue;

          await restoreBatchStock(tx, movement.batchId, -movement.quantity);
          await recordMovement(tx, {
            productId: item.productId,
            batchId: movement.batchId,
            type: "ADJUSTMENT_CANCEL",
            // Compensating movement mirrors the original signed quantity.
            quantity: -movement.quantity,
            userId,
            referenceType: "StockAdjustment",
            referenceId: record.id,
            note: `Pembatalan penyesuaian ${record.number} (tambah)`,
          });
        }
      }
    }
  });

  return getAdjustment(id);
};
