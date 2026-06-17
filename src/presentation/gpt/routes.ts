import { Router } from "express";

import { ProscaiDatasourceImpl } from "../../infraestructure/datasource/proscai.datasource.impl";
import { GptController } from "./controller";
import { OpenAiServiceImpl } from "../../infraestructure/services/open-ai.service.impl";
// import { QueryStoreRedis } from '../../infraestructure/services/query-strore-redis';
import { ProscaiProductsRepositoryImpl } from '../../infraestructure/repositories/proscai-products.repository.impl';
import { ProscaiProductsDatasourceImpl } from "../../infraestructure/datasource/proscai-products.datasource.impl";
import { VoyageAIService } from "../../infraestructure/services/voyage-ai.service.impl";
import { PineconeService } from "../../infraestructure/services/pinecone-service";
import { upload } from "../../config/multer-config";
import { ProscaiProductAnalysisService } from "../../infraestructure/services/proscai-product-analysis.service";
import { PrismaProductCatalogService } from "../../infraestructure/services/prisma-product-catalog.service";





export class GptRoutes {



  static routes = (): Router => {
    const router = Router()

    const sqlDataSource = new ProscaiDatasourceImpl()
    const openAiService = new OpenAiServiceImpl()
    const datasource = new ProscaiProductsDatasourceImpl()
    const repo = new ProscaiProductsRepositoryImpl(datasource);
    const voyage = new VoyageAIService();
    const pinecone = new PineconeService();
    const productAnalysisService = new ProscaiProductAnalysisService();
    const prismaProductCatalogService = new PrismaProductCatalogService();

    const {
      upsertProducts,
      matchProduct,
      transformQuote,
      productsOverview,
      productsFamilyDistribution,
      productsPrefixPatterns,
      productsFirstWordAnalysis,
      productsFirstWordNormalizationReport,
      productsCategoryCandidates,
      productsCategoryConflicts,
      productsNormalizationPreview,
      productsNormalizedBatch,
      productsMissingEanBatch,
      productsMissingEanStored,
      syncNormalizedProductsBatch,
      syncAllNormalizedProducts,
      generateTechnicalSummariesBatch,
      productsImages,
      replaceProductsImages,
      productDetail,
      technicalSummaryStatus
    }
      = new GptController(
        openAiService,
        sqlDataSource,
        // new QueryStoreRedis(),
        repo,
        voyage,
        pinecone,
        productAnalysisService,
        prismaProductCatalogService
      )


    // router.post('/purchase-analisys', purchaseAnalisys)
    // router.get('/sql/query', getStoredQuery)
    router.get('/upsert-products', upsertProducts)
    router.post('/match-product', matchProduct)
    router.post('/extract-items-quote', upload.single('quote'), transformQuote)
    router.get('/analysis/products/overview', productsOverview)
    router.get('/analysis/products/family-distribution', productsFamilyDistribution)
    router.get('/analysis/products/prefix-patterns', productsPrefixPatterns)
    router.get('/analysis/products/first-word-analysis', productsFirstWordAnalysis)
    router.get('/analysis/products/first-word-normalization-report', productsFirstWordNormalizationReport)
    router.get('/analysis/products/category-candidates', productsCategoryCandidates)
    router.get('/analysis/products/category-conflicts', productsCategoryConflicts)
    router.get('/analysis/products/normalization-preview', productsNormalizationPreview)
    router.get('/analysis/products/normalized-batch', productsNormalizedBatch)
    router.get('/analysis/products/missing-ean-batch', productsMissingEanBatch)
    router.get('/analysis/products/missing-ean-stored', productsMissingEanStored)
    router.post('/analysis/products/sync-normalized-batch', syncNormalizedProductsBatch)
    router.post('/analysis/products/sync-normalized-all', syncAllNormalizedProducts)
    router.post('/analysis/products/generate-technical-summaries', generateTechnicalSummariesBatch)
    router.get('/analysis/products/:productId/images', productsImages)
    router.post('/analysis/products/:productId/images', replaceProductsImages)
    router.get('/analysis/products/:productId/detail', productDetail)

    router.get('/analysis/products/technical-summary-status', technicalSummaryStatus);

    return router
  }
}
