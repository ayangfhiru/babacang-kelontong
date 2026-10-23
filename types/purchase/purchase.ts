import type { BaseListQuery } from "../api";
import type { TransactionStatus, TransactionUserRef } from "../transaction";

export interface PurchaseProductRef {
  id: string;
  name: string;
  sku: string;
  unitSymbol: string;
}

export interface PurchaseSupplierRef {
  id: string;
  name: string;
}

export interface PurchaseItem {
  id: string;
  productId: string;
  product: PurchaseProductRef;
  quantity: number;
  unitCost: number;
  discount: number;
  subtotal: number;
  batchNumber: string | null;
  expiredAt: string | null;
}

export interface Purchase {
  id: string;
  number: string;
  supplierId: string;
  supplier: PurchaseSupplierRef;
  status: TransactionStatus;
  /** ISO date (UTC midnight). */
  date: string;
  notes: string | null;
  subtotal: number;
  discount: number;
  total: number;
  user: TransactionUserRef;
  items: PurchaseItem[];
  createdAt: string;
  updatedAt: string;
}

/** Lightweight row shape for the purchase list. */
export interface PurchaseSummary {
  id: string;
  number: string;
  supplier: PurchaseSupplierRef;
  status: TransactionStatus;
  date: string;
  total: number;
  itemCount: number;
  user: TransactionUserRef;
  createdAt: string;
}

export interface PurchaseListQuery extends BaseListQuery {
  status?: TransactionStatus;
  supplierId?: string;
}

export interface PurchaseItemInput {
  productId: string;
  quantity: number;
  unitCost: number;
  discount?: number;
  batchNumber?: string | null;
  /** ISO date string from `<input type="date">`. */
  expiredAt?: string | null;
}

export interface CreatePurchaseInput {
  supplierId: string;
  /** ISO date string from `<input type="date">`. */
  date: string;
  notes?: string | null;
  discount?: number;
  items: PurchaseItemInput[];
}
