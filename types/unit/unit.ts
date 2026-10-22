import type { BaseListQuery } from "../api";

export interface Unit {
  id: string;
  name: string;
  symbol: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UnitListQuery extends BaseListQuery {
  isActive?: boolean;
}

/** Minimal shape used by select inputs (product form). */
export interface UnitOption {
  id: string;
  name: string;
  symbol: string;
  isActive: boolean;
}

export interface CreateUnitInput {
  name: string;
  symbol: string;
  description?: string | null;
  isActive?: boolean;
}

export type UpdateUnitInput = Partial<CreateUnitInput>;
