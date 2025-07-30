import { type LanguageModelService } from '../../domain/services/language-model-service';
export class ExtractPipePropertiesUseCase {




  constructor(private readonly lmService: LanguageModelService) { }


  async execute(description: string):  Promise<Record<string, string> | null> {

    const properties = await this.lmService.extractPipeProperties(description)

    const objectProps: Record<string, string> = {}


    if (properties.cedula) objectProps.ced = properties.cedula
    if (properties.diametro) objectProps.diameter = properties.diametro
    if (properties.tipoCostura) objectProps.costura = properties.tipoCostura

    if (!properties.cedula && properties.diametro && properties.tipoCostura) return null

    return objectProps

  }
}