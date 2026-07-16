export interface ProscaiCatalogProduct {
  ean: string;
  icod: string;
  originalDescription: string;
  normalizedDescription: string;
  category?: string;
  subcategory?: string;
  categoryBucket?: string;
  product?: string;
  tipo?: string;
  subtipo?: string;
  material?: string;
  diameter?: string;
  ced?: string;
  termino?: string;
  costura?: string;
  acabado?: string;
  figura?: string;
  radio?: string;
  angulo?: string;
  grado?: string;
  presion?: string;
  unit?: string;
  isActive: boolean;
  sourceUpdatedAt?: string;
}

export interface CatalogVectorMetadata {
  ean: string;
  icod: string;
  originalDescription: string;
  normalizedDescription: string;
  category?: string;
  subcategory?: string;
  categoryBucket?: string;
  product?: string;
  tipo?: string;
  subtipo?: string;
  material?: string;
  diameter?: string;
  ced?: string;
  termino?: string;
  costura?: string;
  acabado?: string;
  figura?: string;
  radio?: string;
  angulo?: string;
  grado?: string;
  presion?: string;
  unit?: string;
  isActive: boolean;
  sourceUpdatedAt?: string;
  contentHash: string;
  embeddingModel: string;
}

export interface CatalogVectorDocument {
  id: string;
  text: string;
  metadata: CatalogVectorMetadata;
}

export interface CatalogVector {
  id: string;
  values: number[];
  metadata: CatalogVectorMetadata;
}
