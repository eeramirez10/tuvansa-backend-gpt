import { Request, Response } from "express";

import { BuildProscaiCatalogVariantsUseCase } from "../../application/use-cases/build-proscai-catalog-variants.use-case";
import { CatalogVariantVectorDocumentMapper } from "../../application/mappers/catalog-variant-vector-document.mapper";
import { CatalogVariantSyncJobService } from "../../application/services/catalog-variant-sync-job.service";
import {
  CatalogVariantStatus,
  ProscaiBranchCode,
  ProscaiCatalogVariant,
} from "../../domain/entities/proscai-catalog-variant.entity";

const BRANCH_CODES: ProscaiBranchCode[] = ["01", "02", "03", "04", "05", "06", "07"];

export class CatalogVariantsController {
  constructor(
    private readonly buildCatalogVariantsUseCase: BuildProscaiCatalogVariantsUseCase,
    private readonly syncJobService: CatalogVariantSyncJobService,
    private readonly embeddingModel: string,
    private readonly namespace: string,
  ) {}

  public vectorPreview = async (req: Request, res: Response): Promise<Response> => {
    try {
      const ean = this.readOptionalText(req.query.ean)?.toUpperCase();
      const variantId = this.readOptionalText(req.query.variantId);
      if (!ean && !variantId) {
        return res.status(400).json({ error: "ean o variantId es obligatorio." });
      }

      const projection = await this.buildCatalogVariantsUseCase.execute(this.readBoolean(req.query.refresh));
      const variants = projection.variants.filter((variant) => (
        (ean && variant.ean === ean) || (variantId && variant.variantId === variantId)
      ));
      const documents = variants.map((variant) => (
        CatalogVariantVectorDocumentMapper.toDocument(variant, this.embeddingModel)
      ));

      return res.status(200).json({
        namespace: this.namespace,
        embeddingModel: this.embeddingModel,
        count: documents.length,
        items: documents,
      });
    } catch (error) {
      return this.handleError(res, error, "Error al previsualizar los documentos vectoriales.");
    }
  };

  public sync = async (req: Request, res: Response): Promise<Response> => {
    try {
      const maxVariants = this.readOptionalPositiveInt(req.body?.maxVariants, 500);
      const dryRun = this.readBodyBoolean(req.body?.dryRun, false);
      const deleteStale = this.readBodyBoolean(req.body?.deleteStale, true);
      const job = this.syncJobService.start({ maxVariants, dryRun, deleteStale });

      return res.status(202).json({
        message: dryRun
          ? "Analisis de sincronizacion iniciado sin modificar Pinecone."
          : "Sincronizacion de variantes iniciada.",
        job,
      });
    } catch (error) {
      return this.handleError(res, error, "Error al iniciar la sincronizacion de variantes.");
    }
  };

  public syncStatus = (_req: Request, res: Response): Response => {
    return res.status(200).json({
      namespace: this.namespace,
      job: this.syncJobService.getStatus(),
    });
  };

  public report = async (req: Request, res: Response): Promise<Response> => {
    try {
      const projection = await this.buildCatalogVariantsUseCase.execute(this.readBoolean(req.query.refresh));

      return res.status(200).json({
        generatedAt: projection.generatedAt,
        sourceUpdatedAt: projection.sourceUpdatedAt ?? null,
        cacheTtlMinutes: 5,
        identity: {
          sourceOfTruth: "PROSCAI",
          vectorIdCandidate: "variantId",
          stockLookupKey: "ean",
          criticalAttributes: [
            "product",
            "tipo",
            "subtipo",
            "material",
            "diameter",
            "ced",
            "termino",
            "costura",
            "acabado",
            "figura",
            "radio",
            "angulo",
            "grado",
            "presion",
            "unit",
          ],
        },
        summary: projection.summary,
      });
    } catch (error) {
      return this.handleError(res, error, "Error al construir el reporte de variantes.");
    }
  };

  public list = async (req: Request, res: Response): Promise<Response> => {
    try {
      const projection = await this.buildCatalogVariantsUseCase.execute(this.readBoolean(req.query.refresh));
      const ean = this.readOptionalText(req.query.ean)?.toUpperCase();
      const status = this.readStatus(req.query.status);
      const branchCode = this.readBranchCode(req.query.branchCode);
      const reviewReason = this.readOptionalText(req.query.reviewReason)?.toUpperCase();
      const warning = this.readOptionalText(req.query.warning)?.toUpperCase();
      const includeSourceRecords = this.readBoolean(req.query.includeSourceRecords, true);
      const limit = this.readPositiveInt(req.query.limit, 20, 100);
      const offset = this.readNonNegativeInt(req.query.offset, 0, 100000);

      const filtered = projection.variants.filter((variant) => {
        if (ean && variant.ean !== ean) return false;
        if (status && variant.status !== status) return false;
        if (branchCode && !variant.sourceBranches.some((branch) => branch.code === branchCode)) return false;
        if (reviewReason && !variant.reviewReasons.includes(reviewReason)) return false;
        if (warning && !variant.warnings.includes(warning)) return false;
        return true;
      });
      const items = filtered
        .slice(offset, offset + limit)
        .map((variant) => this.toResponse(variant, includeSourceRecords));

      return res.status(200).json({
        generatedAt: projection.generatedAt,
        filters: {
          ean: ean ?? null,
          status: status ?? null,
          branchCode: branchCode ?? null,
          reviewReason: reviewReason ?? null,
          warning: warning ?? null,
        },
        pagination: {
          limit,
          offset,
          total: filtered.length,
          hasMore: offset + items.length < filtered.length,
        },
        items,
      });
    } catch (error) {
      return this.handleError(res, error, "Error al listar las variantes canónicas.");
    }
  };

  public findById = async (req: Request, res: Response): Promise<Response> => {
    try {
      const projection = await this.buildCatalogVariantsUseCase.execute(this.readBoolean(req.query.refresh));
      const variant = projection.variants.find((item) => item.variantId === req.params.variantId);

      if (!variant) {
        return res.status(404).json({ error: "Variante no encontrada." });
      }

      return res.status(200).json(this.toResponse(variant, true));
    } catch (error) {
      return this.handleError(res, error, "Error al consultar la variante canónica.");
    }
  };

  public quarantine = async (req: Request, res: Response): Promise<Response> => {
    try {
      const projection = await this.buildCatalogVariantsUseCase.execute(this.readBoolean(req.query.refresh));
      const branchCode = this.readBranchCode(req.query.branchCode);
      const limit = this.readPositiveInt(req.query.limit, 20, 100);
      const offset = this.readNonNegativeInt(req.query.offset, 0, 100000);
      const filtered = projection.quarantinedRecords.filter((record) => (
        !branchCode || record.branchCode === branchCode
      ));
      const items = filtered.slice(offset, offset + limit);

      return res.status(200).json({
        reason: "MISSING_EAN",
        branchCode: branchCode ?? null,
        pagination: {
          limit,
          offset,
          total: filtered.length,
          hasMore: offset + items.length < filtered.length,
        },
        items,
      });
    } catch (error) {
      return this.handleError(res, error, "Error al consultar la cuarentena de productos.");
    }
  };

  private toResponse(variant: ProscaiCatalogVariant, includeSourceRecords: boolean) {
    if (includeSourceRecords) return variant;

    const { sourceRecords: _sourceRecords, ...summary } = variant;
    return summary;
  }

  private readStatus(value: unknown): CatalogVariantStatus | undefined {
    const status = this.readOptionalText(value)?.toUpperCase();
    if (!status) return undefined;
    if (status !== "READY" && status !== "REVIEW") {
      throw new Error("status debe ser READY o REVIEW.");
    }
    return status;
  }

  private readBranchCode(value: unknown): ProscaiBranchCode | undefined {
    const branchCode = this.readOptionalText(value) as ProscaiBranchCode | undefined;
    if (!branchCode) return undefined;
    if (!BRANCH_CODES.includes(branchCode)) {
      throw new Error("branchCode debe estar entre 01 y 07.");
    }
    return branchCode;
  }

  private readBoolean(value: unknown, fallback = false): boolean {
    if (typeof value !== "string") return fallback;
    return ["true", "1", "yes", "si"].includes(value.trim().toLowerCase());
  }

  private readOptionalText(value: unknown): string | undefined {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }

  private readPositiveInt(value: unknown, fallback: number, max: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.min(Math.floor(parsed), max);
  }

  private readNonNegativeInt(value: unknown, fallback: number, max: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return fallback;
    return Math.min(Math.floor(parsed), max);
  }

  private readOptionalPositiveInt(value: unknown, max: number): number | undefined {
    if (value === undefined || value === null || value === "") return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error("maxVariants debe ser un entero positivo.");
    }
    return Math.min(Math.floor(parsed), max);
  }

  private readBodyBoolean(value: unknown, fallback: boolean): boolean {
    return typeof value === "boolean" ? value : fallback;
  }

  private handleError(res: Response, error: unknown, fallback: string): Response {
    const message = error instanceof Error ? error.message : fallback;
    const isValidationError = message.includes("debe ser")
      || message.includes("debe estar")
      || message.includes("obligatorio");
    return res.status(isValidationError ? 400 : 500).json({ error: message });
  }
}
