import type { BaseListQuery } from "../api";

export interface ProductCategoryRef {
  id: string;
  name: string;
}

export interface ProductBrandRef {
  id: string;
  name: string;
}

export interface ProductUnitRef {
  id: string;
  name: string;
  symbol: string;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  categoryId: string;
  category: ProductCategoryRef;
  brandId: string | null;
  brand: ProductBrandRef | null;
  unitId: string;
  unit: ProductUnitRef;
  /** Purchase price in IDR. */
  purchasePrice: number;
  /** Selling price in IDR. */
  sellingPrice: number;
  image: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListQuery extends BaseListQuery {
  categoryId?: string;
  brandId?: string;
  unitId?: string;
  isActive?: boolean;
}

export interface CreateProductInput {
  sku: string;
  barcode?: string | null;
  name: string;
  description?: string | null;
  categoryId: string;
  brandId?: string | null;
  unitId: string;
  purchasePrice: number;
  sellingPrice: number;
  isActive?: boolean;
}

export type UpdateProductInput = Partial<CreateProductInput>;

/** Product reference returned by a successful barcode verification. */
export interface BarcodeCheckProduct {
  id: string;
  name: string;
  sku: string;
  /** Always a string so leading zeros from a scan are never lost. */
  barcode: string;
  categoryName: string;
  brandName: string | null;
  unitName: string;
  unitSymbol: string;
  /** Remaining stock across every batch (physical truth, expired included). */
  stock: number;
  isActive: boolean;
}

/**
 * Response for `GET /api/products/barcode/:barcode`.
 * `exists=false` means the barcode is safe to prefill on the create form;
 * a request failure is a transport/HTTP error, never this shape.
 */
export interface BarcodeCheckResponse {
  success: true;
  exists: boolean;
  data: BarcodeCheckProduct | null;
}
