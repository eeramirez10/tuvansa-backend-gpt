import { PineconeService } from "../../infraestructure/services/pinecone-service";
import { VoyageAIService } from "../../infraestructure/services/voyage-ai.service.impl";

export class MatchProductUseCase {

  constructor(
    private readonly voyage: VoyageAIService,
    private readonly pinecone: PineconeService
  ) { }


  async execute(description: string, filter?: Record<string, string>, namespace?: string) {

 
    const [data] = await this.voyage.embed([description])
    const { embedding } = data
    const matches = await this.pinecone.query(embedding, 5, filter)

    return matches
  }
}