import { GptDataSource } from '../../domain/datasource/gpt.datasource';
import { GenerateSummaryDto } from '../../domain/dtos/generate-summary.dto';
import { SummaryEntity } from '../../domain/entities/summary.entity';
import { GptRepository } from '../../domain/repositories/gpt.repository';

interface Options {
  prompt: string
  sqlResult: any
}


export class GenerateSummaryUseCase {

  constructor(private readonly gptRepository: GptRepository) {}

  async execute(generateSummaryDto: GenerateSummaryDto){
    return this.gptRepository.generateSummary(generateSummaryDto)
  }
    


 


}