import { Router } from "express";

import { BuildProscaiCatalogVariantsUseCase } from "../../application/use-cases/build-proscai-catalog-variants.use-case";
import { ProscaiCatalogVariantDatasourceImpl } from "../../infraestructure/datasource/proscai-catalog-variant.datasource.impl";
import { ProscaiProductAnalysisService } from "../../infraestructure/services/proscai-product-analysis.service";
import { CatalogVariantsController } from "./controller";
import { envs } from "../../config/envs";
import { VoyageCatalogEmbeddingService } from "../../infraestructure/services/voyage-catalog-embedding.service";
import { PineconeCatalogV2Service } from "../../infraestructure/services/pinecone-catalog-v2.service";
import { SyncProscaiCatalogVariantsUseCase } from "../../application/use-cases/sync-proscai-catalog-variants.use-case";
import { CatalogVariantSyncJobService } from "../../application/services/catalog-variant-sync-job.service";

export class CatalogVariantsRoutes {
  public static routes(): Router {
    const router = Router();
    const datasource = new ProscaiCatalogVariantDatasourceImpl();
    const productAnalysisService = new ProscaiProductAnalysisService();
    const buildCatalogVariantsUseCase = new BuildProscaiCatalogVariantsUseCase(
      datasource,
      productAnalysisService,
    );
    const embeddingService = new VoyageCatalogEmbeddingService();
    const pineconeService = new PineconeCatalogV2Service(
      envs.PINECONE_CATALOG_VARIANTS_NAMESPACE,
    );
    const syncUseCase = new SyncProscaiCatalogVariantsUseCase(
      buildCatalogVariantsUseCase,
      embeddingService,
      pineconeService,
      envs.VOYAGE_CATALOG_V2_MODEL,
    );
    const controller = new CatalogVariantsController(
      buildCatalogVariantsUseCase,
      new CatalogVariantSyncJobService(
        syncUseCase,
        envs.PINECONE_CATALOG_VARIANTS_NAMESPACE,
      ),
      envs.VOYAGE_CATALOG_V2_MODEL,
      envs.PINECONE_CATALOG_VARIANTS_NAMESPACE,
    );

    router.get("/report", controller.report);
    router.get("/quarantine", controller.quarantine);
    router.get("/vector-preview", controller.vectorPreview);
    router.post("/sync", controller.sync);
    router.get("/sync/status", controller.syncStatus);
    router.get("/variants/:variantId", controller.findById);
    router.get("/variants", controller.list);

    return router;
  }
}
