import { Request, Response, Router } from "express";
import { GptRoutes } from "./gpt/routes";
import { VectorCatalogRoutes } from "./vector-catalog/routes";
import { CatalogVariantsRoutes } from "./catalog-variants/routes";
import { LocalProductsSemanticRoutes } from "./local-products-semantic/routes";

export class AppRoutes {

  static routes(): Router {

    const router = Router()

    router.use('/api/gpt', GptRoutes.routes())
    router.use('/api/vector-catalog', VectorCatalogRoutes.routes())
    router.use('/api/catalog-variants', CatalogVariantsRoutes.routes())
    router.use('/api/local-products-semantic', LocalProductsSemanticRoutes.routes())

    return router
  }
}
