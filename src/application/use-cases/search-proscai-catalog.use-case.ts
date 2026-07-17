import { RecordMetadata } from "@pinecone-database/pinecone";
import { ParsedCatalogSearchQuery } from "../../domain/entities/catalog-search-query.entity";
import {
  CatalogVectorSearchRankingService,
  RankedCatalogVectorMatch,
} from "../services/catalog-vector-search-ranking.service";
import { TechnicalCatalogQueryParserService } from "../services/technical-catalog-query-parser.service";
import { PineconeCatalogV2Service } from "../../infraestructure/services/pinecone-catalog-v2.service";
import { VoyageCatalogEmbeddingService } from "../../infraestructure/services/voyage-catalog-embedding.service";
import {
  ProductAvailability,
  ProductAvailabilityLookupStatus,
  ProductAvailabilityService,
} from "../../domain/services/product-availability-service";

export interface SearchProscaiCatalogInput {
  query: string;
  candidateTopK: number;
  limit: number;
  filters: Record<string, string>;
  includeAvailability?: boolean;
}

export type SearchProscaiCatalogMatch = RankedCatalogVectorMatch;

export interface SearchProscaiCatalogResult {
  parsedQuery: ParsedCatalogSearchQuery;
  matches: SearchProscaiCatalogMatch[];
  availabilityStatus: ProductAvailabilityLookupStatus;
  availabilityByEan: Map<string, ProductAvailability>;
  availabilityError: string | null;
}

export interface SearchProscaiCatalogSemanticResult {
  matches: SearchProscaiCatalogMatch[];
  availabilityStatus: ProductAvailabilityLookupStatus;
  availabilityByEan: Map<string, ProductAvailability>;
  availabilityError: string | null;
}

export class SearchProscaiCatalogUseCase {
  constructor(
    private readonly embeddingService: VoyageCatalogEmbeddingService,
    private readonly pineconeService: PineconeCatalogV2Service,
    private readonly productAvailabilityService?: ProductAvailabilityService,
  ) {}

  public async execute(input: SearchProscaiCatalogInput): Promise<SearchProscaiCatalogResult> {
    const parsedQuery = TechnicalCatalogQueryParserService.parse(input.query);
    const vector = await this.embeddingService.embedQuery(input.query);
    const matches = await this.pineconeService.query(vector, input.candidateTopK, input.filters);

    const rankedMatches = CatalogVectorSearchRankingService.rank(matches, parsedQuery).slice(0, input.limit);
    const availability = await this.resolveAvailability(rankedMatches, Boolean(input.includeAvailability));

    return {
      parsedQuery,
      matches: rankedMatches,
      ...availability,
    };
  }

  public async executeSemantic(
    input: SearchProscaiCatalogInput,
  ): Promise<SearchProscaiCatalogSemanticResult> {
    const vector = await this.embeddingService.embedQuery(input.query);
    const matches = await this.pineconeService.query(vector, input.candidateTopK, input.filters);
    const semanticMatches = CatalogVectorSearchRankingService
      .rankSemantic(matches)
      .slice(0, input.limit);
    const availability = await this.resolveAvailability(
      semanticMatches,
      Boolean(input.includeAvailability),
    );

    return {
      matches: semanticMatches,
      ...availability,
    };
  }

  private async resolveAvailability(
    matches: SearchProscaiCatalogMatch[],
    includeAvailability: boolean,
  ): Promise<{
    availabilityStatus: ProductAvailabilityLookupStatus;
    availabilityByEan: Map<string, ProductAvailability>;
    availabilityError: string | null;
  }> {
    if (!includeAvailability) {
      return {
        availabilityStatus: "not_requested",
        availabilityByEan: new Map(),
        availabilityError: null,
      };
    }

    if (!this.productAvailabilityService?.isEnabled()) {
      return {
        availabilityStatus: "disabled",
        availabilityByEan: new Map(),
        availabilityError: null,
      };
    }

    try {
      const eans = Array.from(new Set(matches.map((match) => match.ean).filter(Boolean)));
      const products = await this.productAvailabilityService.findByEans(eans);
      return {
        availabilityStatus: "resolved",
        availabilityByEan: new Map(products.map((product) => [product.ean, product])),
        availabilityError: null,
      };
    } catch (error) {
      return {
        availabilityStatus: "unavailable",
        availabilityByEan: new Map(),
        availabilityError: error instanceof Error ? error.message : "ERP availability service failed.",
      };
    }
  }
}
