
import { GenerateSummaryDto } from '../../domain/dtos/generate-summary.dto';
import { LanguageModelService } from '../../domain/services/language-model-service';

interface Options {
  prompt: string
  sqlResult: any
}


export class GenerateSummaryUseCase {

  constructor(private readonly openAIService: LanguageModelService) {}

  async execute(generateSummaryDto: GenerateSummaryDto){
    return this.openAIService.generateSummary(generateSummaryDto)
  }
    


 


}