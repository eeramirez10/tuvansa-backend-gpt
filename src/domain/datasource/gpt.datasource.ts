import { GptEntity } from "../entities/gpt.entity";
import { ProcessPromptForSqlDto } from '../dtos/process-prompt-for-sql.dto';
import OpenAI from "openai";
import { GenerateSummaryDto } from '../dtos/generate-summary.dto';
import { SummaryEntity } from "../entities/summary.entity";

export abstract class GptDataSource {

  abstract processPromptForSQL(process: ProcessPromptForSqlDto): Promise<GptEntity>

  abstract generateSummary(generateSummaryDto: GenerateSummaryDto): Promise<SummaryEntity>

  abstract getClient(): OpenAI
}