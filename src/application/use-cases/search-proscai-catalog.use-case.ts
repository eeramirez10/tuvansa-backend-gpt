import { RecordMetadata } from "@pinecone-database/pinecone";
import { ParsedCatalogSearchQuery } from "../../domain/entities/catalog-search-query.entity";
import {
  CatalogVectorSearchRankingService,
  RankedCatalogVectorMatch,
} from "../services/catalog-vector-search-ranking.service";
import { TechnicalCatalogQueryParserService } from "../services/technical-catalog-query-parser.service";
import { PineconeCatalogV2Service } from "../../infraestructure/services/pinecone-catalog-v2.service";
import { VoyageCatalogEmbeddingService } from "../../infraestructure/services/voyage-catalog-embedding.service";

export interface SearchProscaiCatalogInput {
  query: string;
  candidateTopK: number;
  limit: number;
  filters: Record<string, string>;
}

export type SearchProscaiCatalogMatch = RankedCatalogVectorMatch;

export interface SearchProscaiCatalogResult {
  parsedQuery: ParsedCatalogSearchQuery;
  matches: SearchProscaiCatalogMatch[];
}

export class SearchProscaiCatalogUseCase {
  constructor(
    private readonly embeddingService: VoyageCatalogEmbeddingService,
    private readonly pineconeService: PineconeCatalogV2Service,
  ) {}

  public async execute(input: SearchProscaiCatalogInput): Promise<SearchProscaiCatalogResult> {
    const parsedQuery = TechnicalCatalogQueryParserService.parse(input.query);
    const vector = await this.embeddingService.embedQuery(input.query);
    const matches = await this.pineconeService.query(vector, input.candidateTopK, input.filters);

    return {
      parsedQuery,
      matches: CatalogVectorSearchRankingService.rank(matches, parsedQuery).slice(0, input.limit),
    };
  }
}
