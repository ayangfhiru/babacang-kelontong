import type {
  ExpiryCategory,
  ExpiryNotification,
  ExpiryNotificationListQuery,
  ExpiryNotificationResponse,
  ExpirySummary,
  StockAvailability,
  StockBatch,
  StockMovement,
} from "~~/types";
import type { Prisma, StockBatch as StockBatchRecord } from "../../prisma/generated/client";
import { apiError, notFoundError } from "../utils/api";
import { prisma } from "../utils/db";
import { toMoney } from "../utils/money";

type Tx = Prisma.TransactionClient;

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Date rules (documented in the final report)
//
// - `expiredAt` is always stored as UTC midnight of the expiry date.
// - A batch is expired when `expiredAt < today at UTC midnight` — goods are
//   still sellable ON their expiry date, and become unsellable the day after.
// - `daysLeft` uses the same UTC day boundary so results never shift with the
//   wall clock or server timezone.
// ---------------------------------------------------------------------------

/** UTC midnight of the current UTC day. */
export const startOfTodayUtc = (): Date => {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
};

/** Parse an `<input type="date">` value ("YYYY-MM-DD") to UTC midnight. */
export const dateInputToUtc = (value: string): Date =>
  new Date(`${value}T00:00:00.000Z`);

/** Render a stored expiry/received date back to "YYYY-MM-DD". */
export const utcToDateInput = (value: Date): string => value.toISOString().slice(0, 10);

/** FIFO order: oldest receipt first, id as deterministic tie-break. */
export const FIFO_ORDER: Prisma.StockBatchOrderByWithRelationInput[] = [
  { receivedAt: "asc" },
  { id: "asc" },
];

const isExpiredBatch = (batch: { expiredAt: Date | null }, today: Date): boolean =>
  batch.expiredAt !== null && batch.expiredAt.getTime() < today.getTime();

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Batches with remaining stock that may legally be sold right now. */
const getSellableBatches = async (
  tx: Tx,
  productId: string,
  today: Date,
): Promise<StockBatchRecord[]> =>
  tx.stockBatch.findMany({
    where: {
      productId,
      quantityRemain: { gt: 0 },
      OR: [{ expiredAt: null }, { expiredAt: { gte: today } }],
    },
    orderBy: FIFO_ORDER,
  });

/**
 * Server-computed stock information for one product.
 * `available` never includes expired batches (§11).
 */
export const getStockAvailability = async (productId: string): Promise<StockAvailability> => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) throw notFoundError("Produk");

  const today = startOfTodayUtc();
  const batches = await prisma.stockBatch.findMany({
    where: { productId, quantityRemain: { gt: 0 } },
    orderBy: FIFO_ORDER,
    include: {
      purchaseItem: {
        select: { purchase: { select: { id: true, number: true } } },
      },
    },
  });

  const views: StockBatch[] = batches.map((batch) => ({
    id: batch.id,
    productId: batch.productId,
    batchNumber: batch.batchNumber,
    receivedAt: batch.receivedAt.toISOString(),
    expiredAt: batch.expiredAt?.toISOString() ?? null,
    quantityInitial: batch.quantityInitial,
    quantityRemain: batch.quantityRemain,
    unitCost: toMoney(batch.unitCost),
    isExpired: isExpiredBatch(batch, today),
    purchaseId: batch.purchaseItem?.purchase.id ?? null,
    purchaseNumber: batch.purchaseItem?.purchase.number ?? null,
  }));

  const available = views
    .filter((batch) => !batch.isExpired)
    .reduce((sum, batch) => sum + batch.quantityRemain, 0);
  const expiredQuantity = views
    .filter((batch) => batch.isExpired)
    .reduce((sum, batch) => sum + batch.quantityRemain, 0);

  return {
    productId,
    available,
    expiredQuantity,
    systemTotal: available + expiredQuantity,
    batches: views,
  };
};

// ---------------------------------------------------------------------------
// FIFO allocation (sales posting)
// ---------------------------------------------------------------------------

export interface FifoAllocation {
  batchId: string;
  receivedAt: Date;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

/**
 * Pick batches for `quantity` units of `productId` in strict receipt order
 * (FIFO by `receivedAt`). Expired batches are never allocated. Throws 409
 * with a per-product detail message when sellable stock is insufficient,
 * mentioning expired stock that exists but cannot be sold.
 */
export const allocateFifo = async (
  tx: Tx,
  productId: string,
  quantity: number,
  today: Date,
): Promise<FifoAllocation[]> => {
  const sellable = await getSellableBatches(tx, productId, today);

  let need = quantity;
  const allocations: FifoAllocation[] = [];

  for (const batch of sellable) {
    if (need <= 0) break;
    const take = Math.min(batch.quantityRemain, need);
    if (take <= 0) continue;

    allocations.push({
      batchId: batch.id,
      receivedAt: batch.receivedAt,
      quantity: take,
      unitCost: toMoney(batch.unitCost),
      totalCost: take * toMoney(batch.unitCost),
    });
    need -= take;
  }

  if (need > 0) {
    const available = quantity - need;
    const expiredQty = await sumExpiredStock(tx, productId, today);

    let message = `Stok tidak mencukupi. Tersedia ${available} unit terjual.`;
    if (expiredQty > 0) {
      message += ` ${expiredQty} unit lainnya tidak dapat dijual karena sudah kedaluwarsa.`;
    }

    throw apiError(409, "CONFLICT", message, { [productId]: [message] });
  }

  return allocations;
};

const sumExpiredStock = async (tx: Tx, productId: string, today: Date): Promise<number> => {
  const rows = await tx.stockBatch.findMany({
    where: {
      productId,
      quantityRemain: { gt: 0 },
      expiredAt: { lt: today },
    },
    select: { quantityRemain: true },
  });
  return rows.reduce((sum, row) => sum + row.quantityRemain, 0);
};

/**
 * Decrement a batch conditionally. Returns false when another transaction
 * consumed the stock first — the caller must abort so the whole database
 * transaction rolls back (prevents double-spending a batch, §10).
 */
export const consumeBatchStock = async (
  tx: Tx,
  batchId: string,
  quantity: number,
): Promise<boolean> => {
  const result = await tx.stockBatch.updateMany({
    where: { id: batchId, quantityRemain: { gte: quantity } },
    data: { quantityRemain: { decrement: quantity } },
  });
  return result.count === 1;
};

/** Give stock back to a batch (sale cancel / return restock / adjustments). */
export const restoreBatchStock = async (
  tx: Tx,
  batchId: string,
  quantity: number,
): Promise<void> => {
  await tx.stockBatch.update({
    where: { id: batchId },
    data: { quantityRemain: { increment: quantity } },
  });
};

// ---------------------------------------------------------------------------
// Batch + movement writes
// ---------------------------------------------------------------------------

export interface CreateBatchInput {
  productId: string;
  purchaseItemId?: string | null;
  batchNumber?: string | null;
  receivedAt: Date;
  expiredAt?: Date | null;
  quantity: number;
  unitCost: number;
}

export const createStockBatch = (tx: Tx, input: CreateBatchInput) =>
  tx.stockBatch.create({
    data: {
      productId: input.productId,
      purchaseItemId: input.purchaseItemId ?? null,
      batchNumber: input.batchNumber ?? null,
      receivedAt: input.receivedAt,
      expiredAt: input.expiredAt ?? null,
      quantityInitial: input.quantity,
      quantityRemain: input.quantity,
      unitCost: input.unitCost,
    },
  });

export interface MovementInput {
  productId: string;
  batchId?: string | null;
  type: StockMovement["type"];
  /** Signed quantity: positive = stock in, negative = stock out. */
  quantity: number;
  userId?: string | null;
  referenceType?: string;
  referenceId?: string;
  note?: string | null;
  occurredAt?: Date;
}

export const recordMovement = (tx: Tx, input: MovementInput) =>
  tx.stockMovement.create({
    data: {
      productId: input.productId,
      batchId: input.batchId ?? null,
      type: input.type,
      quantity: input.quantity,
      userId: input.userId ?? null,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      note: input.note ?? null,
      occurredAt: input.occurredAt ?? new Date(),
    },
  });

// ---------------------------------------------------------------------------
// Expiry notifications (§8)
// ---------------------------------------------------------------------------

/** Whole days until expiry (negative when already past). */
export const daysUntilExpiry = (expiredAt: Date, today: Date): number =>
  Math.floor((expiredAt.getTime() - today.getTime()) / DAY_MS);

const resolveWarningDays = (): number => {
  const config = useRuntimeConfig();
  const raw = Number(config.stockExpiryWarningDays);
  return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 30;
};

/**
 * Expiry notifications computed on page open (no cron job, §8): every batch
 * with remaining stock and a known expiry date, categorized as
 * expired / soon (within the warning window) / safe. Batches without an
 * expiry date are intentionally excluded — "no expiry" ≠ "expired".
 */
export const getExpiryNotifications = async (
  query: ExpiryNotificationListQuery,
): Promise<ExpiryNotificationResponse> => {
  const today = startOfTodayUtc();
  const warningDays = resolveWarningDays();

  const rows = await prisma.stockBatch.findMany({
    where: {
      quantityRemain: { gt: 0 },
      expiredAt: { not: null },
    },
    orderBy: [{ expiredAt: "asc" }, { id: "asc" }],
    include: {
      product: { select: { id: true, name: true, sku: true } },
      purchaseItem: {
        select: {
          purchase: {
            select: {
              id: true,
              number: true,
              supplier: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  const all: ExpiryNotification[] = rows.flatMap((row) => {
    if (!row.expiredAt) return [];
    const daysLeft = daysUntilExpiry(row.expiredAt, today);
    const category: ExpiryCategory =
      daysLeft < 0 ? "expired" : daysLeft <= warningDays ? "soon" : "safe";
    const purchase = row.purchaseItem?.purchase;

    return [
      {
        batchId: row.id,
        productId: row.product.id,
        productName: row.product.name,
        productSku: row.product.sku,
        batchNumber: row.batchNumber,
        expiredAt: row.expiredAt.toISOString(),
        daysLeft,
        category,
        quantityRemain: row.quantityRemain,
        supplierName: purchase?.supplier.name ?? null,
        purchaseId: purchase?.id ?? null,
        purchaseNumber: purchase?.number ?? null,
      },
    ];
  });

  const summary: ExpirySummary = {
    expired: all.filter((item) => item.category === "expired").length,
    soon: all.filter((item) => item.category === "soon").length,
  };

  const filtered =
    !query.category || query.category === "all"
      ? all
      : all.filter((item) => item.category === query.category);

  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  const start = (page - 1) * pageSize;

  return {
    data: filtered.slice(start, start + pageSize),
    summary,
    warningDays,
  };
};
