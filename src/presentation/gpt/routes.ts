import { Router } from "express";

import { ProscaiDatasourceImpl } from "../../infraestructure/datasource/proscai.datasource.impl";
import { GptController } from "./controller";
import { OpenAiServiceImpl } from "../../infraestructure/services/open-ai.service.impl";
import { QueryStoreRedis } from '../../infraestructure/services/query-strore-redis';




export class GptRoutes {



  static routes = (): Router => {
    const router = Router()

    const sqlDataSource = new ProscaiDatasourceImpl()
    const openAiService = new OpenAiServiceImpl()

    const { purchaseAnalisys, getStoredQuery} = new GptController(openAiService, sqlDataSource, new QueryStoreRedis())


    router.post('/purchase-analisys', purchaseAnalisys)
    router.get('/sql/query', getStoredQuery)


    return router
  }
}