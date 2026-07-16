import { ProscaiCatalogSourceRow } from "../datasource/proscai-catalog.datasource";
import { ProscaiCatalogProduct } from "../../domain/entities/catalog-vector.entity";

export interface ProscaiCatalogEligibility {
  eligible: boolean;
  reason?: string;
}

export class ProscaiCatalogEligibilityService {
  public static evaluate(product: ProscaiCatalogSourceRow): ProscaiCatalogEligibility {
    const description = (product.description2.trim() || product.description1.trim()).toUpperCase();

    if (description.includes("OBSOLETO")) {
      return {
        eligible: false,
        reason: "Descripcion marcada como obsoleta",
      };
    }

    if (/^(FAMILIA\s+DE|LINEA\s+DE\s+TUBO)\b/.test(description)) {
      return {
        eligible: false,
        reason: "Registro de familia o linea comercial, no producto vendible",
      };
    }

    if (/\bDE\s*\.$/.test(description)) {
      return {
        eligible: false,
        reason: "Descripcion tecnica incompleta",
      };
    }

    return { eligible: true };
  }

  public static evaluateNormalized(_product: ProscaiCatalogProduct): ProscaiCatalogEligibility {
    return { eligible: true };
  }
}
