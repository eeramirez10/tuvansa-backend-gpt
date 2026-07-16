import { CatalogVectorDocumentMapper } from "../mappers/catalog-vector-document.mapper";
import {
  ProscaiCatalogCursor,
  ProscaiCatalogDatasource,
  ProscaiCatalogScope,
} from "../../infraestructure/datasource/proscai-catalog.datasource";
import { CatalogVector, CatalogVectorDocument } from "../../domain/entities/catalog-vector.entity";
import { PineconeCatalogV2Service } from "../../infraestructure/services/pinecone-catalog-v2.service";
import { ProscaiCatalogEligibilityService } from "../../infraestructure/services/proscai-catalog-eligibility.service";
import { ProscaiProductAnalysisService } from "../../infraestructure/services/proscai-product-analysis.service";
import { VoyageCatalogEmbeddingService } from "../../infraestructure/services/voyage-catalog-embedding.service";

export interface IndexProscaiCatalogInput {
  scope: ProscaiCatalogScope;
  maxProducts?: number;
  onProgress?: (result: IndexProscaiCatalogResult) => void;
}

export interface IndexProscaiCatalogResult {
  scope: ProscaiCatalogScope;
  scanned: number;
  eligible: number;
  excluded: number;
  unchanged: number;
  embedded: number;
  upserted: number;
}

export class IndexProscaiCatalogUseCase {
  private static readonly SOURCE_PAGE_SIZE = 250;
  private static readonly VECTOR_BATCH_SIZE = 64;
  private static readonly MAX_ATTEMPTS = 3;

  constructor(
    private readonly datasource: ProscaiCatalogDatasource,
    private readonly productAnalysisService: ProscaiProductAnalysisService,
    private readonly embeddingService: VoyageCatalogEmbeddingService,
    private readonly pineconeService: PineconeCatalogV2Service,
    private readonly embeddingModel: string,
  ) {}

  public async execute(input: IndexProscaiCatalogInput): Promise<IndexProscaiCatalogResult> {
    const result: IndexProscaiCatalogResult = {
      scope: input.scope,
      scanned: 0,
      eligible: 0,
      excluded: 0,
      unchanged: 0,
      embedded: 0,
      upserted: 0,
    };
    const maxProducts = input.maxProducts ?? Number.POSITIVE_INFINITY;
    let cursor: ProscaiCatalogCursor | undefined;

    do {
      const remaining = maxProducts - result.eligible;
      if (remaining <= 0) break;

      const page = await this.withRetry(() =>
        this.datasource.findPage(
          cursor,
          Math.min(IndexProscaiCatalogUseCase.SOURCE_PAGE_SIZE, remaining),
          input.scope,
        ),
      );
      result.scanned += page.items.length;

      const documents: CatalogVectorDocument[] = [];
      for (const sourceProduct of page.items) {
        if (!ProscaiCatalogEligibilityService.evaluate(sourceProduct).eligible) {
          result.excluded += 1;
          continue;
        }

        const product = this.productAnalysisService.normalizeCatalogProduct(sourceProduct);
        if (!ProscaiCatalogEligibilityService.evaluateNormalized(product).eligible) {
          result.excluded += 1;
          continue;
        }

        documents.push(CatalogVectorDocumentMapper.toDocument(product, this.embeddingModel));
      }
      result.eligible += documents.length;

      const existingMetadata = await this.withRetry(() =>
        this.pineconeService.findMetadata(documents.map((document) => document.id)),
      );
      const documentsToIndex = documents.filter((document) => {
        const existing = existingMetadata.get(document.id);
        const unchanged = existing?.contentHash === document.metadata.contentHash
          && existing.embeddingModel === document.metadata.embeddingModel;

        if (unchanged) result.unchanged += 1;
        return !unchanged;
      });

      for (const batch of this.chunk(documentsToIndex, IndexProscaiCatalogUseCase.VECTOR_BATCH_SIZE)) {
        const embeddings = await this.withRetry(() =>
          this.embeddingService.embedDocuments(batch.map((document) => document.text)),
        );
        const vectors: CatalogVector[] = batch.map((document, index) => ({
          id: document.id,
          values: embeddings[index],
          metadata: document.metadata,
        }));

        await this.withRetry(() => this.pineconeService.upsert(vectors));
        result.embedded += vectors.length;
        result.upserted += vectors.length;
        input.onProgress?.({ ...result });
      }

      cursor = page.nextCursor;
      input.onProgress?.({ ...result });
    } while (cursor);

    return result;
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

    for (let attempt = 1; attempt <= IndexProscaiCatalogUseCase.MAX_ATTEMPTS; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt < IndexProscaiCatalogUseCase.MAX_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 500));
        }
      }
    }

    throw lastError;
  }
}
