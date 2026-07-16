import { VoyageAIClient } from "voyageai";
import { envs } from "../../config/envs";

export class VoyageCatalogEmbeddingService {
  private readonly client = new VoyageAIClient({ apiKey: envs.VOYAGEAI_API_KEY });
  private nextRequestAt = 0;

  public async embedDocument(text: string): Promise<number[]> {
    return this.embed([text], "document").then(([embedding]) => embedding);
  }

  public async embedQuery(text: string): Promise<number[]> {
    return this.embed([text], "query").then(([embedding]) => embedding);
  }

  public async embedDocuments(texts: string[]): Promise<number[][]> {
    return this.embed(texts, "document");
  }

  private async embed(
    texts: string[],
    inputType: "document" | "query",
  ): Promise<number[][]> {
    const input = texts.map((text) => text.trim()).filter(Boolean);

    if (input.length === 0) {
      throw new Error("No hay texto valido para generar embeddings.");
    }

    await this.waitForRequestSlot();

    const response = await this.client.embed({
      input,
      model: envs.VOYAGE_CATALOG_V2_MODEL,
      inputType,
    });

    const embeddings = response.data.map((item) => item.embedding);

    if (embeddings.length !== input.length || embeddings.some((embedding) => !Array.isArray(embedding))) {
      throw new Error("Voyage no devolvio todos los embeddings solicitados.");
    }

    for (const embedding of embeddings) {
      if (embedding.length !== envs.VOYAGE_CATALOG_V2_DIMENSION) {
        throw new Error(
          `Dimension invalida de Voyage: ${embedding.length}. Se esperaban ${envs.VOYAGE_CATALOG_V2_DIMENSION}.`,
        );
      }
    }

    return embeddings;
  }

  private async waitForRequestSlot(): Promise<void> {
    const now = Date.now();
    const requestAt = Math.max(now, this.nextRequestAt);
    this.nextRequestAt = requestAt + envs.VOYAGE_CATALOG_V2_MIN_REQUEST_INTERVAL_MS;

    if (requestAt > now) {
      await new Promise((resolve) => setTimeout(resolve, requestAt - now));
    }
  }
}
