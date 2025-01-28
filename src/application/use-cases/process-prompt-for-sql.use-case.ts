import { ProcessPromptForSqlDto } from "../../domain/dtos/process-prompt-for-sql.dto";
import { GptRepository } from "../../domain/repositories/gpt.repository";



export class ProcessPromptForSqlUseCase {


  constructor(private readonly gptRepository: GptRepository){}


  async execute(processPromptForSql: ProcessPromptForSqlDto) {
    return this.gptRepository.processPromptForSQL(processPromptForSql)
  }

}