/**
 * Client-side types for the purchase item editor.
 *
 * Items live in page state until the whole transaction is submitted, so they
 * need a stable identity that does not depend on array positions.
 */

/** One purchase line held in temporary (not yet persisted) page state. */
export interface PurchaseItemDraft {
  /** Stable client-side identity; survives reordering and deletions. */
  key: string;
  productId: string;
  quantity: number;
  unitCost: number;
  discount: number;
  batchNumber: string;
  /** ISO date (`YYYY-MM-DD`) or an empty string when unset. */
  expiredAt: string;
}

/** Payload the item modal emits — the page owns the draft key. */
export type PurchaseItemFormPayload = Omit<PurchaseItemDraft, "key">;

/**
 * Modal form model. Numeric fields stay strings while editing so half-typed
 * input is never coerced (`Number("")` would silently become `0`).
 */
export interface PurchaseItemFormModel {
  productId: string;
  quantity: string;
  unitCost: string;
  discount: string;
  batchNumber: string;
  expiredAt: string;
}

export type PurchaseItemFormErrors = Partial<
  Record<keyof PurchaseItemFormModel, string>
>;
