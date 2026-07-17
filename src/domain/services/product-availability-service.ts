export type ProductAvailabilityCurrency = "MXN" | "USD";
export type ProductAvailabilityLookupStatus = "not_requested" | "resolved" | "unavailable" | "disabled";

export interface ProductAvailabilityCosts {
  average: number;
  last: number;
  currency: ProductAvailabilityCurrency;
}

export interface ProductBranchAvailability {
  branchCode: string;
  branchName: string;
  stock: number;
  available: boolean;
}

export interface ProductCodeAvailability {
  icod: string;
  homeBranchCode: string | null;
  homeBranchName: string | null;
  description: string;
  unit: string;
  costs: ProductAvailabilityCosts;
  totalStock: number;
  availableInAnyBranch: boolean;
  branches: ProductBranchAvailability[];
}

export interface ProductAvailability {
  ean: string;
  productCode: string;
  sourceProductCodes: string[];
  hasMultipleProductCodes: boolean;
  description: string;
  unit: string;
  costs: ProductAvailabilityCosts;
  totalStock: number;
  availableInAnyBranch: boolean;
  branches: ProductBranchAvailability[];
  codes: ProductCodeAvailability[];
}

export abstract class ProductAvailabilityService {
  public abstract isEnabled(): boolean;
  public abstract findByEans(eans: string[]): Promise<ProductAvailability[]>;
}
