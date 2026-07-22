import { NextFunction, Request, Response, Router } from "express";
import { LocalProductSemanticUseCase } from "../../application/use-cases/local-product-semantic.use-case";
import { envs } from "../../config/envs";
import { PineconeCatalogV2Service } from "../../infraestructure/services/pinecone-catalog-v2.service";
import { VoyageCatalogEmbeddingService } from "../../infraestructure/services/voyage-catalog-embedding.service";
import { LocalProductsSemanticController } from "./controller";

export class LocalProductsSemanticRoutes {
  public static routes(): Router {
    const router = Router();
    const useCase = new LocalProductSemanticUseCase(
      new VoyageCatalogEmbeddingService(),
      new PineconeCatalogV2Service(envs.PINECONE_LOCAL_PRODUCTS_NAMESPACE),
    );
    const controller = new LocalProductsSemanticController(useCase);

    router.use(this.requireInternalApiKey);
    router.post("/search", controller.search);
    router.post("/sync", controller.sync);
    router.put("/:productId", controller.upsert);
    router.delete("/:productId", controller.remove);
    return router;
  }

  private static requireInternalApiKey(req: Request, res: Response, next: NextFunction): void {
    const expected = envs.LOCAL_PRODUCTS_INTERNAL_API_KEY?.trim();
    if (!expected) return next();
    if (req.header("x-internal-api-key") !== expected) {
      res.status(401).json({ error: "Invalid internal API key." });
      return;
    }
    next();
  }
}
