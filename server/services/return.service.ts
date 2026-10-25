import { z } from "zod";
import type {
  CreateReturnInput,
  PaginatedResponse,
  Return,
  ReturnKind,
  ReturnListQuery,
  ReturnSummary,
} from "~~/types";
import type { Prisma } from "../../prisma/generated/client";
import { apiError, conflictError, notFoundError } from "../utils/api";
import { prisma } from "../utils/db";
import { roundMoney, toMoney } from "../utils/money";
import { idParamSchema, isoDateInputSchema, paginationQuerySchema } from "../utils/validation";
import {
  consumeBatchStock,
  dateInputToUtc,
  recordMovement,
  restoreBatchStock,
} from "./stock.service";
import { nextDocumentNumber, withNumberRetry } from "./transaction-number.service";

// ---------------------------------------------------------------------------
// Validation schemas (shared with API route handlers)
// ---------------------------------------------------------------------------

export const returnIdParamSchema = idParamSchema;

export const returnListQuerySchema = paginationQuerySchema.extend({
  kind: z.enum(["SALE", "PURCHASE"]).optional(),
  status: z.enum(["DRAFT", "POSTED", "CANCELLED"]).optional(),
});

const positiveInt = z.coerce
  .number({ message: "Jumlah harus berupa angka." })
  .int("Jumlah harus berupa bilangan bulat.")
  .min(1, "Jumlah minimal 1.");

const returnItemInputSchema = z.object({
  sourceItemId: z.string().trim().min(1, "Item sumber wajib dipilih.").max(64),
  quantity: positiveInt,
  restock: z.boolean().optional(),
});

export const createReturnSchema = z.object({
  kind: z.enum(["SALE", "PURCHASE"]),
  sourceId: z.string().trim().min(1, "Dokumen sumber wajib dipilih.").max(64),
  date: isoDateInputSchema,
  reason: z.string().trim().max(2000).nullish(),
  condition: z.string().trim().max(2000).nullish(),
  notes: z.string().trim().max(2000).nullish(),
  items: z.array(returnItemInputSchema).min(1, "Minimal satu item retur."),
});

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

const returnInclude = {
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
      salesItem: {
        select: { id: true, sales: { select: { id: true, number: true } } },
      },
      purchaseItem: {
        select: { id: true, purchase: { select: { id: true, number: true } } },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.ReturnInclude;

type ReturnDetailRecord = Prisma.ReturnGetPayload<{ include: typeof returnInclude }>;

const mapReturn = (record: ReturnDetailRecord): Return => {
  const firstItem = record.items[0];
  const sourceNumber =
    record.kind === "SALE"
      ? (firstItem?.salesItem?.sales.number ?? null)
      : (firstItem?.purchaseItem?.purchase.number ?? null);

  return {
    id: record.id,
    number: record.number,
    kind: record.kind,
    status: record.status,
    date: record.date.toISOString(),
    reason: record.reason,
    condition: record.condition,
    notes: record.notes,
    user: record.user,
    sourceNumber,
    items: record.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      product: {
        id: item.product.id,
        name: item.product.name,
        sku: item.product.sku,
        unitSymbol: item.product.unit.symbol,
      },
      quantity: item.quantity,
      unitCost: toMoney(item.unitCost),
      subtotal: toMoney(item.subtotal),
      restock: item.restock,
      batchId: item.batchId,
      batchNumber: item.batch?.batchNumber ?? null,
      salesItemId: item.salesItemId,
      purchaseItemId: item.purchaseItemId,
    })),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
};

// ---------------------------------------------------------------------------
// Limits — sold/purchased quantity minus previously POSTED returns (§6)
// ---------------------------------------------------------------------------

const sumPostedReturnQty = async (
  where: { salesItemId: string } | { purchaseItemId: string },
  excludeReturnId?: string,
): Promise<number> => {
  const rows = await prisma.returnItem.findMany({
    where: {
      ...where,
      ...(excludeReturnId ? { returnId: { not: excludeReturnId } } : {}),
      return: { status: "POSTED" },
    },
    select: { quantity: true },
  });
  return rows.reduce((sum, row) => sum + row.quantity, 0);
};

/** Weighted-average unit cost of a sale line from its FIFO allocations. */
const saleLineWeightedCost = async (salesItemId: string): Promise<{ avg: number }> => {
  const allocations = await prisma.stockAllocation.findMany({
    where: { salesItemId },
    select: { quantity: true, totalCost: true },
  });
  const qty = allocations.reduce((sum, a) => sum + a.quantity, 0);
  const cost = allocations.reduce((sum, a) => sum + toMoney(a.totalCost), 0);
  return { avg: qty > 0 ? roundMoney(cost / qty) : 0 };
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const listReturns = async (
  query: ReturnListQuery,
): Promise<PaginatedResponse<ReturnSummary>> => {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;

  const where: Prisma.ReturnWhereInput = {
    ...(query.kind ? { kind: query.kind } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? { number: { contains: query.search, mode: "insensitive" as const } }
      : {}),
  };

  const [total, records] = await prisma.$transaction([
    prisma.return.count({ where }),
    prisma.return.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        items: { select: { quantity: true, subtotal: true } },
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
      kind: record.kind,
      status: record.status,
      date: record.date.toISOString(),
      itemCount: record.items.length,
      totalQty: record.items.reduce((sum, item) => sum + item.quantity, 0),
      total: record.items.reduce((sum, item) => sum + toMoney(item.subtotal), 0),
      user: record.user,
      createdAt: record.createdAt.toISOString(),
    })),
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

export const getReturn = async (id: string): Promise<Return> => {
  const record = await prisma.return.findUnique({ where: { id }, include: returnInclude });
  if (!record) throw notFoundError("Retur");
  return mapReturn(record);
};

// ---------------------------------------------------------------------------
// Draft creation — validates against the posted source document (§6)
// ---------------------------------------------------------------------------

interface DraftItemCalculation {
  sourceItemId: string;
  salesItemId: string | null;
  purchaseItemId: string | null;
  productId: string;
  quantity: number;
  restock: boolean;
  unitCost: number;
  subtotal: number;
}

const validateDraftItems = async (
  kind: ReturnKind,
  sourceId: string,
  items: CreateReturnInput["items"],
): Promise<DraftItemCalculation[]> => {
  const calculations: DraftItemCalculation[] = [];
  const details: Record<string, string[]> = {};

  if (kind === "SALE") {
    const saleItems = await prisma.salesItem.findMany({
      where: { id: { in: items.map((item) => item.sourceItemId) }, salesId: sourceId },
      select: { id: true, productId: true, quantity: true },
    });
    const byId = new Map(saleItems.map((item) => [item.id, item]));

    for (const input of items) {
      const saleItem = byId.get(input.sourceItemId);
      if (!saleItem) {
        details[input.sourceItemId] = ["Item tidak termasuk dalam penjualan sumber."];
        continue;
      }
      const returned = await sumPostedReturnQty({ salesItemId: saleItem.id });
      const remaining = saleItem.quantity - returned;
      if (input.quantity > remaining) {
        details[input.sourceItemId] = [
          `Jumlah retur melebihi sisa yang dapat dikembalikan (${remaining} dari ${saleItem.quantity} terjual).`,
        ];
        continue;
      }
      const { avg } = await saleLineWeightedCost(saleItem.id);
      calculations.push({
        sourceItemId: saleItem.id,
        salesItemId: saleItem.id,
        purchaseItemId: null,
        productId: saleItem.productId,
        quantity: input.quantity,
        restock: input.restock ?? false,
        unitCost: avg,
        subtotal: roundMoney(input.quantity * avg),
      });
    }
  } else {
    const purchaseItems = await prisma.purchaseItem.findMany({
      where: { id: { in: items.map((item) => item.sourceItemId) }, purchaseId: sourceId },
      select: {
        id: true,
        productId: true,
        quantity: true,
        unitCost: true,
        discount: true,
      },
    });
    const byId = new Map(purchaseItems.map((item) => [item.id, item]));

    for (const input of items) {
      const purchaseItem = byId.get(input.sourceItemId);
      if (!purchaseItem) {
        details[input.sourceItemId] = ["Item tidak termasuk dalam pembelian sumber."];
        continue;
      }
      const returned = await sumPostedReturnQty({ purchaseItemId: purchaseItem.id });
      const remaining = purchaseItem.quantity - returned;
      if (input.quantity > remaining) {
        details[input.sourceItemId] = [
          `Jumlah retur melebihi sisa yang dapat dikembalikan (${remaining} dari ${purchaseItem.quantity} dibeli).`,
        ];
        continue;
      }
      // Net inventory value per unit, matching how the purchase batch was costed.
      const netUnitCost = roundMoney(
        (purchaseItem.quantity * toMoney(purchaseItem.unitCost) -
          toMoney(purchaseItem.discount)) /
          purchaseItem.quantity,
      );
      calculations.push({
        sourceItemId: purchaseItem.id,
        salesItemId: null,
        purchaseItemId: purchaseItem.id,
        productId: purchaseItem.productId,
        quantity: input.quantity,
        restock: false,
        unitCost: netUnitCost,
        subtotal: roundMoney(input.quantity * netUnitCost),
      });
    }
  }

  if (Object.keys(details).length > 0) {
    throw apiError(400, "BAD_REQUEST", "Item retur tidak valid.", details);
  }
  return calculations;
};

export const createReturn = async (
  userId: string,
  input: CreateReturnInput,
): Promise<Return> => {
  // The source document must already be posted — you cannot return a draft.
  const sourceExists =
    input.kind === "SALE"
      ? await prisma.sales.findUnique({
          where: { id: input.sourceId },
          select: { id: true, status: true },
        })
      : await prisma.purchase.findUnique({
          where: { id: input.sourceId },
          select: { id: true, status: true },
        });
  if (!sourceExists) throw notFoundError(input.kind === "SALE" ? "Penjualan" : "Pembelian");
  if (sourceExists.status !== "POSTED") {
    throw conflictError("sourceId", "Hanya dokumen berstatus posted yang dapat diretur.");
  }

  const items = await validateDraftItems(input.kind, input.sourceId, input.items);
  const date = dateInputToUtc(input.date);

  const record = await withNumberRetry(() =>
    prisma.$transaction(async (tx) => {
      const number = await nextDocumentNumber(tx, "RTN", "return", date);
      return tx.return.create({
        data: {
          number,
          kind: input.kind,
          date,
          reason: input.reason || null,
          condition: input.condition || null,
          notes: input.notes || null,
          userId,
          items: {
            create: items.map((item) => ({
              salesItemId: item.salesItemId,
              purchaseItemId: item.purchaseItemId,
              productId: item.productId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              subtotal: item.subtotal,
              restock: item.restock,
            })),
          },
        },
        include: returnInclude,
      });
    }),
  );

  return mapReturn(record);
};

/** Drafts only: no stock effect yet, so hard deletion is safe. */
export const deleteReturn = async (id: string): Promise<void> => {
  const existing = await prisma.return.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!existing) throw notFoundError("Retur");
  if (existing.status !== "DRAFT") {
    throw conflictError("status", "Hanya retur berstatus draft yang dapat dihapus.");
  }
  await prisma.return.delete({ where: { id } });
};

// ---------------------------------------------------------------------------
// Posting — applies stock effects per kind (§6)
// ---------------------------------------------------------------------------

export const postReturn = async (id: string, userId: string): Promise<Return> => {
  const record = await prisma.return.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          salesItem: { include: { allocations: { orderBy: { createdAt: "asc" } } } },
          purchaseItem: { include: { batch: true } },
        },
      },
    },
  });
  if (!record) throw notFoundError("Retur");

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.return.updateMany({
      where: { id, status: "DRAFT" },
      data: { status: "POSTED" },
    });
    if (claimed.count !== 1) {
      const current = await tx.return.findUnique({ where: { id }, select: { status: true } });
      if (!current) throw notFoundError("Retur");
      throw conflictError(
        "status",
        `Retur tidak dapat diposting (status saat ini: ${current.status}).`,
      );
    }

    for (const item of record.items) {
      if (record.kind === "SALE") {
        if (!item.salesItem) {
          throw apiError(409, "CONFLICT", "Item retur tidak memiliki sumber penjualan yang valid.");
        }

        // Re-check the limit inside the transaction (posted returns may have
        // appeared since the draft was created).
        const returned = await sumPostedReturnQty(
          { salesItemId: item.salesItemId! },
          record.id,
        );
        const remaining = item.salesItem.quantity - returned;
        if (item.quantity > remaining) {
          throw apiError(
            409,
            "CONFLICT",
            `Jumlah retur melebihi sisa yang dapat dikembalikan (${remaining}).`,
            { [item.id]: [`Maksimal ${remaining} unit.`] },
          );
        }

        if (item.restock) {
          // Restock goes back to the exact batches this sale consumed from,
          // oldest first, preserving each batch's original expiry & cost.
          await tx.returnItem.delete({ where: { id: item.id } });

          let remainingQty = item.quantity;
          for (const allocation of item.salesItem.allocations) {
            if (remainingQty <= 0) break;
            const take = Math.min(allocation.quantity, remainingQty);
            if (take <= 0) continue;

            await tx.returnItem.create({
              data: {
                returnId: record.id,
                salesItemId: item.salesItemId,
                productId: item.productId,
                quantity: take,
                unitCost: toMoney(allocation.unitCost),
                subtotal: roundMoney(take * toMoney(allocation.unitCost)),
                restock: true,
                batchId: allocation.batchId,
              },
            });

            await restoreBatchStock(tx, allocation.batchId, take);

            await recordMovement(tx, {
              productId: item.productId,
              batchId: allocation.batchId,
              type: "RETURN_IN",
              quantity: take,
              userId,
              referenceType: "Return",
              referenceId: record.id,
              note: `Retur penjualan ${record.number} (masuk batch)`,
              occurredAt: record.date,
            });

            remainingQty -= take;
          }
          // No movement for the non-restocked remainder: a write-off return
          // changes nothing in inventory (the stock already left at sale).
          if (remainingQty > 0) {
            await tx.returnItem.create({
              data: {
                returnId: record.id,
                salesItemId: item.salesItemId,
                productId: item.productId,
                quantity: remainingQty,
                unitCost: item.unitCost,
                subtotal: roundMoney(remainingQty * toMoney(item.unitCost)),
                restock: false,
              },
            });
          }
        } else {
          // Not-landak write-off: audited by the return row alone.
          await tx.returnItem.update({
            where: { id: item.id },
            data: {
              unitCost: item.unitCost,
              subtotal: roundMoney(item.quantity * toMoney(item.unitCost)),
            },
          });
        }
      } else {
        // Purchase return: take stock out of the original receiving batch.
        const batch = item.purchaseItem?.batch;
        if (!batch) {
          throw apiError(
            409,
            "CONFLICT",
            "Batch penerimaan tidak ditemukan untuk item pembelian ini.",
          );
        }

        const returned = await sumPostedReturnQty(
          { purchaseItemId: item.purchaseItemId! },
          record.id,
        );
        const remaining = item.purchaseItem!.quantity - returned;
        if (item.quantity > remaining) {
          throw apiError(
            409,
            "CONFLICT",
            `Jumlah retur melebihi sisa yang dapat dikembalikan (${remaining}).`,
            { [item.id]: [`Maksimal ${remaining} unit.`] },
          );
        }

        const consumed = await consumeBatchStock(tx, batch.id, item.quantity);
        if (!consumed) {
          throw apiError(
            409,
            "CONFLICT",
            "Stok batch penerimaan tidak mencukupi untuk retur (sudah terpakai transaksi lain).",
            { [item.id]: ["Stok batch tidak mencukupi."] },
          );
        }

        const netUnitCost = toMoney(item.unitCost);
        await tx.returnItem.update({
          where: { id: item.id },
          data: {
            batchId: batch.id,
            unitCost: netUnitCost,
            subtotal: roundMoney(item.quantity * netUnitCost),
          },
        });

        await recordMovement(tx, {
          productId: item.productId,
          batchId: batch.id,
          type: "RETURN_OUT",
          quantity: -item.quantity,
          userId,
          referenceType: "Return",
          referenceId: record.id,
          note: `Retur pembelian ${record.number} (keluar batch)`,
          occurredAt: record.date,
        });
      }
    }
  });

  return getReturn(id);
};

// ---------------------------------------------------------------------------
// Cancellation — compensation per item kind, never deletion (§10)
// ---------------------------------------------------------------------------

export const cancelReturn = async (id: string, userId: string): Promise<Return> => {
  const record = await prisma.return.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!record) throw notFoundError("Retur");
  if (record.status !== "POSTED") {
    throw conflictError("status", "Hanya retur berstatus posted yang dapat dibatalkan.");
  }

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.return.updateMany({
      where: { id, status: "POSTED" },
      data: { status: "CANCELLED" },
    });
    if (claimed.count !== 1) {
      throw conflictError("status", "Retur gagal dibatalkan (status berubah di tengah jalan).");
    }

    for (const item of record.items) {
      if (record.kind === "SALE") {
        if (item.restock && item.batchId) {
          // Undo the restock: the goods leave the batch again. Conditional —
          // if they were already re-sold, cancelling this return is blocked.
          const consumed = await consumeBatchStock(tx, item.batchId, item.quantity);
          if (!consumed) {
            throw apiError(
              409,
              "CONFLICT",
              "Retur tidak dapat dibatalkan: stok hasil retur sudah terpakai transaksi lain.",
              { [item.id]: ["Stok sudah terpakai."] },
            );
          }
          await recordMovement(tx, {
            productId: item.productId,
            batchId: item.batchId,
            type: "RETURN_CANCEL",
            quantity: -item.quantity,
            userId,
            referenceType: "Return",
            referenceId: record.id,
            note: `Pembatalan retur penjualan ${record.number} (keluar batch)`,
          });
        }
        // Write-off items had no stock effect — status flip is the audit.
      } else if (item.batchId) {
        // Undo the purchase-return outflow: stock returns to the batch.
        await restoreBatchStock(tx, item.batchId, item.quantity);
        await recordMovement(tx, {
          productId: item.productId,
          batchId: item.batchId,
          type: "RETURN_CANCEL",
          quantity: item.quantity,
          userId,
          referenceType: "Return",
          referenceId: record.id,
          note: `Pembatalan retur pembelian ${record.number} (masuk batch)`,
        });
      }
    }
  });

  return getReturn(id);
};
