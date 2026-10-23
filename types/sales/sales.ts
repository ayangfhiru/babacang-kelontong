import type { BaseListQuery } from "../api";
import type { TransactionStatus, TransactionUserRef } from "../transaction";

export interface SalesProductRef {
  id: string;
  name: string;
  sku: string;
  unitSymbol: string;
  sellingPrice: number;
}

export interface StockAllocationView {
  id: string;
  batchId: string;
  batchNumber: string | null;
  /** When the batch was received (FIFO order key). */
  receivedAt: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface SalesItem {
  id: string;
  productId: string;
  product: SalesProductRef;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
  /** Line COGS computed from actual FIFO batch costs at posting time. */
  cogs: number;
  allocations: StockAllocationView[];
}

export interface Sales {
  id: string;
  number: string;
  status: TransactionStatus;
  /** ISO datetime of the sale. */
  date: string;
  notes: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  cogs: number;
  /** total − cogs (null until posted with COGS). */
  grossProfit?: number | null;
  user: TransactionUserRef;
  items: SalesItem[];
  createdAt: string;
  updatedAt: string;
}

/** Lightweight row shape for the sales list. */
export interface SalesSummary {
  id: string;
  number: string;
  status: TransactionStatus;
  date: string;
  total: number;
  cogs: number;
  itemCount: number;
  user: TransactionUserRef;
  createdAt: string;
}

export interface SalesListQuery extends BaseListQuery {
  status?: TransactionStatus;
}

export interface SalesItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

export interface CreateSalesInput {
  /** ISO datetime from `<input type="datetime-local">`. */
  date: string;
  notes?: string | null;
  discount?: number;
  tax?: number;
  items: SalesItemInput[];
}
