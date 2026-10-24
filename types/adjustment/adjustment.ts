import type { BaseListQuery } from "../api";
import type { TransactionStatus, TransactionUserRef } from "../transaction";

export interface AdjustmentProductRef {
  id: string;
  name: string;
  sku: string;
  unitSymbol: string;
}

export interface StockAdjustmentItem {
  id: string;
  productId: string;
  product: AdjustmentProductRef;
  /** Stock per batches at creation/posting time. */
  systemQty: number;
  /** Counted physical stock. */
  physicalQty: number;
  /** physicalQty − systemQty (positive = goods found, negative = missing). */
  difference: number;
  /** Acquisition cost per unit used when difference > 0. */
  unitCost: number;
  reason: string | null;
  batchId: string | null;
  batchNumber: string | null;
}

export interface StockAdjustment {
  id: string;
  number: string;
  status: TransactionStatus;
  /** ISO date (UTC midnight). */
  date: string;
  reason: string | null;
  notes: string | null;
  user: TransactionUserRef;
  items: StockAdjustmentItem[];
  createdAt: string;
  updatedAt: string;
}

export interface StockAdjustmentSummary {
  id: string;
  number: string;
  status: TransactionStatus;
  date: string;
  reason: string | null;
  itemCount: number;
  user: TransactionUserRef;
  createdAt: string;
}

export interface StockAdjustmentListQuery extends BaseListQuery {
  status?: TransactionStatus;
}

export interface StockAdjustmentItemInput {
  productId: string;
  physicalQty: number;
  /** Required when the difference is positive (auditable acquisition cost). */
  unitCost?: number;
  reason?: string | null;
}

export interface CreateStockAdjustmentInput {
  /** ISO date string. */
  date: string;
  reason?: string | null;
  notes?: string | null;
  items: StockAdjustmentItemInput[];
}
