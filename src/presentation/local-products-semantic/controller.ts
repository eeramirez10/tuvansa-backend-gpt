import { Request, Response } from "express";
import { LocalProductSemanticUseCase } from "../../application/use-cases/local-product-semantic.use-case";

export class LocalProductsSemanticController {
  constructor(private readonly useCase: LocalProductSemanticUseCase) {}

  public search = async (req: Request, res: Response): Promise<Response> => {
    const description = this.readRequired(req.body?.description);
    const unit = this.readRequired(req.body?.unit);
    if (!description || !unit) return res.status(400).json({ error: "description y unit son obligatorios." });

    try {
      const topK = this.readTopK(req.body?.topK);
      const items = await this.useCase.search(description, unit, topK);
      return res.status(200).json({ description, unit, items });
    } catch (error) {
      return res.status(500).json({ error: this.message(error, "No se pudieron buscar productos locales similares.") });
    }
  };

  public upsert = async (req: Request, res: Response): Promise<Response> => {
    const productId = this.readRequired(req.params.productId);
    const description = this.readRequired(req.body?.description);
    const unit = this.readRequired(req.body?.unit);
    if (!productId || !description || !unit) {
      return res.status(400).json({ error: "productId, description y unit son obligatorios." });
    }

    try {
      await this.useCase.upsert({
        productId,
        description,
        unit,
        branchId: this.readRequired(req.body?.branchId),
      });
      return res.status(200).json({ indexed: true, productId });
    } catch (error) {
      return res.status(500).json({ error: this.message(error, "No se pudo indexar el producto local.") });
    }
  };

  public remove = async (req: Request, res: Response): Promise<Response> => {
    const productId = this.readRequired(req.params.productId);
    if (!productId) return res.status(400).json({ error: "productId es obligatorio." });

    try {
      await this.useCase.delete(productId);
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ error: this.message(error, "No se pudo retirar el producto local del indice.") });
    }
  };

  public sync = async (req: Request, res: Response): Promise<Response> => {
    const rawProducts = Array.isArray(req.body?.products) ? req.body.products : [];
    if (rawProducts.length === 0 || rawProducts.length > 200) {
      return res.status(400).json({ error: "products debe contener entre 1 y 200 elementos." });
    }

    const products = rawProducts.flatMap((raw: Record<string, unknown>) => {
      const productId = this.readRequired(raw?.productId);
      const description = this.readRequired(raw?.description);
      const unit = this.readRequired(raw?.unit);
      if (!productId || !description || !unit) return [];
      return [{ productId, description, unit, branchId: this.readRequired(raw?.branchId) }];
    });
    if (products.length !== rawProducts.length) {
      return res.status(400).json({ error: "Todos los productos requieren productId, description y unit." });
    }

    try {
      await this.useCase.upsertMany(products);
      return res.status(200).json({ indexed: products.length });
    } catch (error) {
      return res.status(500).json({ error: this.message(error, "No se pudieron sincronizar los productos locales.") });
    }
  };

  private readRequired(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  private readTopK(value: unknown): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 20 ? parsed : 8;
  }

  private message(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }
}
