import { LanguageModelService } from "../../domain/services/language-model-service";

export class ExtractBridaPropertiesUseCase {

  constructor(private readonly languageModel: LanguageModelService) { }

  async execute(description: string) {

    const properties = await this.languageModel.extractBridaProperties(description)

    const objProps: Record<string, string> = {}


    if (properties.producto) objProps.product = properties.producto;
    if (properties.diametro) objProps.diameter = properties.diametro;
    if (properties.cedula) objProps.ced = properties.cedula;


    return objProps;


  }



}