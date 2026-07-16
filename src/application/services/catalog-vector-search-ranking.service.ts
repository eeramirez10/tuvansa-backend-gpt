import { RecordMetadata } from "@pinecone-database/pinecone";

import { ParsedCatalogSearchQuery } from "../../domain/entities/catalog-search-query.entity";
import { CatalogRankingStrategy } from "./catalog-ranking/catalog-ranking.types";
import { FittingCatalogRankingStrategy } from "./catalog-ranking/fitting-catalog-ranking.strategy";
import { FlangeCatalogRankingStrategy } from "./catalog-ranking/flange-catalog-ranking.strategy";
import { GenericCatalogRankingStrategy } from "./catalog-ranking/generic-catalog-ranking.strategy";
import { PipeCatalogRankingStrategy } from "./catalog-ranking/pipe-catalog-ranking.strategy";
import { ValveCatalogRankingStrategy } from "./catalog-ranking/valve-catalog-ranking.strategy";

export interface CatalogVectorSearchCandidate {
  id: string;
  score?: number;
  metadata?: RecordMetadata;
}

export interface RankedCatalogVectorMatch {
  id: string;
  ean: string;
  metadata: RecordMetadata;
  semanticSimilarity: number;
  finalSimilarity: number;
  confidence: "high" | "medium" | "low";
  rankingStrategy: string;
  reasons: string[];
}

export class CatalogVectorSearchRankingService {
  private static readonly strategies: CatalogRankingStrategy[] = [
    new PipeCatalogRankingStrategy(),
    new FittingCatalogRankingStrategy(),
    new ValveCatalogRankingStrategy(),
    new FlangeCatalogRankingStrategy(),
    new GenericCatalogRankingStrategy(),
  ];

  public static rank(
    matches: CatalogVectorSearchCandidate[],
    query: ParsedCatalogSearchQuery,
  ): RankedCatalogVectorMatch[] {
    const bestByEan = new Map<string, RankedCatalogVectorMatch>();

    for (const match of matches) {
      const metadata = match.metadata ?? {};
      const ean = this.readValue(metadata.ean) ?? match.id;
      if (!ean) continue;

      const strategy = this.strategies.find((candidate) => candidate.supports(query, metadata))
        ?? this.strategies[this.strategies.length - 1];
      const semanticSimilarity = this.normalizeSemanticScore(match.score);
      const rerank = strategy.score(query, metadata);
      const ruleBoost = Math.min(0.2, rerank.bonus);
      const finalSimilarity = Math.max(
        0,
        Math.min(
          0.9999,
          semanticSimilarity + ruleBoost * (1 - semanticSimilarity) - rerank.penalty,
        ),
      );
      const candidate: RankedCatalogVectorMatch = {
        id: match.id,
        ean,
        metadata,
        semanticSimilarity,
        finalSimilarity,
        confidence: this.resolveConfidence(finalSimilarity),
        rankingStrategy: strategy.name,
        reasons: rerank.reasons.length > 0 ? rerank.reasons : ["semantic similarity"],
      };
      const previous = bestByEan.get(ean);

      if (!previous || candidate.finalSimilarity > previous.finalSimilarity) {
        bestByEan.set(ean, candidate);
      }
    }

    return Array.from(bestByEan.values())
      .sort((first, second) => second.finalSimilarity - first.finalSimilarity);
  }

  private static readValue(value: unknown): string | undefined {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }

  private static normalizeSemanticScore(score?: number): number {
    if (!Number.isFinite(score)) return 0;
    if (score! >= 0 && score! <= 1) return score!;
    return score! > 1 ? score! / (score! + 1) : 0;
  }

  private static resolveConfidence(score: number): "high" | "medium" | "low" {
    if (score >= 0.86) return "high";
    if (score >= 0.75) return "medium";
    return "low";
  }
}
