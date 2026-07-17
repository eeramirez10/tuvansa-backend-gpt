import { Router } from "express";
import { IndexProscaiCatalogUseCase } from "../../application/use-cases/index-proscai-catalog.use-case";
import { CatalogIndexJobService } from "../../application/services/catalog-index-job.service";
import { CatalogSearchEvaluationJobService } from "../../application/services/catalog-search-evaluation-job.service";
import { EvaluateProscaiCatalogSearchUseCase } from "../../application/use-cases/evaluate-proscai-catalog-search.use-case";
import { SearchProscaiCatalogUseCase } from "../../application/use-cases/search-proscai-catalog.use-case";
import { envs } from "../../config/envs";
import { ProscaiCatalogDatasource } from "../../infraestructure/datasource/proscai-catalog.datasource";
import { PineconeCatalogV2Service } from "../../infraestructure/services/pinecone-catalog-v2.service";
import { ProscaiProductAnalysisService } from "../../infraestructure/services/proscai-product-analysis.service";
import { VoyageCatalogEmbeddingService } from "../../infraestructure/services/voyage-catalog-embedding.service";
import { ErpProductAvailabilityHttpService } from "../../infraestructure/services/erp-product-availability-http.service";
import { VectorCatalogController } from "./controller";

export class VectorCatalogRoutes {
  public static routes(): Router {
    const router = Router();
    const datasource = new ProscaiCatalogDatasource();
    const productAnalysisService = new ProscaiProductAnalysisService();
    const embeddingService = new VoyageCatalogEmbeddingService();
    const pineconeService = new PineconeCatalogV2Service();
    const productAvailabilityService = new ErpProductAvailabilityHttpService(
      envs.ERP_PRODUCTS_BASE_URL,
      envs.ERP_PRODUCTS_TIMEOUT_MS,
      envs.ERP_PRODUCTS_API_KEY,
    );
    const catalogVariantsPineconeService = new PineconeCatalogV2Service(
      envs.PINECONE_CATALOG_VARIANTS_NAMESPACE,
    );
    const indexCatalogUseCase = new IndexProscaiCatalogUseCase(
      datasource,
      productAnalysisService,
      embeddingService,
      pineconeService,
      envs.VOYAGE_CATALOG_V2_MODEL,
    );
    const searchCatalogUseCase = new SearchProscaiCatalogUseCase(
      embeddingService,
      catalogVariantsPineconeService,
      productAvailabilityService,
    );
    const evaluationJobService = new CatalogSearchEvaluationJobService(
      new EvaluateProscaiCatalogSearchUseCase(searchCatalogUseCase),
    );
    const controller = new VectorCatalogController(
      datasource,
      productAnalysisService,
      embeddingService,
      pineconeService,
      envs.VOYAGE_CATALOG_V2_MODEL,
      new CatalogIndexJobService(indexCatalogUseCase),
      searchCatalogUseCase,
      evaluationJobService,
    );

    router.get("/preview", controller.preview);
    router.post("/index-test", controller.indexTest);
    router.post("/index", controller.index);
    router.get("/index/status", controller.indexStatus);
    router.get("/evaluation/cases", controller.evaluationCases);
    router.post("/evaluation/run", controller.startEvaluation);
    router.get("/evaluation/status", controller.evaluationStatus);
    router.post("/search", controller.search);
    router.post("/search/semantic", controller.searchSemantic);

    return router;
  }
}
