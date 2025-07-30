import { LanguageModelService } from "../../domain/services/language-model-service";
import { PineconeService } from "../../infraestructure/services/pinecone-service";
import { VoyageAIService } from "../../infraestructure/services/voyage-ai.service.impl";
import { ExtractPipePropertiesUseCase } from "./extract-pipe-properties.use-case";
import { MatchProductUseCase } from "./match-product.use-case";

export class MatchPipeProductsUseCase {

  constructor(
    private readonly languageModelService: LanguageModelService,
    private readonly voyage: VoyageAIService,
    private readonly pinecone: PineconeService
  ) { }

  async execute(description: string) {

    const pipeProps = await new ExtractPipePropertiesUseCase(this.languageModelService)
      .execute(description)


    const matchProduct = await new MatchProductUseCase(
      this.voyage,
      this.pinecone
    )
      .execute(description, pipeProps)

    return matchProduct

  }


}