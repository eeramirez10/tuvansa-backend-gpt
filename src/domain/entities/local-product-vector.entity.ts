export interface LocalProductVectorMetadata {
  source: "LOCAL_TEMP";
  productId: string;
  description: string;
  unit: string;
  branchId?: string;
}

export interface LocalProductVectorMatch {
  productId: string;
  score: number;
  metadata: LocalProductVectorMetadata;
}

export class LocalProductVectorEntity {
  public static vectorId(productId: string): string {
    return `local:${productId.trim()}`;
  }

  public static embeddingText(description: string, unit: string): string {
    return [
      "Producto local pendiente de alta en ERP",
      `Descripcion: ${this.normalize(description)}`,
      `Unidad: ${this.normalize(unit)}`,
    ].join(". ");
  }

  public static metadata(input: {
    productId: string;
    description: string;
    unit: string;
    branchId?: string | null;
  }): LocalProductVectorMetadata {
    const branchId = input.branchId?.trim();
    return {
      source: "LOCAL_TEMP",
      productId: input.productId.trim(),
      description: this.normalize(input.description),
      unit: this.normalize(input.unit),
      ...(branchId ? { branchId } : {}),
    };
  }

  private static normalize(value: string): string {
    return value.trim().replace(/\s+/g, " ").toUpperCase();
  }
}
