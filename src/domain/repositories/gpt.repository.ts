import { GenerateSummaryDto } from "../dtos/generate-summary.dto";
import { ProcessPromptForSqlDto } from "../dtos/process-prompt-for-sql.dto";
import { GptEntity } from "../entities/gpt.entity";
import { SummaryEntity } from "../entities/summary.entity";

export abstract class GptRepository {
  abstract  processPromptForSQL (processPromptForSqlDto: ProcessPromptForSqlDto):Promise<GptEntity> 
  abstract generateSummary(generateSummaryDto: GenerateSummaryDto): Promise<SummaryEntity>
  
}