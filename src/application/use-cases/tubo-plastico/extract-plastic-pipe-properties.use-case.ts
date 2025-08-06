import { LanguageModelService } from '../../../domain/services/language-model-service';
export class ExtractPlasticPipePorpertiesUseCase {


  constructor(private readonly languageModelService: LanguageModelService) { }

  async execute(description: string) {
    const properties = await this.languageModelService.extractTuboPlasticoProperties(description)

    const objProps: Record<string, string> = {
      tipo: 'PLASTICO'
    }

    if (properties.cedula) objProps.ced = properties.cedula
    if (properties.diametro) objProps.diameter = properties.diametro
    if (properties.material) objProps.material = properties.material

    return objProps

  }


}