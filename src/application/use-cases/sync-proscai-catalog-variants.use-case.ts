import { CatalogVariantVectorDocumentMapper } from "../mappers/catalog-variant-vector-document.mapper";
import { CatalogVariantVector, CatalogVariantVectorDocument } from "../../domain/entities/catalog-variant-vector.entity";
import { BuildProscaiCatalogVariantsUseCase } from "./build-proscai-catalog-variants.use-case";
import { PineconeCatalogV2Service } from "../../infraestructure/services/pinecone-catalog-v2.service";
import { VoyageCatalogEmbeddingService } from "../../infraestructure/services/voyage-catalog-embedding.service";

export interface SyncCatalogVariantsInput {
  maxVariants?: number;
  dryRun?: boolean;
  deleteStale?: boolean;
  onProgress?: (result: SyncCatalogVariantsResult) => void;
}

export interface SyncCatalogVariantsResult {
  namespace: string;
  sourceUpdatedAt?: string;
  totalVariants: number;
  eligible: number;
  reviewVariants: number;
  excludedInactive: number;
  unchanged: number;
  changed: number;
  embedded: number;
  upserted: number;
  stale: number;
  deleted: number;
  dryRun: boolean;
  fullReconciliation: boolean;
}

export class SyncProscaiCatalogVariantsUseCase {
  private static readonly DOCUMENT_BATCH_SIZE = 500;
  private static readonly METADATA_FETCH_BATCH_SIZE = 50;
  private static readonly VECTOR_BATCH_SIZE = 32;
  private static readonly DELETE_BATCH_SIZE = 500;
  private static readonly MAX_ATTEMPTS = 6;

  constructor(
    private readonly buildVariantsUseCase: BuildProscaiCatalogVariantsUseCase,
    private readonly embeddingService: VoyageCatalogEmbeddingService,
    private readonly pineconeService: PineconeCatalogV2Service,
    private readonly embeddingModel: string,
  ) {}

  public async execute(input: SyncCatalogVariantsInput = {}): Promise<SyncCatalogVariantsResult> {
    const projection = await this.buildVariantsUseCase.execute(true);
    const activeVariants = projection.variants.filter((variant) => {
      const canonical = variant.sourceRecords.find((record) => record.icod === variant.canonicalIcod);
      return canonical?.isActive ?? false;
    });
    const maxVariants = input.maxVariants ?? Number.POSITIVE_INFINITY;
    const selectedVariants = activeVariants.slice(0, maxVariants);
    const fullReconciliation = !Number.isFinite(maxVariants) && input.deleteStale !== false;
    const documents = selectedVariants.map((variant) => (
      CatalogVariantVectorDocumentMapper.toDocument(variant, this.embeddingModel)
    ));
    const result: SyncCatalogVariantsResult = {
      namespace: this.pineconeService.namespace,
      sourceUpdatedAt: projection.sourceUpdatedAt,
      totalVariants: projection.variants.length,
      eligible: activeVariants.length,
      reviewVariants: activeVariants.filter((variant) => variant.status === "REVIEW").length,
      excludedInactive: projection.variants.length - activeVariants.length,
      unchanged: 0,
      changed: 0,
      embedded: 0,
      upserted: 0,
      stale: 0,
      deleted: 0,
      dryRun: input.dryRun === true,
      fullReconciliation,
    };
    const indexedIds = await this.withRetry(() => this.pineconeService.listIds("proscai-"));
    const indexedIdSet = new Set(indexedIds);

    for (const documentBatch of this.chunk(documents, SyncProscaiCatalogVariantsUseCase.DOCUMENT_BATCH_SIZE)) {
      const existingMetadata = new Map<string, any>();
      const idsToFetch = documentBatch
        .map((document) => document.id)
        .filter((id) => indexedIdSet.has(id));

      for (const ids of this.chunk(idsToFetch, SyncProscaiCatalogVariantsUseCase.METADATA_FETCH_BATCH_SIZE)) {
        const metadata = await this.withRetry(() => this.pineconeService.findMetadata(ids));
        for (const [id, value] of metadata) existingMetadata.set(id, value);
      }

      const changedDocuments = documentBatch.filter((document) => {
        const existing = existingMetadata.get(document.id);
        const unchanged = existing?.contentHash === document.metadata.contentHash
          && existing.embeddingModel === document.metadata.embeddingModel;

        if (unchanged) result.unchanged += 1;
        return !unchanged;
      });
      result.changed += changedDocuments.length;

      if (!result.dryRun) {
        await this.embedAndUpsert(changedDocuments, result, input.onProgress);
      }
      input.onProgress?.({ ...result });
    }

    if (fullReconciliation) {
      const currentIds = new Set(activeVariants.map((variant) => variant.variantId));
      const staleIds = indexedIds.filter((id) => !currentIds.has(id));
      result.stale = staleIds.length;

      if (!result.dryRun) {
        for (const batch of this.chunk(staleIds, SyncProscaiCatalogVariantsUseCase.DELETE_BATCH_SIZE)) {
          await this.withRetry(() => this.pineconeService.deleteIds(batch));
          result.deleted += batch.length;
          input.onProgress?.({ ...result });
        }
      }
    }

    input.onProgress?.({ ...result });
    return result;
  }

  private async embedAndUpsert(
    documents: CatalogVariantVectorDocument[],
    result: SyncCatalogVariantsResult,
    onProgress?: (result: SyncCatalogVariantsResult) => void,
  ): Promise<void> {
    for (const batch of this.chunk(documents, SyncProscaiCatalogVariantsUseCase.VECTOR_BATCH_SIZE)) {
      const embeddings = await this.withRetry(() => (
        this.embeddingService.embedDocuments(batch.map((document) => document.text))
      ));
      const vectors: CatalogVariantVector[] = batch.map((document, index) => ({
        id: document.id,
        values: embeddings[index],
        metadata: document.metadata,
      }));

      await this.withRetry(() => this.pineconeService.upsertVariants(vectors));
      result.embedded += vectors.length;
      result.upserted += vectors.length;
      onProgress?.({ ...result });
    }
  }

  private chunk<T>(items: T[], size: number): T[][] {
    const batches: T[][] = [];
    for (let index = 0; index < items.length; index += size) {
      batches.push(items.slice(index, index + size));
    }
    return batches;
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= SyncProscaiCatalogVariantsUseCase.MAX_ATTEMPTS; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt < SyncProscaiCatalogVariantsUseCase.MAX_ATTEMPTS) {
          const retryDelayMs = this.isRateLimitError(error)
            ? 60_000
            : attempt * 1_000;

          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
      }
    }

    throw lastError;
  }

  private isRateLimitError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);

    return message.includes('429') || message.toLowerCase().includes('rate limit');
  }
}
