import type { BaseListQuery } from "../api";

export interface Brand {
  id: string;
  name: string;
  description: string | null;
  logo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BrandListQuery extends BaseListQuery {
  isActive?: boolean;
}

/** Minimal shape used by select inputs (product form). */
export interface BrandOption {
  id: string;
  name: string;
  isActive: boolean;
}

export interface CreateBrandInput {
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export type UpdateBrandInput = Partial<CreateBrandInput>;
