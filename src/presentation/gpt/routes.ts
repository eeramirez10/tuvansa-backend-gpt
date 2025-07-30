import { Router } from "express";

import { ProscaiDatasourceImpl } from "../../infraestructure/datasource/proscai.datasource.impl";
import { GptController } from "./controller";
import { OpenAiServiceImpl } from "../../infraestructure/services/open-ai.service.impl";
import { QueryStoreRedis } from '../../infraestructure/services/query-strore-redis';
import { ProscaiProductsRepositoryImpl } from '../../infraestructure/repositories/proscai-products.repository.impl';
import { ProscaiProductsDatasourceImpl } from "../../infraestructure/datasource/proscai-products.datasource.impl";
import { VoyageAIService } from "../../infraestructure/services/voyage-ai.service.impl";
import { PineconeService } from "../../infraestructure/services/pinecone-service";
import { upload } from "../../config/multer-config";





export class GptRoutes {



  static routes = (): Router => {
    const router = Router()

    const sqlDataSource = new ProscaiDatasourceImpl()
    const openAiService = new OpenAiServiceImpl()
    const datasource = new ProscaiProductsDatasourceImpl()
    const repo = new ProscaiProductsRepositoryImpl(datasource);
    const voyage = new VoyageAIService();
    const pinecone = new PineconeService();

    const { purchaseAnalisys, getStoredQuery, upsertProducts, matchProduct, transformQuote }
      = new GptController(
        openAiService,
        sqlDataSource,
        new QueryStoreRedis(),
        repo,
        voyage,
        pinecone
      )


    router.post('/purchase-analisys', purchaseAnalisys)
    router.get('/sql/query', getStoredQuery)
    router.get('/upsert-products', upsertProducts)
    router.post('/match-product', matchProduct)
    router.post('/extract-items-quote',upload.single('quote'),transformQuote )

    return router
  }
}