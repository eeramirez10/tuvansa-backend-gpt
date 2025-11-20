import { LanguageModelService } from '../../domain/services/language-model-service';

export class ExtractValvPropertiesUseCase {

  constructor(private readonly languageModelService: LanguageModelService) { }

  async execute(description: string) {

    const properties = await this.languageModelService.extractValvulaProperties(description)

    const propertiesObject: Record<string, string> = {}

    if (properties.diametro) propertiesObject.diameter = properties.diametro
    if (properties.figura) propertiesObject.figura = properties.figura
    if (properties.producto) propertiesObject.product = properties.producto
    if (properties.subtipo) propertiesObject.subtipo = properties.subtipo

    return propertiesObject ?? null

  }
}