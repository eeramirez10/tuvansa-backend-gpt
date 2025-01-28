import { GptDataSource } from "../../domain/datasource/gpt.datasource";
import { GenerateSummaryDto } from "../../domain/dtos/generate-summary.dto";
import { ProcessPromptForSqlDto } from "../../domain/dtos/process-prompt-for-sql.dto";
import { GptEntity } from "../../domain/entities/gpt.entity";
import { SummaryEntity } from "../../domain/entities/summary.entity";
import { GptRepository } from "../../domain/repositories/gpt.repository";

export class GptRepositoryImpl implements GptRepository {

  constructor(private readonly datasource:GptDataSource){}
  async generateSummary(generateSummaryDto: GenerateSummaryDto): Promise<SummaryEntity> {
    return await this.datasource.generateSummary(generateSummaryDto)
  }

  async processPromptForSQL(processPromptForSqlDto: ProcessPromptForSqlDto): Promise<GptEntity> {
    return  await this.datasource.processPromptForSQL(processPromptForSqlDto)
  }


}