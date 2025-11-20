import { LanguageModelService } from "../../domain/services/language-model-service";
import { PineconeService } from "../../infraestructure/services/pinecone-service";
import { VoyageAIService } from "../../infraestructure/services/voyage-ai.service.impl";
import { ExtractValvPropertiesUseCase } from "./extract-valv-properties.use-case";
import { MatchProductUseCase } from './match-product.use-case';

export class MatchValvProductsUseCase {



  constructor(
    private readonly languageModelService: LanguageModelService,
    private readonly voyage: VoyageAIService,
    private readonly pinecone: PineconeService
  ) { }

  async execute(description: string) {

    const filters = await new ExtractValvPropertiesUseCase(this.languageModelService).execute(description)

    return new MatchProductUseCase(this.voyage, this.pinecone).execute(description,filters)

  }

}