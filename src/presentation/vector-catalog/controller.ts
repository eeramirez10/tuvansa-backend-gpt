import { Request, Response } from "express";
import { CatalogIndexJobService } from "../../application/services/catalog-index-job.service";
import { CatalogSearchEvaluationJobService } from "../../application/services/catalog-search-evaluation-job.service";
import { CatalogVectorDocumentMapper } from "../../application/mappers/catalog-vector-document.mapper";
import { SearchProscaiCatalogUseCase } from "../../application/use-cases/search-proscai-catalog.use-case";
import {
  ProscaiCatalogDatasource,
  ProscaiCatalogScope,
} from "../../infraestructure/datasource/proscai-catalog.datasource";
import { ProscaiCatalogEligibilityService } from "../../infraestructure/services/proscai-catalog-eligibility.service";
import { PineconeCatalogV2Service } from "../../infraestructure/services/pinecone-catalog-v2.service";
import { ProscaiProductAnalysisService } from "../../infraestructure/services/proscai-product-analysis.service";
import { VoyageCatalogEmbeddingService } from "../../infraestructure/services/voyage-catalog-embedding.service";

export class VectorCatalogController {
  constructor(
    private readonly datasource: ProscaiCatalogDatasource,
    private readonly productAnalysisService: ProscaiProductAnalysisService,
    private readonly embeddingService: VoyageCatalogEmbeddingService,
    private readonly pineconeService: PineconeCatalogV2Service,
    private readonly embeddingModel: string,
    private readonly catalogIndexJobService: CatalogIndexJobService,
    private readonly searchCatalogUseCase: SearchProscaiCatalogUseCase,
    private readonly evaluationJobService: CatalogSearchEvaluationJobService,
  ) {}

  public preview = async (req: Request, res: Response): Promise<Response> => {
    try {
      const limit = this.readLimit(req.query.limit);
      const cursor = this.readCursor(req.query.afterEan, req.query.afterIcod);
      const scope = this.readScope(req.query.scope);
      const page = await this.datasource.findPage(cursor, limit, scope);

      const items = [];
      const excluded = [];

      for (const sourceProduct of page.items) {
        const eligibility = ProscaiCatalogEligibilityService.evaluate(sourceProduct);

        if (!eligibility.eligible) {
          excluded.push({
            ean: sourceProduct.ean,
            icod: sourceProduct.icod,
            description: sourceProduct.description2 || sourceProduct.description1,
            reason: eligibility.reason,
          });
          continue;
        }

        const product = this.productAnalysisService.normalizeCatalogProduct(sourceProduct);
        const normalizedEligibility = ProscaiCatalogEligibilityService.evaluateNormalized(product);

        if (!normalizedEligibility.eligible) {
          excluded.push({
            ean: sourceProduct.ean,
            icod: sourceProduct.icod,
            description: sourceProduct.description2 || sourceProduct.description1,
            reason: normalizedEligibility.reason,
          });
          continue;
        }

        items.push(CatalogVectorDocumentMapper.toDocument(product, this.embeddingModel));
      }

      return res.status(200).json({
        scope,
        scannedCount: page.items.length,
        count: items.length,
        excludedCount: excluded.length,
        nextCursor: page.nextCursor ?? null,
        items,
        excluded,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al previsualizar el catalogo vectorial.";
      return res.status(500).json({ error: message });
    }
  };

  public indexTest = async (req: Request, res: Response): Promise<Response> => {
    try {
      const ean = this.readEan(req.body?.ean);
      const sourceProduct = await this.datasource.findByEan(ean);

      if (!sourceProduct) {
        return res.status(404).json({ error: "Producto no encontrado en Proscai." });
      }

      const sourceEligibility = ProscaiCatalogEligibilityService.evaluate(sourceProduct);
      if (!sourceEligibility.eligible) {
        return res.status(400).json({ error: sourceEligibility.reason });
      }

      const product = this.productAnalysisService.normalizeCatalogProduct(sourceProduct);
      const normalizedEligibility = ProscaiCatalogEligibilityService.evaluateNormalized(product);
      if (!normalizedEligibility.eligible) {
        return res.status(400).json({ error: normalizedEligibility.reason });
      }

      if (product.category !== "TUBERIA") {
        return res.status(400).json({ error: "La prueba v2 actual solo permite productos de tuberia." });
      }

      const document = CatalogVectorDocumentMapper.toDocument(product, this.embeddingModel);
      const values = await this.embeddingService.embedDocument(document.text);

      await this.pineconeService.upsert([
        {
          id: document.id,
          values,
          metadata: document.metadata,
        },
      ]);

      return res.status(201).json({
        indexed: true,
        index: "proscai-catalog-v2",
        id: document.id,
        vectorDimensions: values.length,
        text: document.text,
        metadata: document.metadata,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al indexar el producto de prueba.";
      return res.status(500).json({ error: message });
    }
  };

  public index = async (req: Request, res: Response): Promise<Response> => {
    try {
      const scope = this.readIndexScope(req.body?.scope);
      const maxProducts = this.readOptionalLimit(req.body?.maxProducts);
      const job = this.catalogIndexJobService.start(scope, maxProducts);

      return res.status(202).json({
        index: "proscai-catalog-v2",
        job,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al indexar el catalogo vectorial.";
      return res.status(500).json({ error: message });
    }
  };

  public indexStatus = (_req: Request, res: Response): Response => {
    return res.status(200).json({
      index: "proscai-catalog-v2",
      job: this.catalogIndexJobService.getStatus(),
    });
  };

  public search = async (req: Request, res: Response): Promise<Response> => {
    const query = this.readSearchQuery(req.body?.query);

    if (!query) {
      return res.status(400).json({ error: "query es obligatorio." });
    }

    try {
      const topK = this.readSearchTopK(req.body?.topK);
      const filters = this.readSearchFilters(req.body?.filters);
      const branchCode = this.readBranchCode(req.body?.branchCode);
      const searchResult = await this.searchCatalogUseCase.execute({
        query,
        limit: topK,
        candidateTopK: this.readCandidateTopK(req.body?.candidateTopK, topK),
        filters,
        includeAvailability: true,
      });

      return res.status(200).json({
        index: "proscai-catalog-v2",
        query,
        branchCode,
        topK,
        filters,
        parsedQuery: searchResult.parsedQuery,
        availabilityStatus: searchResult.availabilityStatus,
        availabilityError: searchResult.availabilityError,
        itemsCount: searchResult.matches.length,
        items: searchResult.matches.map((match) => {
          const availability = searchResult.availabilityByEan.get(match.ean) ?? null;
          const requestedBranch = branchCode
            ? availability?.branches.find((branch) => branch.branchCode === branchCode) ?? null
            : null;

          return {
            ean: match.ean,
            productId: match.id,
            description: match.metadata.normalizedDescription ?? null,
            originalDescription: match.metadata.originalDescription ?? null,
            semanticSimilarity: this.roundSimilarity(match.semanticSimilarity),
            semanticSimilarityPercent: this.toPercent(match.semanticSimilarity),
            finalSimilarity: this.roundSimilarity(match.finalSimilarity),
            finalSimilarityPercent: this.toPercent(match.finalSimilarity),
            similarity: this.roundSimilarity(match.finalSimilarity),
            similarityPercent: this.toPercent(match.finalSimilarity),
            confidence: match.confidence,
            rankingStrategy: match.rankingStrategy,
            reasons: match.reasons,
            icod: match.metadata.canonicalIcod ?? match.metadata.icod ?? null,
            availabilityStatus: searchResult.availabilityStatus === "resolved"
              ? availability ? "resolved" : "not_found"
              : searchResult.availabilityStatus,
            availability: availability
              ? { ...availability, requestedBranch }
              : null,
            metadata: match.metadata,
          };
        }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al buscar en el catalogo vectorial.";
      return res.status(500).json({ error: message });
    }
  };

  public searchSemantic = async (req: Request, res: Response): Promise<Response> => {
    const query = this.readSearchQuery(req.body?.query);

    if (!query) {
      return res.status(400).json({ error: "query es obligatorio." });
    }

    try {
      const topK = this.readSearchTopK(req.body?.topK);
      const filters = this.readSearchFilters(req.body?.filters);
      const branchCode = this.readBranchCode(req.body?.branchCode);
      const searchResult = await this.searchCatalogUseCase.executeSemantic({
        query,
        limit: topK,
        candidateTopK: this.readCandidateTopK(req.body?.candidateTopK, topK),
        filters,
        includeAvailability: true,
      });

      return res.status(200).json({
        source: "proscai-catalog-v2-semantic",
        index: "proscai-catalog-v2",
        query,
        branchCode,
        topK,
        filters,
        rankingStrategy: "SEMANTIC_ONLY",
        availabilityStatus: searchResult.availabilityStatus,
        availabilityError: searchResult.availabilityError,
        itemsCount: searchResult.matches.length,
        items: searchResult.matches.map((match) => {
          const availability = searchResult.availabilityByEan.get(match.ean) ?? null;
          const requestedBranch = branchCode
            ? availability?.branches.find((branch) => branch.branchCode === branchCode) ?? null
            : null;

          return {
            ean: match.ean,
            productId: match.id,
            description: match.metadata.normalizedDescription ?? null,
            originalDescription: match.metadata.originalDescription ?? null,
            semanticSimilarity: this.roundSimilarity(match.semanticSimilarity),
            semanticSimilarityPercent: this.toPercent(match.semanticSimilarity),
            finalSimilarity: this.roundSimilarity(match.semanticSimilarity),
            finalSimilarityPercent: this.toPercent(match.semanticSimilarity),
            similarity: this.roundSimilarity(match.semanticSimilarity),
            similarityPercent: this.toPercent(match.semanticSimilarity),
            confidence: match.confidence,
            rankingStrategy: match.rankingStrategy,
            reasons: match.reasons,
            icod: match.metadata.canonicalIcod ?? match.metadata.icod ?? null,
            availabilityStatus: searchResult.availabilityStatus === "resolved"
              ? availability ? "resolved" : "not_found"
              : searchResult.availabilityStatus,
            availability: availability
              ? { ...availability, requestedBranch }
              : null,
            metadata: match.metadata,
          };
        }),
      });
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Error al buscar por similitud semantica pura.";
      return res.status(500).json({ error: message });
    }
  };

  public evaluationCases = (_req: Request, res: Response): Response => {
    const cases = this.evaluationJobService.listCases();

    return res.status(200).json({
      count: cases.length,
      items: cases,
    });
  };

  public startEvaluation = (req: Request, res: Response): Response => {
    try {
      const job = this.evaluationJobService.start({
        caseIds: this.readEvaluationCaseIds(req.body?.caseIds),
      });

      return res.status(202).json({
        message: "Evaluacion del buscador iniciada.",
        job,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al iniciar la evaluacion.";
      return res.status(400).json({ error: message });
    }
  };

  public evaluationStatus = (_req: Request, res: Response): Response => {
    return res.status(200).json({
      job: this.evaluationJobService.getStatus(),
    });
  };

  private readLimit(value: unknown): number {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 10;
    }

    return Math.min(Math.floor(parsed), 50);
  }

  private readEvaluationCaseIds(value: unknown): string[] | undefined {
    if (value === undefined || value === null) return undefined;
    if (!Array.isArray(value) || value.some((id) => typeof id !== "string")) {
      throw new Error("caseIds debe ser un arreglo de identificadores.");
    }

    return value.map((id) => id.trim()).filter(Boolean);
  }

  private readCursor(afterEan: unknown, afterIcod: unknown) {
    const ean = typeof afterEan === "string" ? afterEan.trim() : "";
    const icod = typeof afterIcod === "string" ? afterIcod.trim() : "";

    if (!ean && !icod) {
      return undefined;
    }

    if (!ean || !icod) {
      throw new Error("afterEan y afterIcod deben enviarse juntos.");
    }

    return { ean, icod };
  }

  private readScope(value: unknown): ProscaiCatalogScope {
    if (typeof value !== "string" || value.trim().length === 0) {
      return "ALL";
    }

    const scope = value.trim().toUpperCase();
    const allowedScopes: ProscaiCatalogScope[] = [
      "ALL",
      "TUBERIA",
      "TUBO_ACERO",
      "TUBO_PLASTICO",
    ];

    if (!allowedScopes.includes(scope as ProscaiCatalogScope)) {
      throw new Error("scope debe ser ALL, TUBERIA, TUBO_ACERO o TUBO_PLASTICO.");
    }

    return scope as ProscaiCatalogScope;
  }

  private readEan(value: unknown): string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error("ean es obligatorio.");
    }

    return value.trim();
  }

  private readIndexScope(value: unknown): ProscaiCatalogScope {
    const scope = typeof value === "string" && value.trim()
      ? value.trim().toUpperCase()
      : "TUBO_ACERO";

    if (scope !== "TUBO_ACERO") {
      throw new Error("Por ahora el indexado por lotes solo permite scope TUBO_ACERO.");
    }

    return "TUBO_ACERO";
  }

  private readOptionalLimit(value: unknown): number | undefined {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error("maxProducts debe ser un entero positivo.");
    }

    return Math.min(Math.floor(parsed), 2_500);
  }

  private readSearchQuery(value: unknown): string | null {
    if (typeof value !== "string") return null;

    const query = value.trim().replace(/\s+/g, " ");
    return query || null;
  }

  private readSearchTopK(value: unknown): number {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 10;
    }

    return Math.min(Math.floor(parsed), 25);
  }

  private readCandidateTopK(value: unknown, limit: number): number {
    if (value === undefined || value === null || value === "") {
      return Math.min(Math.max(limit * 10, 100), 200);
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < limit) {
      throw new Error("candidateTopK debe ser mayor o igual a topK.");
    }

    return Math.min(Math.floor(parsed), 200);
  }

  private readSearchFilters(value: unknown): Record<string, string> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }

    const allowedFields = [
      "category",
      "subcategory",
      "material",
      "diameter",
      "ced",
      "costura",
      "termino",
      "acabado",
      "unit",
    ];
    const source = value as Record<string, unknown>;
    const filters: Record<string, string> = {};

    for (const field of allowedFields) {
      const normalizedValue = this.normalizeFilterValue(source[field]);
      if (normalizedValue) {
        filters[field] = normalizedValue;
      }
    }

    return filters;
  }

  private normalizeFilterValue(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;

    const normalized = value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();

    return normalized || undefined;
  }

  private readBranchCode(value: unknown): string | null {
    if (typeof value !== "string" || !value.trim()) return null;

    const branchCode = value.trim();
    if (!/^(01|02|03|04|05|06|07)$/.test(branchCode)) {
      throw new Error("branchCode debe estar entre 01 y 07.");
    }

    return branchCode;
  }

  private roundSimilarity(value: number): number {
    return Math.round(value * 10_000) / 10_000;
  }

  private toPercent(value: number): number {
    return Math.round(value * 10_000) / 100;
  }
}
