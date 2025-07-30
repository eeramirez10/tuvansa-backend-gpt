import { LanguageModelService } from '../../domain/services/language-model-service';

export class ExtractCodoPropertiesUseCase {

  constructor(private readonly languageModelService: LanguageModelService) {

  }


  async execute(description: string) {

    const {
      producto,
      diametro,
      cedula,
      angulo,
      radio,
      material,
      galvanizado,
      roscado,
      liso,
      negro,
      figura,
      presion,
      sw,
      biselado,
      plano,
      ranurado,
      bridado,
      no_asignado,
      descripcion_limpia,
    } = await this.languageModelService.extractCodoProperties(description)

    const objectProps: Record<string, string> = {}


    if (diametro) objectProps.diameter = diametro;
    if (cedula) objectProps.ced = cedula
    if (angulo) objectProps.angulo = angulo
    if (radio) objectProps.radio = radio


    return objectProps ?? null




  }
}