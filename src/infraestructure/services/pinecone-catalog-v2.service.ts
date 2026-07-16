import { Index, Pinecone, RecordMetadata } from "@pinecone-database/pinecone";
import { CatalogVector } from "../../domain/entities/catalog-vector.entity";
import { CatalogVariantVector } from "../../domain/entities/catalog-variant-vector.entity";
import { envs } from "../../config/envs";

export class PineconeCatalogV2Service {
  private readonly index: Index<RecordMetadata>;
  public readonly namespace: string;

  constructor(namespace = "") {
    const client = new Pinecone({ apiKey: envs.PINECONE_API_KEY });
    const index = client.Index<RecordMetadata>(envs.PINECONE_CATALOG_V2_INDEX);
    this.namespace = namespace;
    this.index = namespace ? index.namespace(namespace) : index;
  }

  public async upsertVariants(vectors: CatalogVariantVector[]): Promise<void> {
    if (vectors.length === 0) return;

    await this.index.upsert(
      vectors.map((vector) => ({
        id: vector.id,
        values: vector.values,
        metadata: vector.metadata as unknown as RecordMetadata,
      })),
    );
  }

  public async upsert(vectors: CatalogVector[]): Promise<void> {
    if (vectors.length === 0) return;

    await this.index.upsert(
      vectors.map((vector) => ({
        id: vector.id,
        values: vector.values,
        metadata: vector.metadata as unknown as RecordMetadata,
      })),
    );
  }

  public async findMetadata(ids: string[]): Promise<Map<string, RecordMetadata>> {
    if (ids.length === 0) return new Map();

    const result = await this.index.fetch(ids);
    const records = result.records ?? {};

    return new Map(
      Object.entries(records).map(([id, record]) => [id, record.metadata ?? {}]),
    );
  }

  public async query(
    vector: number[],
    topK: number,
    filter?: Record<string, string>,
  ) {
    const result = await this.index.query({
      vector,
      topK,
      includeMetadata: true,
      includeValues: false,
      ...(filter && Object.keys(filter).length > 0 ? { filter } : {}),
    });

    return result.matches ?? [];
  }

  public async listIds(prefix = ""): Promise<string[]> {
    const ids: string[] = [];
    let paginationToken: string | undefined;

    do {
      const result = await this.index.listPaginated({
        prefix,
        limit: 100,
        ...(paginationToken ? { paginationToken } : {}),
      });

      for (const vector of result.vectors ?? []) {
        if (vector.id) ids.push(vector.id);
      }
      paginationToken = result.pagination?.next;
    } while (paginationToken);

    return ids;
  }

  public async deleteIds(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.index.deleteMany(ids);
  }
}
