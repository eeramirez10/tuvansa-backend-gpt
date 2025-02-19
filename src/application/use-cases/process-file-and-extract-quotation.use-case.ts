import { ProcessFileUseCase } from "./process-file.use-case";
import { LanguageModelService } from '../../domain/services/language-model-service';


export class ProcessFileAndExtractQuotationUseCase {

  constructor(
    private readonly processFileUseCase: ProcessFileUseCase,
    private readonly languageModelService: LanguageModelService
  ) {


  }


  async execute(file: Express.Multer.File) {
    const texContent = await this.processFileUseCase.execute(file)
    const quotation = await this.languageModelService.extractQuotationData(texContent)

    return quotation
  }
}