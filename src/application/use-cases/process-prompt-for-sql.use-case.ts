import { ProcessPromptForSqlDto } from "../../domain/dtos/process-prompt-for-sql.dto";
import { LanguageModelService } from "../../domain/services/language-model-service";




export class ProcessPromptForSqlUseCase {


  constructor(private readonly openAIService: LanguageModelService){}


  async execute(processPromptForSql: ProcessPromptForSqlDto) {
    return this.openAIService.processPromptForSQL(processPromptForSql)
  }

}