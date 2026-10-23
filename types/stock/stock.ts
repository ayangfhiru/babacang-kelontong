import type { BaseListQuery } from "../api";

/** One receive-batch of stock that carries the FIFO acquisition cost. */
export interface StockBatch {
  id: string;
  productId: string;
  product?: { id: string; name: string; sku: string };
  batchNumber: string | null;
  /** ISO date the goods were received (purchase date when created by a purchase). */
  receivedAt: string;
  /** ISO date (UTC midnight); null = product has no known expiry. */
  expiredAt: string | null;
  quantityInitial: number;
  quantityRemain: number;
  unitCost: number;
  /** Convenience flag: batch is past its expiry date and therefore unsellable. */
  isExpired?: boolean;
  /** Purchase number that received this batch, when available. */
  purchaseNumber?: string | null;
  purchaseId?: string | null;
}

/** Auditable stock change record. */
export interface StockMovement {
  id: string;
  productId: string;
  batchId: string | null;
  type:
    | "PURCHASE"
    | "SALE"
    | "RETURN_IN"
    | "RETURN_OUT"
    | "ADJUSTMENT"
    | "PURCHASE_CANCEL"
    | "SALE_CANCEL"
    | "RETURN_CANCEL"
    | "ADJUSTMENT_CANCEL";
  /** Positive = stock in, negative = stock out (signed, consistent convention). */
  quantity: number;
  referenceType: string | null;
  referenceId: string | null;
  note: string | null;
  occurredAt: string;
}

/**
 * Aggregated stock information for one product, computed server-side from
 * batches. `available` excludes expired batches from sellable stock.
 */
export interface StockAvailability {
  productId: string;
  /** Sum of remain across batches that are not expired (sellable now). */
  available: number;
  /** Sum of remain across expired batches (exists physically, not sellable). */
  expiredQuantity: number;
  /** Sum of remain across every batch (system stock). */
  systemTotal: number;
  batches: StockBatch[];
}

/** Expiry notification categories (§8). */
export type ExpiryCategory = "expired" | "soon" | "safe";

export interface ExpiryNotification {
  batchId: string;
  productId: string;
  productName: string;
  productSku: string;
  batchNumber: string | null;
  expiredAt: string;
  /** Whole days until expiry; negative when already expired. */
  daysLeft: number;
  category: ExpiryCategory;
  quantityRemain: number;
  supplierName: string | null;
  purchaseId: string | null;
  purchaseNumber: string | null;
}

export interface ExpirySummary {
  expired: number;
  soon: number;
}

export interface ExpiryNotificationListQuery extends BaseListQuery {
  category?: ExpiryCategory | "all";
}

export interface ExpiryNotificationResponse {
  data: ExpiryNotification[];
  summary: ExpirySummary;
  warningDays: number;
}
