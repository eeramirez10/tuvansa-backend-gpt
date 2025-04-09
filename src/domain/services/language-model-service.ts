import { GenerateSummaryDto } from "../dtos/generate-summary.dto";
import { ProcessPromptForSqlDto } from "../dtos/process-prompt-for-sql.dto";
import { GptEntity } from "../entities/gpt.entity";
import { QuotationEntity } from "../entities/quotation.entity";
import { SummaryEntity } from "../entities/summary.entity";


export abstract class LanguageModelService {

    abstract processPromptForSQL(process: ProcessPromptForSqlDto, dbSchema: string): Promise<GptEntity>
  
    abstract generateSummary(generateSummaryDto: GenerateSummaryDto): Promise<SummaryEntity>
  
    abstract extractQuotationData(textContent: string): Promise<QuotationEntity>

}