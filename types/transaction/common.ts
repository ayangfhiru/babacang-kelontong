/**
 * Shared workflow status for stock-affecting transactions.
 * Stock only changes when a transaction moves to POSTED; CANCELLED records
 * keep the audit trail (compensation movements, never deletion).
 */
export type TransactionStatus = "DRAFT" | "POSTED" | "CANCELLED";

/** Author of a transaction, resolved from the server session (never from payload). */
export interface TransactionUserRef {
  id: string;
  name: string;
}
