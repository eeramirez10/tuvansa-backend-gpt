import { LanguageModelService } from '../../../domain/services/language-model-service';
import { MatchProductUseCase } from '../match-product.use-case';
import { ExtractPlasticPipePorpertiesUseCase } from './extract-plastic-pipe-properties.use-case';
import { VoyageAIService } from '../../../infraestructure/services/voyage-ai.service.impl';
import { PineconeService } from '../../../infraestructure/services/pinecone-service';
export class MatchPlasticPipeProductsUseCase {

  constructor(
    private readonly languageModelService: LanguageModelService,
    private readonly vs: VoyageAIService,
    private readonly  ps:PineconeService
  ) { }


  async execute(description:string){

    const filters = await new ExtractPlasticPipePorpertiesUseCase(this.languageModelService).execute(description)

    const products = await new MatchProductUseCase(this.vs, this.ps).execute(description, filters)

    return products
  }


}