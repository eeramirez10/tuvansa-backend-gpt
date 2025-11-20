import { LanguageModelService } from "../../domain/services/language-model-service";
import { PineconeService } from "../../infraestructure/services/pinecone-service";
import { VoyageAIService } from "../../infraestructure/services/voyage-ai.service.impl";
import { ExtractCodoPropertiesUseCase } from "./extract-codo-properties.use-case";
import { MatchProductUseCase } from './match-product.use-case';

export class MatchCodoProductsUseCase {

  constructor(
    private readonly languageModelService: LanguageModelService,
    private readonly voyage: VoyageAIService,
    private readonly pinecone: PineconeService
  ) { }

  async execute(description: string) {


    const properties = await new ExtractCodoPropertiesUseCase(this.languageModelService)
      .execute(description)

    return await new MatchProductUseCase(this.voyage, this.pinecone).execute(description, properties)

  }

}