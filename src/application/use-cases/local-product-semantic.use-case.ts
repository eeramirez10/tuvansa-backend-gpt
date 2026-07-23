import { LocalProductVectorEntity, LocalProductVectorMatch } from "../../domain/entities/local-product-vector.entity";
import { PineconeCatalogV2Service } from "../../infraestructure/services/pinecone-catalog-v2.service";
import { VoyageCatalogEmbeddingService } from "../../infraestructure/services/voyage-catalog-embedding.service";

export class LocalProductSemanticUseCase {
  private readonly searchCacheTtlMs = 30_000;
  private readonly searchCache = new Map<
    string,
    { expiresAt: number; items: LocalProductVectorMatch[] }
  >();
  private readonly searchesInFlight = new Map<string, Promise<LocalProductVectorMatch[]>>();

  constructor(
    private readonly embeddingService: VoyageCatalogEmbeddingService,
    private readonly pineconeService: PineconeCatalogV2Service,
  ) {}

  public async search(description: string, unit: string, topK: number): Promise<LocalProductVectorMatch[]> {
    const cacheKey = JSON.stringify([
      LocalProductVectorEntity.canonicalize(description),
      LocalProductVectorEntity.canonicalize(unit),
      topK,
    ]);
    const cached = this.searchCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.items;

    const pending = this.searchesInFlight.get(cacheKey);
    if (pending) return pending;

    const request = this.executeSearch(description, unit, topK)
      .then((items) => {
        this.searchCache.set(cacheKey, {
          expiresAt: Date.now() + this.searchCacheTtlMs,
          items,
        });
        return items;
      })
      .finally(() => {
        this.searchesInFlight.delete(cacheKey);
      });
    this.searchesInFlight.set(cacheKey, request);
    return request;
  }

  private async executeSearch(
    description: string,
    unit: string,
    topK: number,
  ): Promise<LocalProductVectorMatch[]> {
    const query = LocalProductVectorEntity.embeddingText(description, unit);
    const vector = await this.embeddingService.embedQuery(query);
    const matches = await this.pineconeService.query(vector, topK, { source: "LOCAL_TEMP" });

    return matches.flatMap((match) => {
      const metadata = match.metadata as Record<string, unknown> | undefined;
      const productId = this.readString(metadata, "productId");
      const candidateDescription = this.readString(metadata, "description");
      const candidateUnit = this.readString(metadata, "unit");
      if (!productId || !candidateDescription || !candidateUnit) return [];

      return [{
        productId,
        score: typeof match.score === "number" ? match.score : 0,
        metadata: {
          source: "LOCAL_TEMP" as const,
          productId,
          description: candidateDescription,
          unit: candidateUnit,
          branchId: this.readString(metadata, "branchId") ?? undefined,
        },
      }];
    });
  }

  public async upsert(input: {
    productId: string;
    description: string;
    unit: string;
    branchId?: string | null;
  }): Promise<void> {
    const metadata = LocalProductVectorEntity.metadata(input);
    const text = LocalProductVectorEntity.embeddingText(metadata.description, metadata.unit);
    const values = await this.embeddingService.embedDocument(text);

    await this.pineconeService.upsertRecords([{
      id: LocalProductVectorEntity.vectorId(metadata.productId),
      values,
      metadata: metadata as unknown as Record<string, unknown>,
    }]);
    this.searchCache.clear();
  }

  public async upsertMany(inputs: Array<{
    productId: string;
    description: string;
    unit: string;
    branchId?: string | null;
  }>): Promise<void> {
    if (inputs.length === 0) return;
    const records = inputs.map((input) => {
      const metadata = LocalProductVectorEntity.metadata(input);
      return {
        id: LocalProductVectorEntity.vectorId(metadata.productId),
        text: LocalProductVectorEntity.embeddingText(metadata.description, metadata.unit),
        metadata,
      };
    });
    const embeddings = await this.embeddingService.embedDocuments(records.map((record) => record.text));

    await this.pineconeService.upsertRecords(records.map((record, index) => ({
      id: record.id,
      values: embeddings[index],
      metadata: record.metadata as unknown as Record<string, unknown>,
    })));
    this.searchCache.clear();
  }

  public async delete(productId: string): Promise<void> {
    await this.pineconeService.deleteIds([LocalProductVectorEntity.vectorId(productId)]);
    this.searchCache.clear();
  }

  private readString(metadata: Record<string, unknown> | undefined, key: string): string | null {
    const value = metadata?.[key];
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }
}
