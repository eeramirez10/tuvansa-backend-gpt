import { LanguageModelService } from "../../domain/services/language-model-service";
import { PineconeService } from "../../infraestructure/services/pinecone-service";
import { VoyageAIService } from "../../infraestructure/services/voyage-ai.service.impl";
import { ExtractProductPropertiesUseCase } from "./extract-product-properties.use-case";
import { MatchProductUseCase } from "./match-product.use-case";


export class MatchAllProductsUseCase {



  constructor(
    private readonly languageModelService: LanguageModelService,
    private readonly voyage: VoyageAIService,
    private readonly pinecone: PineconeService
  ) { }

  async execute(description: string) {

    const productTipe =
      await this.languageModelService
        .detectarTipoProducto(description);

    let filters = await new ExtractProductPropertiesUseCase(this.languageModelService).execute(description)

    const mappingFilters: Record<string, string> = {}

    mappingFilters.product = productTipe
    if (filters.costura) mappingFilters.costura = filters.costura



    return new MatchProductUseCase(this.voyage, this.pinecone).execute(description, { ...mappingFilters })

  }


}