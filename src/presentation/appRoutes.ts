import { Request, Response, Router } from "express";
import { GptRoutes } from "./gpt/routes";
import { VectorCatalogRoutes } from "./vector-catalog/routes";
import { CatalogVariantsRoutes } from "./catalog-variants/routes";

export class AppRoutes {

  static routes(): Router {

    const router = Router()

    router.use('/api/gpt', GptRoutes.routes())
    router.use('/api/vector-catalog', VectorCatalogRoutes.routes())
    router.use('/api/catalog-variants', CatalogVariantsRoutes.routes())

    return router
  }
}
