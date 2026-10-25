import type { BaseListQuery } from "../api";
import type { TransactionStatus, TransactionUserRef } from "../transaction";

export type ReturnKind = "SALE" | "PURCHASE";

export interface ReturnProductRef {
  id: string;
  name: string;
  sku: string;
  unitSymbol: string;
}

export interface ReturnItem {
  id: string;
  productId: string;
  product: ReturnProductRef;
  quantity: number;
  /** Inventory value per unit, taken from the originating batch cost. */
  unitCost: number;
  /** Inventory value moved (quantity × unitCost). */
  subtotal: number;
  /** Sale returns only: goods re-enter a sellable batch. */
  restock: boolean;
  batchId: string | null;
  batchNumber: string | null;
  salesItemId: string | null;
  purchaseItemId: string | null;
}

export interface Return {
  id: string;
  number: string;
  kind: ReturnKind;
  status: TransactionStatus;
  /** ISO date (UTC midnight). */
  date: string;
  reason: string | null;
  condition: string | null;
  notes: string | null;
  user: TransactionUserRef;
  items: ReturnItem[];
  /** Originating sale/purchase reference when present. */
  sourceNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReturnSummary {
  id: string;
  number: string;
  kind: ReturnKind;
  status: TransactionStatus;
  date: string;
  itemCount: number;
  totalQty: number;
  /** Inventory value of all returned items (sum of item subtotals). */
  total: number;
  user: TransactionUserRef;
  createdAt: string;
}

export interface ReturnListQuery extends BaseListQuery {
  kind?: ReturnKind;
  status?: TransactionStatus;
}

export interface ReturnItemInput {
  /** The originating sale/purchase line being returned. */
  sourceItemId: string;
  quantity: number;
  /** Sale returns only: put the goods back into the original batch. */
  restock?: boolean;
}

export interface CreateReturnInput {
  kind: ReturnKind;
  /** Originating transaction (sale for kind=SALE, purchase for kind=PURCHASE). */
  sourceId: string;
  /** ISO date string. */
  date: string;
  reason?: string | null;
  condition?: string | null;
  notes?: string | null;
  items: ReturnItemInput[];
}
