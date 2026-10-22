import type { BaseListQuery } from "../api";

export interface Category {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryListQuery extends BaseListQuery {
  isActive?: boolean;
}

/** Minimal shape used by select inputs (product form). */
export interface CategoryOption {
  id: string;
  name: string;
  isActive: boolean;
}

export interface CreateCategoryInput {
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>;
