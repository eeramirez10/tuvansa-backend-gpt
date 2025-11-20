import { PineconeService } from "../../infraestructure/services/pinecone-service";
import { VoyageAIService } from "../../infraestructure/services/voyage-ai.service.impl";


export class UpsertProductsUseCase {

  constructor(
    private readonly voyage: VoyageAIService,
    private readonly pinecone: PineconeService
  ) { }

  async execute(products: Record<string, string>[], namespace?: string) {



    const texts = products.map((product) => product.description);
    const data = await this.voyage.embed(texts);



    const vectors = products.map((p, i) => ({
      id: p.id,
      values: data[i].embedding,
      metadata: { ean: p.ean, description: p.description, ...p }
    }))

    await this.pinecone.upsert([...vectors])

  }
}