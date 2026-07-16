import { createHash } from "node:crypto";
import {
  CatalogVectorDocument,
  CatalogVectorMetadata,
  ProscaiCatalogProduct,
} from "../../domain/entities/catalog-vector.entity";

export class CatalogVectorDocumentMapper {
  private static readonly EMBEDDING_TEMPLATE_VERSION = "3";

  public static toDocument(
    product: ProscaiCatalogProduct,
    embeddingModel: string,
  ): CatalogVectorDocument {
    const ean = this.requireValue(product.ean, "EAN");
    const icod = this.requireValue(product.icod, "ICOD");
    const originalDescription = this.requireValue(
      product.originalDescription,
      "descripcion original",
    );
    const normalizedDescription = this.requireValue(
      product.normalizedDescription,
      "descripcion normalizada",
    );

    const metadata: CatalogVectorMetadata = {
      ean,
      icod,
      originalDescription,
      normalizedDescription,
      isActive: product.isActive,
      contentHash: this.createContentHash(product),
      embeddingModel,
      ...this.optionalMetadata("category", product.category),
      ...this.optionalMetadata("subcategory", product.subcategory),
      ...this.optionalMetadata("categoryBucket", product.categoryBucket),
      ...this.optionalMetadata("product", product.product),
      ...this.optionalMetadata("tipo", product.tipo),
      ...this.optionalMetadata("subtipo", product.subtipo),
      ...this.optionalMetadata("material", product.material),
      ...this.optionalMetadata("diameter", product.diameter),
      ...this.optionalMetadata("ced", product.ced),
      ...this.optionalMetadata("termino", product.termino),
      ...this.optionalMetadata("costura", product.costura),
      ...this.optionalMetadata("acabado", product.acabado),
      ...this.optionalMetadata("figura", product.figura),
      ...this.optionalMetadata("radio", product.radio),
      ...this.optionalMetadata("angulo", product.angulo),
      ...this.optionalMetadata("grado", product.grado),
      ...this.optionalMetadata("presion", product.presion),
      ...this.optionalMetadata("unit", product.unit),
      ...this.optionalMetadata("sourceUpdatedAt", product.sourceUpdatedAt),
    };

    return {
      id: ean,
      text: this.buildEmbeddingText(metadata),
      metadata,
    };
  }

  private static buildEmbeddingText(metadata: CatalogVectorMetadata): string {
    const sections = [
      this.formatSection("Categoria", metadata.category),
      this.formatSection("Subcategoria", metadata.subcategory),
      this.formatSection("Producto", metadata.product),
      this.formatSection("Descripcion", metadata.normalizedDescription),
      this.formatSection("Descripcion original Proscai", metadata.originalDescription),
      this.formatSection("Unidad comercial", metadata.unit),
      this.formatSection("Material", metadata.material),
      this.formatSection("Diametro", metadata.diameter),
      this.formatSection("Cedula", metadata.ced),
      this.formatSection("Terminacion", metadata.termino),
      this.formatSection("Costura", metadata.costura),
      this.formatSection("Angulo", metadata.angulo),
      this.formatSection("Radio", metadata.radio),
      this.formatSection("Acabado", metadata.acabado),
      this.formatSection("Grado", metadata.grado),
      this.formatSection("Presion", metadata.presion),
      this.formatSection("Tipo", metadata.tipo),
      this.formatSection("Subtipo", metadata.subtipo),
    ];

    return sections.filter((section): section is string => Boolean(section)).join(". ");
  }

  private static createContentHash(product: ProscaiCatalogProduct): string {
    const content = [
      CatalogVectorDocumentMapper.EMBEDDING_TEMPLATE_VERSION,
      product.ean,
      product.icod,
      product.normalizedDescription,
      product.category,
      product.subcategory,
      product.categoryBucket,
      product.product,
      product.tipo,
      product.subtipo,
      product.material,
      product.diameter,
      product.ced,
      product.termino,
      product.costura,
      product.acabado,
      product.figura,
      product.radio,
      product.angulo,
      product.grado,
      product.presion,
      product.unit,
      product.isActive,
    ]
      .map((value) => this.normalizeValue(value))
      .join("|");

    return createHash("sha256").update(content).digest("hex");
  }

  private static formatSection(label: string, value?: string): string | undefined {
    const normalizedValue = this.normalizeValue(value);
    return normalizedValue ? `${label}: ${normalizedValue}` : undefined;
  }

  private static optionalMetadata(
    key: string,
    value?: string,
  ): Record<string, string> {
    const normalizedValue = this.normalizeValue(value);
    return normalizedValue ? { [key]: normalizedValue } : {};
  }

  private static requireValue(value: string, fieldName: string): string {
    const normalizedValue = this.normalizeValue(value);

    if (!normalizedValue) {
      throw new Error(`Producto Proscai sin ${fieldName}.`);
    }

    return normalizedValue;
  }

  private static normalizeValue(value?: string | boolean): string {
    if (typeof value === "boolean") {
      return String(value);
    }

    return (value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }
}
