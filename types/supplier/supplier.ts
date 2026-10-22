import type { BaseListQuery } from "../api";

export interface Supplier {
  id: string;
  code: string | null;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierListQuery extends BaseListQuery {
  isActive?: boolean;
}

export interface CreateSupplierInput {
  code?: string | null;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export type UpdateSupplierInput = Partial<CreateSupplierInput>;
