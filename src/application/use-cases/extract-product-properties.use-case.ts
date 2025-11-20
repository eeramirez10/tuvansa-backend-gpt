import { LanguageModelService } from '../../domain/services/language-model-service';
export class ExtractProductPropertiesUseCase {

  constructor(private readonly languageModelService: LanguageModelService) {

  }

  async execute(description: string) {

    const properties = await this.languageModelService.extractProductProperties(description)

    const propertiesObject: Record<string, string> = {}

    if(properties.material) propertiesObject.material = properties.material
    if(properties.diameter) propertiesObject.diameter = properties.diameter
    if(properties.ced) propertiesObject.ced = properties.ced
    if(properties.costura) propertiesObject.costura = properties.costura
    if(properties.termino) propertiesObject.termino = properties.termino
    if(properties.acabado) propertiesObject.acabado = properties.acabado
    if(properties.subtipo) propertiesObject.subtipo = properties.subtipo
    if(properties.figura) propertiesObject.figura = properties.figura
    if(properties.radio) propertiesObject.radio = properties.radio
    if(properties.angulo) propertiesObject.angulo = properties.angulo
    if(properties.tipo) propertiesObject.tipo = properties.tipo
    if(properties.grado) propertiesObject.grado = properties.grado
    if(properties.presion) propertiesObject.presion = properties.presion

    return propertiesObject ?? null

  }
}